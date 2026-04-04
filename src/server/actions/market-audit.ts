'use server';

import Anthropic from '@anthropic-ai/sdk';
import { auditPage } from '@/server/services/seo-auditor';
import { captureEmailLead } from '@/server/actions/email-capture';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { sendGenericEmail } from '@/lib/email/dispatcher';

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
    let parsed: Partial<MarketAuditResult>;
    try {
      parsed = JSON.parse(raw) as Partial<MarketAuditResult>;
    } catch {
      logger.error(`[MarketAudit] JSON parse failed for ${normalizedUrl}: ${raw.slice(0, 200)}`);
      return { error: 'Could not parse AI response' };
    }

    const overallScore = typeof parsed.overallScore === 'number' ? parsed.overallScore : 0;
    const summary = typeof parsed.summary === 'string' ? parsed.summary : 'Audit summary unavailable.';
    const dimensions = parsed.dimensions;

    return {
      url: normalizedUrl,
      overallScore,
      grade: gradeFromScore(overallScore),
      summary,
      dimensions: {
        content: {
          score: dimensions?.content?.score ?? 0,
          findings: dimensions?.content?.findings ?? '',
          max: 25,
        },
        conversion: {
          score: dimensions?.conversion?.score ?? 0,
          findings: dimensions?.conversion?.findings ?? '',
          max: 20,
        },
        seo: {
          score: dimensions?.seo?.score ?? 0,
          findings: dimensions?.seo?.findings ?? '',
          max: 20,
        },
        competitive: {
          score: dimensions?.competitive?.score ?? 0,
          findings: dimensions?.competitive?.findings ?? '',
          max: 15,
        },
        compliance: {
          score: dimensions?.compliance?.score ?? 0,
          findings: dimensions?.compliance?.findings ?? '',
          max: 20,
        },
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

    // Fire-and-forget — deliver the full report to their inbox
    sendAuditResultEmail(req.email, req.firstName, req.auditResult).catch((e: unknown) => {
      logger.warn('[MarketAudit] Failed to send audit result email', { email: req.email, error: (e as Error).message });
    });

    return { success: true, leadId: leadResult.leadId, auditReportId: reportRef.id };
  } catch (e) {
    logger.error(`[MarketAudit] Lead submit failed: ${(e as Error).message}`);
    return { success: false, error: (e as Error).message };
  }
}

// ── Audit result email ────────────────────────────────────────────────────────

