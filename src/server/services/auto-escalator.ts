/**
 * Auto-Escalator — Incident Response Bridge
 *
 * Called by GitHub Actions when monitoring detects a failure:
 *   - pulse.yaml fires every 10min: heartbeat failure (P0)
 *   - synthetic-monitoring.yml fires every 15min: latency SLA breach (P1)
 *
 * On each incident:
 *   1. Dedup — skip if identical bug filed within 30 minutes
 *   2. File a QA bug in Firestore (P0 or P1) via Admin SDK
 *   3. Post an immediate Slack alert
 *   4. Dispatch Linus async (setImmediate) — he diagnoses and posts analysis to Slack
 *
 * Linus is limited to 5 iterations here (not 15) — fast diagnosis, not deep investigation.
 * The initial Slack alert fires before Linus responds, so humans aren't waiting.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { dispatchLinusIncidentResponse } from '@/server/services/linus-incident-response';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';
import type { QABugPriority } from '@/types/qa';

const DASHBOARD_URL = 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HeartbeatFailure {
    httpStatus: number;
    responseBody: string;
    endpoint: string;
    failedAt: string;
    githubRunUrl?: string;
}

export interface LatencyBreach {
    overallP95: number;
    endpoints: {
        health: number;
        menu: number;
        llmTxt: number;
    };
    breachedAt: string;
    githubRunUrl?: string;
}

// ── Internal: Bug Filing ──────────────────────────────────────────────────────

async function fileBugDirect(bug: {
    title: string;
    steps: string[];
    expected: string;
    actual: string;
    priority: QABugPriority;
    area: string;
    notes?: string;
}): Promise<string | null> {
    try {
        const db = getAdminFirestore();
        const docRef = await db.collection('qa_bugs').add({
            ...bug,
            status: 'open',
            reportedBy: 'auto-escalator',
            environment: 'production',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        logger.info('[AutoEscalator] Bug filed', { bugId: docRef.id, title: bug.title });
        return docRef.id;
    } catch (err) {
        logger.error('[AutoEscalator] Failed to file bug', { error: String(err) });
        return null;
    }
}

/**
 * Dedup check: was an auto-escalator bug with this prefix filed in the last 30 minutes?
 * Uses the existing (status, priority, createdAt) composite index.
 */
