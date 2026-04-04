/**
 * Linus Weekly Engineering Report Cron Endpoint
 *
 * Cloud Scheduler job:
 *   Name:     linus-weekly-report
 *   Schedule: 0 14 * * 1  (9 AM EST = 2 PM UTC, every Monday)
 *   URL:      https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/linus-weekly-report
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 *
 * Linus generates a weekly engineering health report covering recent commits,
 * build health, GLM usage, agent telemetry, and top backlog items.
 * Posts to #linus-deployments and writes to the platform Daily Briefing inbox.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
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
// Types
// ---------------------------------------------------------------------------

interface BacklogItem {
  id?: string;
  title?: string;
  status?: string;
  priority?: string;
}

interface BacklogJson {
  items?: BacklogItem[];
  [key: string]: unknown;
}

interface AgentTelemetrySummary {
  agentId: string;
  callCount: number;
  totalTokens: number;
  errorCount: number;
  avgTokens: number;
}

interface WeeklyReportResult {
  headline: string;
  bullets: string[];
  topRisk: string;
  recommendation: string;
}

interface RawReportData {
  backlogCount: number;
  topBacklogItems: BacklogItem[];
  glmUsageTokens: number;
  agentTelemetry: AgentTelemetrySummary[];
  incidentCount: number;
}

// ---------------------------------------------------------------------------
// Data Gatherers
// ---------------------------------------------------------------------------

function loadBacklog(): { count: number; items: BacklogItem[] } {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'dev/backlog.json'), 'utf-8');
    const parsed = JSON.parse(raw) as BacklogJson;
    const items: BacklogItem[] = Array.isArray(parsed.items) ? parsed.items : [];
    return { count: items.length, items: items.slice(0, 10) };
  } catch {
    logger.warn('[LinusWeeklyReport] backlog.json not found or unparseable');
    return { count: 0, items: [] };
  }
}

async function loadGLMUsage(): Promise<number> {
  try {
    const db = getAdminFirestore();
    const snap = await db.doc('system_config/glm_usage').get();
    if (!snap.exists) return 0;
    const data = snap.data();
    return typeof data?.used === 'number' ? data.used : 0;
  } catch (err) {
    logger.warn('[LinusWeeklyReport] Failed to load GLM usage', { error: String(err) });
    return 0;
  }
}

async function loadAgentTelemetry(): Promise<AgentTelemetrySummary[]> {
  try {
    const db = getAdminFirestore();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const snap = await db
      .collection('agent_telemetry')
      .where('createdAt', '>=', cutoff)
      .limit(500)
      .get();

    const byAgent = new Map<string, { calls: number; tokens: number; errors: number }>();
    for (const doc of snap.docs) {
      const d = doc.data();
      const agentId = typeof d.agentId === 'string' ? d.agentId : 'unknown';
      const tokens = typeof d.totalTokens === 'number' ? d.totalTokens : 0;
      const isError = d.status === 'error' || d.status === 'failed';
      const existing = byAgent.get(agentId) ?? { calls: 0, tokens: 0, errors: 0 };
      byAgent.set(agentId, {
        calls: existing.calls + 1,
        tokens: existing.tokens + tokens,
        errors: existing.errors + (isError ? 1 : 0),
      });
    }

    return Array.from(byAgent.entries()).map(([agentId, stats]) => ({
      agentId,
      callCount: stats.calls,
      totalTokens: stats.tokens,
      errorCount: stats.errors,
      avgTokens: stats.calls > 0 ? Math.round(stats.tokens / stats.calls) : 0,
    }));
  } catch (err) {
    logger.warn('[LinusWeeklyReport] Failed to load agent telemetry', { error: String(err) });
    return [];
  }
}

async function loadIncidentCount(): Promise<number> {
  try {
    const db = getAdminFirestore();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Try linus_incidents first, fall back to deployment_incidents
    const [linusSnap, deploySnap] = await Promise.allSettled([
      db.collection('linus_incidents').where('createdAt', '>=', cutoff).limit(100).get(),
      db.collection('deployment_incidents').where('createdAt', '>=', cutoff).limit(100).get(),
    ]);

    let count = 0;
    if (linusSnap.status === 'fulfilled') count += linusSnap.value.size;
    if (deploySnap.status === 'fulfilled') count += deploySnap.value.size;
    return count;
  } catch (err) {
    logger.warn('[LinusWeeklyReport] Failed to load incident count', { error: String(err) });
    return 0;
  }
}

// ---------------------------------------------------------------------------
// GLM Synthesis
// ---------------------------------------------------------------------------

function parseGLMReport(raw: string): WeeklyReportResult {
  const fallback: WeeklyReportResult = {
    headline: 'Weekly engineering report generated.',
    bullets: [raw.slice(0, 200)],
    topRisk: 'See raw report for details.',
    recommendation: 'Review full report in Firestore.',
  };

  try {
    // Strip markdown code fences if present
    const jsonStr = raw.replace(/```(?:json)?\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr) as Partial<WeeklyReportResult>;
    return {
      headline: typeof parsed.headline === 'string' ? parsed.headline : fallback.headline,
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets : fallback.bullets,
      topRisk: typeof parsed.topRisk === 'string' ? parsed.topRisk : fallback.topRisk,
      recommendation:
        typeof parsed.recommendation === 'string'
          ? parsed.recommendation
          : fallback.recommendation,
    };
  } catch {
    return fallback;
  }
}

async function synthesizeReport(raw: RawReportData): Promise<WeeklyReportResult> {
  const systemPrompt = `You are Linus, CTO of BakedBot. Generate a concise weekly engineering report (5-7 bullets max).
Focus on: build health, agent performance, cost trends, top priorities, risks.
Respond with valid JSON only — no markdown fences, no prose outside JSON.`;

  const userMessage = JSON.stringify(raw, null, 2);

  const expectedFormat = `{
  "headline": "One-sentence weekly status",
  "bullets": ["bullet 1", "bullet 2"],
  "topRisk": "Biggest risk this week",
  "recommendation": "One specific action for this week"
}`;

  const glmRaw = await callGLM({
    systemPrompt,
    userMessage: `${userMessage}\n\nRespond with JSON matching this shape:\n${expectedFormat}`,
    model: GLM_MODELS.STANDARD,
    maxTokens: 1024,
    temperature: 0.7,
  });

  return parseGLMReport(glmRaw);
}

// ---------------------------------------------------------------------------
// Slack Post
// ---------------------------------------------------------------------------

async function postToSlack(report: WeeklyReportResult): Promise<void> {
  const bulletText = report.bullets.map(b => `• ${b}`).join('\n');

  const blocks: LinusIncidentSlackBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '📊 Linus — Weekly Engineering Report', emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*${report.headline}*` },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: bulletText },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `⚠️ *Top Risk:* ${report.topRisk}` },
        { type: 'mrkdwn', text: `✅ *Recommendation:* ${report.recommendation}` },
      ],
    },
  ];

  const fallbackText = [
    '📊 Linus — Weekly Engineering Report',
    report.headline,
    '',
    bulletText,
    '',
    `⚠️ Top Risk: ${report.topRisk}`,
    `✅ Recommendation: ${report.recommendation}`,
  ].join('\n');

  await postLinusIncidentSlack({
    blocks,
    fallbackText,
    source: 'auto-escalator',
    channelName: 'linus-deployments',
  });
}

// ---------------------------------------------------------------------------
// Inbox Post
// ---------------------------------------------------------------------------

async function postToInbox(report: WeeklyReportResult, raw: RawReportData): Promise<void> {
  const db = getAdminFirestore();

  // Find or create the Daily Briefing thread (platform-level, no org)
  const threadsSnap = await db
    .collection('inbox_threads')
    .where('metadata.isBriefingThread', '==', true)
    .where('metadata.scope', '==', 'platform')
    .limit(1)
    .get();

  let threadId: string;
  if (threadsSnap.empty) {
    const newRef = db.collection('inbox_threads').doc();
    threadId = newRef.id;
    await newRef.set({
      id: threadId,
      orgId: 'platform',
      userId: 'system',
      type: 'analytics',
      status: 'active',
      title: '📊 Daily Briefing',
      preview: 'Platform engineering briefing',
      primaryAgent: 'linus',
      assignedAgents: ['linus'],
      artifactIds: [],
      messages: [],
      metadata: { isBriefingThread: true, scope: 'platform' },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    });
    logger.info('[LinusWeeklyReport] Created platform briefing thread', { threadId });
  } else {
    threadId = threadsSnap.docs[0].id;
  }

  const now = new Date();
  const dateLabel = now.toISOString().split('T')[0];
  const bulletList = report.bullets.map(b => `• ${b}`).join('\n');
  const messageBody = `**Linus — Weekly Engineering Report (${dateLabel})**\n\n${bulletList}\n\n⚠️ *Top Risk:* ${report.topRisk}\n✅ *Recommendation:* ${report.recommendation}`;

  const artifact = {
    type: 'linus_weekly_report',
    data: {
      date: dateLabel,
      report,
      raw,
      generatedAt: now.toISOString(),
    },
  };

  await db.collection('inbox_threads').doc(threadId).collection('messages').add({
    role: 'assistant',
    content: messageBody,
    agentId: 'linus',
    artifact,
    createdAt: now,
    metadata: { source: 'linus-weekly-report' },
  });

  await db.collection('inbox_threads').doc(threadId).update({
    lastMessage: messageBody.slice(0, 120),
    lastMessageAt: now,
    updatedAt: now,
  });

  logger.info('[LinusWeeklyReport] Posted to inbox', { threadId });
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

async function runWeeklyReport(): Promise<NextResponse> {
  const db = getAdminFirestore();

  // 1. Gather data in parallel
  const [backlogResult, glmUsageResult, telemetryResult, incidentResult] =
    await Promise.allSettled([
      Promise.resolve(loadBacklog()),
      loadGLMUsage(),
      loadAgentTelemetry(),
      loadIncidentCount(),
    ]);

  const backlog =
    backlogResult.status === 'fulfilled' ? backlogResult.value : { count: 0, items: [] };
  const glmUsageTokens = glmUsageResult.status === 'fulfilled' ? glmUsageResult.value : 0;
  const agentTelemetry = telemetryResult.status === 'fulfilled' ? telemetryResult.value : [];
  const incidentCount = incidentResult.status === 'fulfilled' ? incidentResult.value : 0;

  const rawData: RawReportData = {
    backlogCount: backlog.count,
    topBacklogItems: backlog.items,
    glmUsageTokens,
    agentTelemetry,
    incidentCount,
  };

  logger.info('[LinusWeeklyReport] Data gathered', {
    backlogCount: rawData.backlogCount,
    glmUsageTokens: rawData.glmUsageTokens,
    agentCount: rawData.agentTelemetry.length,
    incidentCount: rawData.incidentCount,
  });

  // 2. Synthesize with GLM
  const report = await synthesizeReport(rawData);

  logger.info('[LinusWeeklyReport] Report synthesized', { headline: report.headline });

  // 3. Post to Slack + Inbox + Firestore in parallel
  const weekOf = new Date().toISOString().split('T')[0];

  await Promise.allSettled([
    postToSlack(report),
    postToInbox(report, rawData),
    db.collection('linus_weekly_reports').add({
      weekOf,
      report,
      raw: rawData,
      createdAt: new Date(),
    }),
  ]);

  logger.info('[LinusWeeklyReport] Report complete', { weekOf });

  return NextResponse.json({
    success: true,
    weekOf,
    headline: report.headline,
    bulletCount: report.bullets.length,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireCronSecret(request, 'linus-weekly-report');
  if (authError) return authError;

  logger.info('[LinusWeeklyReport] Starting weekly engineering report');

  try {
    return await runWeeklyReport();
  } catch (error) {
    logger.error('[LinusWeeklyReport] Failed to generate report', {
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
