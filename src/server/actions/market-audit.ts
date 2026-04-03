'use server';

import Anthropic from '@anthropic-ai/sdk';
import { auditPage } from '@/server/services/seo-auditor';
import { captureEmailLead } from '@/server/actions/email-capture';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export interface MarketAuditResult {
  url: string;
  overallScore: number;
  grade: string;
  summary: string;
  dimensions: {
    content: { score: number; max: number; findings: string };
    conversion: { score: number; max: number; findings: string };
    seo: { score: number; max: number; findings: string };
    competitive: { score: number; max: number; findings: string };
    compliance: { score: number; max: number; findings: string };
  };
  revenueLeaks: Array<{ title: string; why: string; fix: string; impactMonthly: string; effort: string }>;
  quickWins: string[];
  copyRewrites: Array<{ before: string; after: string; why: string }>;
  complianceFlags: Array<{ severity: 'HIGH' | 'MEDIUM' | 'LOW'; issue: string; fix: string }>;
  abTests: Array<{ hypothesis: string; metric: string }>;
  technicalData?: {
    performance: number;
    seo: number;
    fcp: string;
    lcp: string;
  };
}

const FORBIDDEN_TERMS = [
  'cure', 'treat', 'treatment', 'prescribe', 'prescription',
  'guaranteed', 'proven to', 'medical benefit', 'clinically proven',
  'FDA approved', 'diagnose', 'therapy', 'medication',
];