async function recentBugExists(priority: QABugPriority, titlePrefix: string): Promise<boolean> {
    try {
        const db = getAdminFirestore();
        const cutoff = new Date(Date.now() - 30 * 60 * 1000);

        // Uses existing composite index: (status, priority, createdAt)
        const snap = await db.collection('qa_bugs')
            .where('status', '==', 'open')
            .where('priority', '==', priority)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        return snap.docs.some(doc => {
            const data = doc.data();
            const createdAt: Date = data.createdAt?.toDate?.() ?? new Date(0);
            return (
                data.reportedBy === 'auto-escalator' &&
                createdAt > cutoff &&
                typeof data.title === 'string' &&
                data.title.startsWith(titlePrefix)
            );
        });
    } catch {
        return false; // if check fails, don't block filing
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Escalate a production heartbeat failure (P0).
 * Called when pulse.yaml gets a non-200 from /api/cron/tick.
 */
export async function escalateHeartbeatFailure(failure: HeartbeatFailure): Promise<void> {
    logger.error('[AutoEscalator] Heartbeat failure — escalating', failure);

    const titlePrefix = 'Production heartbeat failure';
    if (await recentBugExists('P0', titlePrefix)) {
        logger.info('[AutoEscalator] Dedup: recent P0 heartbeat bug exists, skipping');
        return;
    }

    // 1. File P0 bug
    const bugId = await fileBugDirect({
        title: `${titlePrefix} — HTTP ${failure.httpStatus}`,
        steps: [
            `GitHub Actions pulse.yaml fired at ${failure.failedAt}`,
            `GET ${failure.endpoint} returned HTTP ${failure.httpStatus}`,
            `Response body: ${failure.responseBody.slice(0, 300)}`,
        ],
        expected: 'HTTP 200 with { status: "ok" }',
        actual: `HTTP ${failure.httpStatus} — ${failure.responseBody.slice(0, 300)}`,
        priority: 'P0',
        area: 'backend',
        notes: failure.githubRunUrl ?? undefined,
    });

    // 2. Immediate Slack alert (doesn't wait for Linus)
    const runLink = failure.githubRunUrl
        ? `<${failure.githubRunUrl}|View GitHub Run>`
        : 'No run URL';

    await postLinusIncidentSlack({
        blocks: [
            {
                type: 'header',
                text: { type: 'plain_text', text: '🔴 P0: Production Heartbeat Failed', emoji: true },
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Endpoint*\n\`${failure.endpoint}\`` },
                    { type: 'mrkdwn', text: `*HTTP Status*\n${failure.httpStatus}` },
                    { type: 'mrkdwn', text: `*Time*\n${failure.failedAt}` },
                    { type: 'mrkdwn', text: `*Run*\n${runLink}` },
                ],
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Response Body*\n\`\`\`${failure.responseBody.slice(0, 400)}\`\`\``,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `🖥️ Linus is analyzing... Bug \`${bugId ?? 'pending'}\` filed. Analysis incoming.`,
                },
            },
        ],
        fallbackText: `🔴 P0: Production heartbeat failed — HTTP ${failure.httpStatus}`,
        source: 'auto-escalator',
        incidentId: bugId,
    });

    // 3. Linus async — non-blocking
    const linusPrompt = `🚨 PRODUCTION INCIDENT — P0 Heartbeat Failure

Endpoint: GET ${failure.endpoint}
HTTP Status: ${failure.httpStatus}
Time: ${failure.failedAt}
Response: ${failure.responseBody.slice(0, 500)}
Bug ID: ${bugId ?? 'not filed'}
${failure.githubRunUrl ? `GitHub Actions run: ${failure.githubRunUrl}` : ''}

Please diagnose immediately:
1. Run a health check on the production app
2. Check the last 3 git commits — did a recent deploy cause this?
3. Is this a code error, infrastructure issue, or transient failure?
4. Should we rollback the last deploy or wait?
Keep your response concise — this is a live P0 incident.`;

    const bugLink = bugId
        ? `<${DASHBOARD_URL}/dashboard/ceo?tab=qa&bugId=${bugId}|View Bug \`${bugId}\`>`
        : 'Bug not filed';

    setImmediate(() => void dispatchLinusIncidentResponse({
        prompt: linusPrompt,
        source: 'auto-escalator',
        incidentId: bugId,
        incidentLink: bugLink,
        maxIterations: 5,
        analysisHeader: '🖥️ Linus — Incident Analysis',
        analysisFallbackPrefix: '🖥️ Linus analysis complete',
    }));
}

/**
 * Escalate a latency SLA breach (P1).
 * Called when k6 synthetic monitoring detects p95 > 600ms.
 */
