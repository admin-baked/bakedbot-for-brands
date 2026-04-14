'use server';

import { callGroqOrClaude } from '@/ai/glm';
import { auditPage } from '@/server/services/seo-auditor';
import { captureEmailLead } from '@/server/actions/email-capture';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { sendGenericEmail } from '@/lib/email/dispatcher';

export interface RetentionAuditResult {
  url: string;
  overallScore: number;
  grade: string;
  summary: string;
  dimensions: {
    customerCapture: { score: number; max: number; findings: string };
    welcomeReadiness: { score: number; max: number; findings: string };
    conversionFriction: { score: number; max: number; findings: string };
    retentionDepth: { score: number; max: number; findings: string };
    complianceTrust: { score: number; max: number; findings: string };
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

// Backward-compatible alias while the rest of the repo migrates.
export type MarketAuditResult = RetentionAuditResult;

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

function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    
    // Block private/internal IP ranges
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') return false;
    if (hostname.startsWith('10.') || hostname.startsWith('192.168.')) return false;
    if (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31) return false;
    if (hostname.endsWith('.local')) return false;
    
    // Only allow http/https
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function runRetentionAudit(url: string): Promise<RetentionAuditResult | { error: string }> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  
  // Validate URL to prevent SSRF
  if (!isAllowedUrl(normalizedUrl)) {
    return { error: 'URL not allowed - only public web pages are supported' };
  }

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

  const systemPrompt = `You are a senior cannabis retention strategist auditing dispensary websites.
You score sites across 5 dimensions tied to customer capture, welcome activation, and repeat revenue.
Be specific — quote actual copy from the page, name exact issues, and give concrete fixes tied to capture, welcome, retention, and compliance trust.
You understand cannabis compliance: forbidden medical claims, age gate requirements, consent capture, and state-specific rules.
Always identify compliance risks even when other scores are high, and always explain the proof path into Access or Operator.
Return valid JSON only — no markdown, no explanation outside the JSON.`;

  const userPrompt = `Audit this dispensary website and return a structured JSON report focused on retention readiness.

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
    "customerCapture": {
      "score": <0-25>,
      "findings": "<2-3 sentences: how well the site captures first-party customer data, what is missing, and exact evidence>"
    },
    "welcomeReadiness": {
      "score": <0-20>,
      "findings": "<2-3 sentences: whether a welcome flow or clear first-visit follow-up exists, what blocks launch, and exact evidence>"
    },
    "conversionFriction": {
      "score": <0-20>,
      "findings": "<2-3 sentences: where first-to-second visit conversion is likely breaking due to friction or weak trust signals>"
    },
    "retentionDepth": {
      "score": <0-15>,
      "findings": "<2-3 sentences: lifecycle depth, repeat-visit prompts, loyalty hooks, and whether the retention system feels real or thin>"
    },
    "complianceTrust": {
      "score": <0-20>,
      "findings": "<2-3 sentences: consent capture, age-gate trust, compliance issues, and what would make operators safer to launch outbound>"
    }
  },
  "revenueLeaks": [
    {
      "title": "<issue name>",
      "why": "<why it hurts capture, welcome activation, or repeat revenue>",
      "fix": "<concrete action>",
      "impactMonthly": "<e.g. +$2,000-5,000/mo>",
      "effort": "<Low|Medium|High>"
    }
  ],
  "quickWins": [
    "<specific action tied to capture or welcome activation → expected outcome>",
    "<specific action tied to retention → expected outcome>",
    "<specific action tied to proof path into Access or Operator → expected outcome>"
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

Score conservatively. Most sites score 40-65. A score above 80 requires strong evidence across all dimensions.
The report should clearly answer:
1. Where does customer capture break?
2. Does a welcome flow exist or feel launch-ready?
3. What likely blocks the first-to-second visit?
4. How deep is the retention system?
5. Is the next proof path Access or Operator?`;

  try {
    const rawText = (await callGroqOrClaude({
      systemPrompt,
      userMessage: userPrompt,
      maxTokens: 2048,
      temperature: 0.3, // Low temp for reliable JSON output
      caller: 'retention-audit',
      preferGeminiFallback: true,
    })).trim();
    if (!rawText) return { error: 'Empty response from AI' };

    // Strip markdown code fences if the model wrapped the JSON
    const raw = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed: Partial<RetentionAuditResult>;
    try {
      parsed = JSON.parse(raw) as Partial<RetentionAuditResult>;
    } catch {
      logger.error(`[RetentionAudit] JSON parse failed for ${normalizedUrl}: ${raw.slice(0, 200)}`);
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
        customerCapture: {
          score: dimensions?.customerCapture?.score ?? 0,
          findings: dimensions?.customerCapture?.findings ?? '',
          max: 25,
        },
        welcomeReadiness: {
          score: dimensions?.welcomeReadiness?.score ?? 0,
          findings: dimensions?.welcomeReadiness?.findings ?? '',
          max: 20,
        },
        conversionFriction: {
          score: dimensions?.conversionFriction?.score ?? 0,
          findings: dimensions?.conversionFriction?.findings ?? '',
          max: 20,
        },
        retentionDepth: {
          score: dimensions?.retentionDepth?.score ?? 0,
          findings: dimensions?.retentionDepth?.findings ?? '',
          max: 15,
        },
        complianceTrust: {
          score: dimensions?.complianceTrust?.score ?? 0,
          findings: dimensions?.complianceTrust?.findings ?? '',
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
    logger.error(`[RetentionAudit] Failed for ${normalizedUrl}: ${(e as Error).message}`);
    return { error: (e as Error).message };
  }
}

// Backward-compatible alias while callers migrate.
export const runMarketAudit = runRetentionAudit;

// ── Lead capture ─────────────────────────────────────────────────────────────

export interface SubmitRetentionAuditLeadRequest {
  url: string;
  email: string;
  firstName?: string;
  marketingConsent: boolean;
  auditResult: RetentionAuditResult;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
}

export interface SubmitRetentionAuditLeadResponse {
  success: boolean;
  leadId?: string;
  auditReportId?: string;
  error?: string;
}

export type SubmitMarketAuditLeadRequest = SubmitRetentionAuditLeadRequest;
export type SubmitMarketAuditLeadResponse = SubmitRetentionAuditLeadResponse;

export async function submitRetentionAuditLead(
  req: SubmitRetentionAuditLeadRequest,
): Promise<SubmitRetentionAuditLeadResponse> {
  try {
    // 1. Capture / upsert email lead
    const source = req.utmSource === 'email' ? 'retention_audit_email' : 'retention_audit';
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
      'retention-audit',
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
      db.collection('retention_audit_reports').add(reportData),
      db.collection('email_leads').doc(leadResult.leadId).update({
        tags: mergedTags,
        retentionAuditScore: req.auditResult.overallScore,
        retentionAuditGrade: req.auditResult.grade,
        retentionAuditUrl: req.url,
        lastUpdated: now,
      }),
    ]);

    logger.info('[RetentionAudit] Lead submitted', {
      leadId: leadResult.leadId,
      auditReportId: reportRef.id,
      score: req.auditResult.overallScore,
      utmSource: req.utmSource,
    });

    // Fire-and-forget — deliver the full report to their inbox
    sendRetentionAuditResultEmail(req.email, req.firstName, req.auditResult).catch((e: unknown) => {
      logger.warn('[RetentionAudit] Failed to send audit result email', { email: req.email, error: (e as Error).message });
    });

    return { success: true, leadId: leadResult.leadId, auditReportId: reportRef.id };
  } catch (e) {
    logger.error(`[RetentionAudit] Lead submit failed: ${(e as Error).message}`);
    return { success: false, error: (e as Error).message };
  }
}

// Backward-compatible alias while callers migrate.
export const submitMarketAuditLead = submitRetentionAuditLead;

// ── Audit result email ────────────────────────────────────────────────────────

const HTML_ESCAPE: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(s: string): string { return s.replace(/[&<>"']/g, c => HTML_ESCAPE[c]); }

async function sendRetentionAuditResultEmail(
  to: string,
  firstName: string | undefined,
  audit: RetentionAuditResult,
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
          <span style="color:#94a3b8;font-size:13px;margin-left:8px;">AI Retention Audit</span>
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
          <p style="margin:0 0 24px;color:#6b7280;font-size:13px;">Here's the full breakdown of your AI retention audit. We scored your site across 5 dimensions tied to customer capture, welcome activation, and repeat revenue.</p>

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
              <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#166534;">Ready to tighten the welcome and retention loop?</p>
              <p style="margin:0 0 16px;font-size:12px;color:#4b7c5a;">BakedBot Operator gives dispensaries launch support, weekly reporting, KPI reviews, and accountable welcome + lifecycle execution.</p>
              <a href="https://bakedbot.ai/book/martez" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:13px;font-weight:600;padding:10px 24px;border-radius:6px;text-decoration:none;">Book a Strategy Call</a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">BakedBot AI · Managed revenue activation for dispensaries · <a href="https://bakedbot.ai" style="color:#9ca3af;">bakedbot.ai</a></p>
          <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">You received this because you requested an AI retention audit.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendGenericEmail({
    to,
    name: firstName,
    subject: `Your AI Retention Audit: ${audit.url} scored ${audit.grade} (${audit.overallScore}/100)`,
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
    logger.warn(`[RetentionAudit] Could not fetch ${url}: ${(e as Error).message}`);
    return `[Could not fetch page content: ${(e as Error).message}]`;
  }
}