function gradeFromScore(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export async function runMarketAudit(url: string): Promise<MarketAuditResult | { error: string }> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

  // Fetch page content and PSI data in parallel
  const [pageContent, psiResult] = await Promise.all([
    fetchPageContent(normalizedUrl),
    auditPage(normalizedUrl, 'mobile'),
  ]);

  const technicalData = 'error' in psiResult ? undefined : {
    performance: Math.round(psiResult.scores.performance * 100),
    seo: Math.round(psiResult.scores.seo * 100),
    fcp: psiResult.metrics.fcp,
    lcp: psiResult.metrics.lcp,
  };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `You are a senior cannabis marketing strategist auditing dispensary and cannabis brand websites.
You score sites across 5 dimensions and always frame recommendations in terms of revenue impact and effort.
Be specific — quote actual copy from the page, name exact issues, give concrete fixes.
You understand cannabis compliance: forbidden medical claims, age gate requirements, consent capture, and state-specific rules.
Always identify compliance risks even when other scores are high.
Return valid JSON only — no markdown, no explanation outside the JSON.`;

  const userPrompt = `Audit this cannabis website and return a structured JSON report.

URL: ${normalizedUrl}

PAGE CONTENT:
${pageContent.slice(0, 8000)}

${technicalData ? `TECHNICAL DATA (Google PageSpeed):
- Performance: ${technicalData.performance}/100
- SEO: ${technicalData.seo}/100
- First Contentful Paint: ${technicalData.fcp}
- Largest Contentful Paint: ${technicalData.lcp}` : ''}

FORBIDDEN TERMS to check for: ${FORBIDDEN_TERMS.join(', ')}

Return this exact JSON structure (no markdown, just JSON):
{
  "overallScore": <0-100>,
  "summary": "<one sentence executive summary>",
  "dimensions": {
    "content": {
      "score": <0-25>,
      "findings": "<2-3 sentences: what's good, what's weak, specific copy quote>"
    },
    "conversion": {
      "score": <0-20>,
      "findings": "<2-3 sentences: age gate type, friction points, trust signals found>"
    },
    "seo": {
      "score": <0-20>,
      "findings": "<2-3 sentences: menu type assessment, schema presence, indexability>"
    },
    "competitive": {
      "score": <0-15>,
      "findings": "<2-3 sentences: differentiation, pricing visibility, brand positioning>"
    },
    "compliance": {
      "score": <0-20>,
      "findings": "<2-3 sentences: consent capture, forbidden terms found, age gate compliance>"
    }
  },
  "revenueLeaks": [
    {
      "title": "<issue name>",
      "why": "<why it costs money>",
      "fix": "<concrete action>",
      "impactMonthly": "<e.g. +$2,000-5,000/mo>",
      "effort": "<Low|Medium|High>"
    }
  ],
  "quickWins": [
    "<specific action → expected outcome>",
    "<specific action → expected outcome>",
    "<specific action → expected outcome>"
  ],
  "copyRewrites": [
    {
      "before": "<exact quote from page or representative weak copy>",
      "after": "<optimized version>",
      "why": "<reason>"
    }
  ],
  "complianceFlags": [
    {
      "severity": "HIGH|MEDIUM|LOW",
      "issue": "<what was found>",
      "fix": "<required action>"
    }
  ],
  "abTests": [
    {
      "hypothesis": "If [change X] then [metric Y improves by Z%]",
      "metric": "<what to measure, duration>"
    }
  ]
}

Score conservatively. Most sites score 40-65. A score above 80 requires strong evidence across all dimensions.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    if (!raw) return { error: 'Empty response from AI' };
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      logger.error(`[MarketAudit] JSON parse failed for ${normalizedUrl}: ${raw.slice(0, 200)}`);
      return { error: 'Could not parse AI response' };
    }

    return {
      url: normalizedUrl,
      overallScore: parsed.overallScore,
      grade: gradeFromScore(parsed.overallScore),
      summary: parsed.summary,
      dimensions: {
        content: { ...parsed.dimensions.content, max: 25 },
        conversion: { ...parsed.dimensions.conversion, max: 20 },
        seo: { ...parsed.dimensions.seo, max: 20 },
        competitive: { ...parsed.dimensions.competitive, max: 15 },
        compliance: { ...parsed.dimensions.compliance, max: 20 },
      },
      revenueLeaks: parsed.revenueLeaks ?? [],
      quickWins: parsed.quickWins ?? [],
      copyRewrites: parsed.copyRewrites ?? [],
      complianceFlags: parsed.complianceFlags ?? [],
      abTests: parsed.abTests ?? [],
      technicalData,
    };
  } catch (e) {
    logger.error(`[MarketAudit] Failed for ${normalizedUrl}: ${(e as Error).message}`);
    return { error: (e as Error).message };
  }
}

// ── Lead capture ─────────────────────────────────────────────────────────────

export interface SubmitMarketAuditLeadRequest {
  url: string;
  email: string;
  firstName?: string;
  marketingConsent: boolean;
  auditResult: MarketAuditResult;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
}

export interface SubmitMarketAuditLeadResponse {
  success: boolean;
  leadId?: string;
  auditReportId?: string;
  error?: string;
}

export async function submitMarketAuditLead(
  req: SubmitMarketAuditLeadRequest,
): Promise<SubmitMarketAuditLeadResponse> {
  try {
    // 1. Capture / upsert email lead
    const source = req.utmSource === 'email' ? 'market_audit_email' : 'market_audit';
    const leadResult = await captureEmailLead({
      email: req.email,
      firstName: req.firstName,
      emailConsent: true,
      smsConsent: false,
      source,
    });

    if (!leadResult.success || !leadResult.leadId) {
      return { success: false, error: leadResult.error ?? 'Failed to capture lead' };
    }

    // 2 + 3. Save report and tag lead in parallel
    const db = getAdminFirestore();
    const now = Date.now();
    const newTags = [
      'market-audit',
      `score-band:${req.auditResult.grade}`,
      req.utmSource ? `utm-source:${req.utmSource}` : null,
      req.utmCampaign ? `utm-campaign:${req.utmCampaign}` : null,
      req.marketingConsent ? 'marketing-opt-in' : null,
    ].filter(Boolean) as string[];

    const reportData = {
      leadId: leadResult.leadId,
      email: req.email,
      firstName: req.firstName ?? null,
      url: req.url,
      overallScore: req.auditResult.overallScore,
      grade: req.auditResult.grade,
      summary: req.auditResult.summary,
      dimensions: req.auditResult.dimensions,
      revenueLeaks: req.auditResult.revenueLeaks,
      complianceFlags: req.auditResult.complianceFlags,
      marketingConsent: req.marketingConsent,
      utm: {
        source: req.utmSource ?? null,
        medium: req.utmMedium ?? null,
        campaign: req.utmCampaign ?? null,
        content: req.utmContent ?? null,
      },
      createdAt: now,
    };

    // Read existing tags to merge (preserves tags set by other flows)
    const leadDoc = await db.collection('email_leads').doc(leadResult.leadId).get();
    const existingTags = (leadDoc.data()?.tags as string[]) ?? [];
    const mergedTags = [...new Set([...existingTags, ...newTags])];

    const [reportRef] = await Promise.all([
      db.collection('market_audit_reports').add(reportData),
      db.collection('email_leads').doc(leadResult.leadId).update({
        tags: mergedTags,
        marketAuditScore: req.auditResult.overallScore,
        marketAuditGrade: req.auditResult.grade,
        marketAuditUrl: req.url,
        lastUpdated: now,
      }),
    ]);

    logger.info('[MarketAudit] Lead submitted', {
      leadId: leadResult.leadId,
      auditReportId: reportRef.id,
      score: req.auditResult.overallScore,
      utmSource: req.utmSource,
    });

    return { success: true, leadId: leadResult.leadId, auditReportId: reportRef.id };
  } catch (e) {
    logger.error(`[MarketAudit] Lead submit failed: ${(e as Error).message}`);
    return { success: false, error: (e as Error).message };
  }
}

// ── Page fetch ────────────────────────────────────────────────────────────────

async function fetchPageContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BakedBot/1.0; +https://bakedbot.ai)' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    // Slice raw HTML first, then strip — avoids running regex over content we'd discard
    return html
      .slice(0, 80000) // raw HTML limit before stripping
      .replace(/<(?:script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 8000); // final text limit sent to AI
  } catch (e) {
    logger.warn(`[MarketAudit] Could not fetch ${url}: ${(e as Error).message}`);
    return `[Could not fetch page content: ${(e as Error).message}]`;
  }
}