export async function escalateLatencyBreach(breach: LatencyBreach): Promise<void> {
    logger.warn('[AutoEscalator] Latency SLA breach — escalating', breach);

    const titlePrefix = 'Latency SLA breach';
    if (await recentBugExists('P1', titlePrefix)) {
        logger.info('[AutoEscalator] Dedup: recent P1 latency bug exists, skipping');
        return;
    }

    // Identify worst offender
    const endpointMs: Record<string, number> = {
        '/api/health': breach.endpoints.health,
        '/thrivesyracuse': breach.endpoints.menu,
        '/llm.txt': breach.endpoints.llmTxt,
    };
    const [worstEndpoint, worstMs] = Object.entries(endpointMs)
        .sort(([, a], [, b]) => b - a)[0]!;

    // 1. File P1 bug
    const bugId = await fileBugDirect({
        title: `${titlePrefix} — p95 ${breach.overallP95}ms (SLA: 600ms)`,
        steps: [
            `k6 synthetic monitoring fired at ${breach.breachedAt}`,
            `Overall p95: ${breach.overallP95}ms (threshold: 600ms)`,
            `Worst offender: ${worstEndpoint} at ${worstMs}ms`,
            `/api/health: ${breach.endpoints.health}ms | /thrivesyracuse: ${breach.endpoints.menu}ms | /llm.txt: ${breach.endpoints.llmTxt}ms`,
        ],
        expected: 'All endpoints p95 < 600ms',
        actual: `p95 ${breach.overallP95}ms — ${worstEndpoint} at ${worstMs}ms`,
        priority: 'P1',
        area: 'performance',
        notes: breach.githubRunUrl ?? undefined,
    });

    // 2. Immediate Slack alert
    const runLink = breach.githubRunUrl
        ? `<${breach.githubRunUrl}|View GitHub Run>`
        : 'No run URL';

    await postLinusIncidentSlack({
        blocks: [
            {
                type: 'header',
                text: { type: 'plain_text', text: '🟠 P1: Latency SLA Breach', emoji: true },
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Overall p95*\n${breach.overallP95}ms _(SLA: 600ms)_` },
                    { type: 'mrkdwn', text: `*Worst Endpoint*\n\`${worstEndpoint}\` — ${worstMs}ms` },
                    { type: 'mrkdwn', text: `*\`/api/health\`*\n${breach.endpoints.health}ms` },
                    { type: 'mrkdwn', text: `*\`/thrivesyracuse\`*\n${breach.endpoints.menu}ms` },
                    { type: 'mrkdwn', text: `*\`/llm.txt\`*\n${breach.endpoints.llmTxt}ms` },
                    { type: 'mrkdwn', text: `*Run*\n${runLink}` },
                ],
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `🖥️ Linus is analyzing... Bug \`${bugId ?? 'pending'}\` filed. Analysis incoming.`,
                },
            },
        ],
        fallbackText: `🟠 P1: Latency SLA breach — p95 ${breach.overallP95}ms`,
        source: 'auto-escalator',
        incidentId: bugId,
    });

    // 3. Linus async — non-blocking
    const linusPrompt = `⚠️ LATENCY SLA BREACH — P1

Overall p95: ${breach.overallP95}ms at ${breach.breachedAt}
Endpoint breakdown:
  /api/health:     ${breach.endpoints.health}ms  (SLA: 200ms)
  /thrivesyracuse: ${breach.endpoints.menu}ms    (SLA: 600ms)
  /llm.txt:        ${breach.endpoints.llmTxt}ms  (SLA: 600ms)

Worst offender: ${worstEndpoint} at ${worstMs}ms
Bug ID: ${bugId ?? 'not filed'}
${breach.githubRunUrl ? `GitHub Actions run: ${breach.githubRunUrl}` : ''}

Please diagnose:
1. Check the last 3 git commits for anything that could slow responses
2. If /api/health is slow → Firebase App Hosting cold start or infra issue
3. If only /thrivesyracuse is slow → ISR revalidation storm or large product catalog query
4. If /llm.txt is slow → llm.txt generator timeout or Firestore query issue
5. Recommend: wait-and-watch, rollback, or specific fix
Keep response concise — focus on root cause and next action.`;

    const bugLink = bugId
        ? `<${DASHBOARD_URL}/dashboard/ceo?tab=qa&bugId=${bugId}|View Bug \`${bugId}\`>`
        : 'Bug not filed';

    setImmediate(() => void dispatchLinusIncidentResponse({
        prompt: linusPrompt,
        source: 'auto-escalator',
        incidentId: bugId,
        incidentLink: bugLink,
        maxIterations: 5,
        analysisHeader: '🖥️ Linus — Incident Analysis',
        analysisFallbackPrefix: '🖥️ Linus analysis complete',
    }));
}