const HTML_ESCAPE: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(s: string): string { return s.replace(/[&<>"']/g, c => HTML_ESCAPE[c]); }

async function sendAuditResultEmail(
  to: string,
  firstName: string | undefined,
  audit: MarketAuditResult,
): Promise<void> {
  const name = firstName ?? 'there';
  const gradeColor: Record<string, string> = {
    A: '#16a34a', B: '#059669', C: '#d97706', D: '#ea580c', F: '#dc2626',
  };
  const color = gradeColor[audit.grade] ?? '#6b7280';

  const leaksHtml = audit.revenueLeaks.slice(0, 3).map(leak => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
        <strong style="font-size:13px;">${esc(leak.title)}</strong>
        <span style="background:#f3f4f6;border-radius:4px;padding:1px 6px;font-size:11px;margin-left:6px;">${esc(leak.effort)}</span><br>
        <span style="color:#6b7280;font-size:12px;">${esc(leak.why)}</span><br>
        <span style="color:#16a34a;font-size:12px;font-weight:600;">${esc(leak.impactMonthly)}</span>
      </td>
    </tr>`).join('');

  const flagsHtml = audit.complianceFlags.slice(0, 3).map(flag => {
    const badgeColor = flag.severity === 'HIGH' ? '#dc2626' : flag.severity === 'MEDIUM' ? '#d97706' : '#2563eb';
    return `<li style="margin-bottom:6px;font-size:12px;">
      <span style="background:${badgeColor};color:#fff;border-radius:3px;padding:1px 5px;font-size:10px;margin-right:4px;">${esc(flag.severity)}</span>
      ${esc(flag.issue)}
    </li>`;
  }).join('');

  const dimRows = Object.entries(audit.dimensions).map(([, dim]) => {
    const pct = Math.round((dim.score / dim.max) * 100);
    const barColor = pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626';
    return `<tr>
      <td style="font-size:12px;color:#374151;padding:4px 0;width:160px;">${esc(dim.findings.split('.')[0])}.</td>
      <td style="padding:4px 0 4px 12px;">
        <div style="background:#f3f4f6;border-radius:4px;height:8px;width:100%;">
          <div style="background:${barColor};border-radius:4px;height:8px;width:${pct}%;"></div>
        </div>
      </td>
      <td style="font-size:12px;font-weight:600;padding:4px 0 4px 8px;white-space:nowrap;">${dim.score}/${dim.max}</td>
    </tr>`;
  }).join('');

  const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr><td style="background:#0f172a;padding:24px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;">BakedBot AI</span>
          <span style="color:#94a3b8;font-size:13px;margin-left:8px;">Marketing Audit</span>
        </td></tr>

        <!-- Grade hero -->
        <tr><td style="padding:32px;border-bottom:1px solid #f3f4f6;text-align:center;">
          <div style="font-size:64px;font-weight:800;color:${color};line-height:1;">${esc(audit.grade)}</div>
          <div style="font-size:24px;font-weight:600;color:#374151;">${audit.overallScore}/100</div>
          <div style="color:#6b7280;font-size:13px;margin-top:4px;">${esc(audit.url)}</div>
          <p style="color:#374151;font-size:14px;margin:16px 0 0;max-width:480px;margin-left:auto;margin-right:auto;">${esc(audit.summary)}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 4px;color:#374151;font-size:14px;">Hey ${esc(name)},</p>
          <p style="margin:0 0 24px;color:#6b7280;font-size:13px;">Here's the full breakdown of your marketing audit. We scored your site across 5 dimensions — here's what we found.</p>

          <!-- Dimension scores -->
          <h2 style="font-size:14px;font-weight:600;color:#111827;margin:0 0 12px;">Dimension Scores</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">${dimRows}</table>

          <!-- Revenue leaks -->
          ${leaksHtml ? `<h2 style="font-size:14px;font-weight:600;color:#111827;margin:0 0 12px;">Top Revenue Leaks</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">${leaksHtml}</table>` : ''}

          <!-- Compliance flags -->
          ${flagsHtml ? `<h2 style="font-size:14px;font-weight:600;color:#111827;margin:0 0 8px;">Compliance Flags</h2>
          <ul style="padding-left:0;list-style:none;margin:0 0 24px;">${flagsHtml}</ul>` : ''}

          <!-- Quick wins -->
          ${audit.quickWins.length > 0 ? `<h2 style="font-size:14px;font-weight:600;color:#111827;margin:0 0 8px;">Quick Wins</h2>
          <ul style="padding-left:16px;margin:0 0 24px;">${audit.quickWins.map(w => `<li style="font-size:12px;color:#374151;margin-bottom:4px;">${esc(w)}</li>`).join('')}</ul>` : ''}

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;text-align:center;">
              <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#166534;">Want us to fix these issues for you?</p>
              <p style="margin:0 0 16px;font-size:12px;color:#4b7c5a;">BakedBot handles SEO, compliance, campaigns, and customer retention — all in one platform built for cannabis.</p>
              <a href="https://bakedbot.ai/get-started" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:13px;font-weight:600;padding:10px 24px;border-radius:6px;text-decoration:none;">Book a Free Demo</a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">BakedBot AI · Cannabis Commerce Platform · <a href="https://bakedbot.ai" style="color:#9ca3af;">bakedbot.ai</a></p>
          <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">You received this because you requested a free marketing audit.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendGenericEmail({
    to,
    name: firstName,
    subject: `Your Marketing Audit: ${audit.url} scored ${audit.grade} (${audit.overallScore}/100)`,
    htmlBody,
    communicationType: 'transactional',
  });
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
