/**
 * Weekly Testing Stack Review Cron
 *
 * Cloud Scheduler job:
 *   Name:     testing-review
 *   Schedule: 30 14 * * 1  (9:30 AM EST = 2:30 PM UTC, every Monday)
 *   URL:      https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/testing-review
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 *
 * Every Monday, Linus audits the past week of platform test results and posts a
 * gap analysis + improvement recommendations to the Agent Board. New tenants,
 * new features, and recurring failures are surfaced automatically.
 *
 * Setup (run once):
 *   gcloud scheduler jobs create http testing-review \
 *     --schedule="30 14 * * 1" \
 *     --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/testing-review" \
 *     --message-body='{}' \
 *     --headers="Authorization=Bearer ${CRON_SECRET},Content-Type=application/json" \
 *     --time-zone="UTC" --location=us-central1
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { requireCronSecret } from '@/server/auth/cron';
import { callGLM, GLM_MODELS } from '@/ai/glm';
import {
  postLinusIncidentSlack,
  type LinusIncidentSlackBlock,
} from '@/server/services/incident-notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Data gathering
// ---------------------------------------------------------------------------

interface StressTestRun {
  id: string;
  title: string;
  passed: number | null;
  failed: number | null;
  total: number | null;
  createdAt: string;
}

interface OrgSummary {
  id: string;
  name: string;
  status: string;
}

interface ReviewContext {
  weekOf: string;
  activeOrgCount: number;
  orgs: OrgSummary[];
  recentRuns: StressTestRun[];
  recentBugs: { title: string; priority: string; createdAt: string }[];
  totalRunsThisWeek: number;
  avgPassRate: number | null;
  recurringFailures: string[];
  currentPagesCovered: string[];
  currentSuiteCount: number;
}

async function gatherReviewContext(): Promise<ReviewContext> {
  const db = getAdminFirestore();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekOf = new Date().toISOString().split('T')[0];

  const [orgsSnap, runsSnap, bugsSnap] = await Promise.all([
    db.collection('organizations').where('status', '==', 'active').limit(50).get(),
    db.collection('agent_tasks')
      .where('reportedBy', '==', 'linus-stress-test')
      .where('category', '==', 'bug')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get(),
    db.collection('agent_tasks')
      .where('reportedBy', '==', 'linus-stress-test')
      .where('category', '==', 'bug')
      .where('status', '==', 'open')
      .limit(30)
      .get(),
  ]);

  const orgs: OrgSummary[] = orgsSnap.docs.map(d => ({
    id: d.id,
    name: String(d.data().name ?? d.id),
    status: String(d.data().status ?? 'unknown'),
  }));

  // Recent test run artifacts (tasks with title matching "Full Platform Test")
  const runDocs = runsSnap.docs.filter(d => {
    const t = String(d.data().title ?? '');
    return t.includes('Full Platform Test') || t.includes('passed');
  });

  const recentRuns: StressTestRun[] = runDocs.slice(0, 10).map(d => {
    const data = d.data();
    const titleMatch = String(data.title ?? '').match(/(\d+)\/(\d+) passed/);
    const passed = titleMatch ? parseInt(titleMatch[1]) : null;
    const total  = titleMatch ? parseInt(titleMatch[2]) : null;
    return {
      id: d.id,
      title: String(data.title ?? ''),
      passed,
      failed: passed !== null && total !== null ? total - passed : null,
      total,
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : data.createdAt?.toDate?.()?.toISOString() ?? '',
    };
  });

  const thisWeekRuns = recentRuns.filter(r => r.createdAt >= cutoff.toISOString());
  const passRates = thisWeekRuns.filter(r => r.total !== null && r.total > 0)
    .map(r => (r.passed ?? 0) / (r.total ?? 1));
  const avgPassRate = passRates.length > 0
    ? Math.round(passRates.reduce((a, b) => a + b, 0) / passRates.length * 100)
    : null;

  // Open bugs — look for titles appearing more than once (recurring failures)
  const bugTitles = bugsSnap.docs.map(d => String(d.data().title ?? ''));
  const titleCounts = bugTitles.reduce<Record<string, number>>((acc, t) => {
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});
  const recurringFailures = Object.entries(titleCounts)
    .filter(([, count]) => count > 1)
    .map(([title]) => title)
    .slice(0, 5);

  const recentBugs = bugsSnap.docs.slice(0, 10).map(d => ({
    title: String(d.data().title ?? ''),
    priority: String(d.data().priority ?? 'normal'),
    createdAt: typeof d.data().createdAt === 'string'
      ? d.data().createdAt
      : d.data().createdAt?.toDate?.()?.toISOString() ?? '',
  }));

  // Current coverage snapshot
  const currentPagesCovered = [
    '/dashboard/campaigns', '/dashboard/customers', '/dashboard/playbooks',
    '/dashboard/analytics', '/dashboard/inbox', '/dashboard/ceo', '/dashboard/email-inbox',
    '/loyalty-tablet (per tenant)',
  ];

  return {
    weekOf,
    activeOrgCount: orgs.length,
    orgs,
    recentRuns,
    recentBugs,
    totalRunsThisWeek: thisWeekRuns.length,
    avgPassRate,
    recurringFailures,
    currentPagesCovered,
    currentSuiteCount: 12,
  };
}

// ---------------------------------------------------------------------------
// GLM synthesis
// ---------------------------------------------------------------------------

interface ReviewReport {
  headline: string;
  passRateSummary: string;
  coverageGaps: string[];
  recurringIssues: string[];
  newTenantFlags: string[];
  recommendedTestCases: string[];
  priorityAction: string;
}

async function synthesizeReview(ctx: ReviewContext): Promise<ReviewReport> {
  const fallback: ReviewReport = {
    headline: 'Weekly testing review complete.',
    passRateSummary: `${ctx.avgPassRate ?? 'N/A'}% avg pass rate across ${ctx.totalRunsThisWeek} runs`,
    coverageGaps: [],
    recurringIssues: ctx.recurringFailures,
    newTenantFlags: [],
    recommendedTestCases: [],
    priorityAction: 'Review Agent Board for open bugs.',
  };

  const systemPrompt = `You are Linus, CTO of BakedBot AI. You run a weekly audit of the platform's autonomous testing stack.
Your job is to identify: coverage gaps (features or routes not yet tested), recurring failures (same bug appearing multiple times),
tenant health issues (new orgs that may not be fully onboarded), and specific new test cases to add to the stress test script.
Be specific and actionable. Respond with valid JSON only — no markdown fences.`;

  const userMessage = JSON.stringify({
    activeOrgs: ctx.orgs.map(o => o.name),
    totalRuns: ctx.totalRunsThisWeek,
    avgPassRate: ctx.avgPassRate,
    recentBugs: ctx.recentBugs.map(b => b.title),
    recurringFailures: ctx.recurringFailures,
    currentPagesCovered: ctx.currentPagesCovered,
    currentSuiteCount: ctx.currentSuiteCount,
    note: 'Stress test suites: check-in, loyalty, recs, POS, campaigns, CRM, playbooks, analytics, briefing, email, kiosk, dashboard + per-tenant baseline',
  });

  const expectedFormat = `{
  "headline": "One-sentence status",
  "passRateSummary": "Pass rate description",
  "coverageGaps": ["gap1", "gap2"],
  "recurringIssues": ["issue1"],
  "newTenantFlags": ["org name or concern"],
  "recommendedTestCases": ["Specific test case to add to stress test"],
  "priorityAction": "Single most important action this week"
}`;

  try {
    const raw = await callGLM({
      systemPrompt,
      userMessage: `${userMessage}\n\nRespond with JSON matching:\n${expectedFormat}`,
      model: GLM_MODELS.STANDARD,
      maxTokens: 1024,
      temperature: 0.5,
    });

    const jsonStr = raw.replace(/```(?:json)?\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr) as Partial<ReviewReport>;
    return {
      headline:              typeof parsed.headline === 'string' ? parsed.headline : fallback.headline,
      passRateSummary:       typeof parsed.passRateSummary === 'string' ? parsed.passRateSummary : fallback.passRateSummary,
      coverageGaps:          Array.isArray(parsed.coverageGaps) ? parsed.coverageGaps : [],
      recurringIssues:       Array.isArray(parsed.recurringIssues) ? parsed.recurringIssues : ctx.recurringFailures,
      newTenantFlags:        Array.isArray(parsed.newTenantFlags) ? parsed.newTenantFlags : [],
      recommendedTestCases:  Array.isArray(parsed.recommendedTestCases) ? parsed.recommendedTestCases : [],
      priorityAction:        typeof parsed.priorityAction === 'string' ? parsed.priorityAction : fallback.priorityAction,
    };
  } catch (err) {
    logger.warn('[TestingReview] GLM parse failed, using fallback', { err: String(err) });
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

async function postToAgentBoard(report: ReviewReport, ctx: ReviewContext): Promise<void> {
  const db = getAdminFirestore();

  const gapsList = report.coverageGaps.length
    ? report.coverageGaps.map(g => `- ${g}`).join('\n')
    : '- None identified this week';

  const recsList = report.recommendedTestCases.length
    ? report.recommendedTestCases.map(t => `- [ ] ${t}`).join('\n')
    : '- No new cases recommended';

  const content = [
    `## Testing Stack Weekly Review — ${ctx.weekOf}`,
    '',
    `**${report.headline}**`,
    `Pass rate: ${report.passRateSummary} | Active orgs: ${ctx.activeOrgCount} | Runs this week: ${ctx.totalRunsThisWeek}`,
    '',
    '### Coverage Gaps',
    gapsList,
    '',
    '### Recurring Issues',
    ...(report.recurringIssues.length ? report.recurringIssues.map(i => `- ${i}`) : ['- None']),
    '',
    '### Recommended New Test Cases',
    recsList,
    '',
    '### Priority Action',
    `> ${report.priorityAction}`,
    '',
    `*Auto-generated by testing-review cron. Add recommended tests to \`scripts/linus-stress-test-checkin.mjs\`.*`,
  ].join('\n');

  await db.collection('agent_tasks').add({
    title: `Testing Stack Review — ${ctx.weekOf} (${ctx.avgPassRate ?? '?'}% pass rate, ${ctx.activeOrgCount} orgs)`,
    body: `Weekly automated testing audit. ${report.coverageGaps.length} gaps, ${report.recommendedTestCases.length} new test cases recommended.`,
    status: 'awaiting_approval',
    priority: report.recurringIssues.length > 0 ? 'high' : 'normal',
    category: 'testing',
    stoplight: report.recurringIssues.length > 0 ? 'orange' : 'green',
    reportedBy: 'linus-stress-test',
    assignedTo: null,
    triggeredBy: 'cron',
    orgId: 'platform',
    artifact: {
      type: 'analysis',
      title: `Testing Stack Review — ${ctx.weekOf}`,
      content,
      generatedAt: new Date().toISOString(),
      generatedBy: 'testing-review',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function postToSlack(report: ReviewReport, ctx: ReviewContext): Promise<void> {
  const gaps = report.coverageGaps.slice(0, 3).map(g => `• ${g}`).join('\n') || '• None identified';
  const recs = report.recommendedTestCases.slice(0, 3).map(r => `• ${r}`).join('\n') || '• None';

  const blocks: LinusIncidentSlackBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '🧪 Linus — Weekly Testing Stack Review', emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*${report.headline}*\n${report.passRateSummary} · ${ctx.activeOrgCount} active orgs · ${ctx.totalRunsThisWeek} runs this week` },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Coverage Gaps:*\n${gaps}` },
        { type: 'mrkdwn', text: `*Recommended Tests:*\n${recs}` },
      ],
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `✅ *Priority action:* ${report.priorityAction}` },
    },
  ];

  await postLinusIncidentSlack({
    blocks,
    fallbackText: `🧪 Testing Stack Review — ${report.headline}\n${report.priorityAction}`,
    source: 'auto-escalator',
    channelName: 'linus-deployments',
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

async function runTestingReview(): Promise<NextResponse> {
  const ctx = await gatherReviewContext();

  logger.info('[TestingReview] Context gathered', {
    activeOrgs: ctx.activeOrgCount,
    runsThisWeek: ctx.totalRunsThisWeek,
    avgPassRate: ctx.avgPassRate,
    recurringFailures: ctx.recurringFailures.length,
  });

  const report = await synthesizeReview(ctx);

  await Promise.allSettled([
    postToAgentBoard(report, ctx),
    postToSlack(report, ctx),
  ]);

  logger.info('[TestingReview] Review posted', { weekOf: ctx.weekOf });

  return NextResponse.json({
    success: true,
    weekOf: ctx.weekOf,
    activeOrgs: ctx.activeOrgCount,
    avgPassRate: ctx.avgPassRate,
    coverageGaps: report.coverageGaps.length,
    recommendedTestCases: report.recommendedTestCases.length,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireCronSecret(request, 'testing-review');
  if (authError) return authError;

  logger.info('[TestingReview] Starting weekly testing review');

  try {
    return await runTestingReview();
  } catch (error) {
    logger.error('[TestingReview] Failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request);
}
