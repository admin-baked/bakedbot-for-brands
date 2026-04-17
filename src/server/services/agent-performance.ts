/**
 * Agent Performance & Hypothesis Service
 *
 * Provides two Firestore collections:
 *   agent_performance_logs  — time-series run records per agent/domain
 *   agent_learning_docs     — each agent's living knowledge state (hypotheses, trends)
 *
 * Agents read prior performance before acting and write outcomes after.
 * Human approval gates (Slack) close the A/B test loop.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { elroySlackService } from '@/server/services/communications/slack';
import { ensureElroyChannel } from '@/server/services/agent-learning-loop';

// ─── Collections ────────────────────────────────────────────────────────────

export const PERF_LOGS_COLLECTION = 'agent_performance_logs';
export const LEARNING_DOCS_COLLECTION = 'agent_learning_docs';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentRunMetrics {
    [key: string]: number | string | boolean | null;
}

export interface AgentRunRecord {
    agentId: string;
    domain: string;           // e.g. 'newsletter', 'retention-nudge', 'competitive-intel'
    runAt: number;            // epoch ms
    periodLabel: string;      // e.g. 'week-2026-04-14', 'run-2026-04-17T08:00'
    metrics: AgentRunMetrics; // domain-specific numbers
    hypothesisId?: string;    // if this run was part of an A/B test
    variant?: string;         // 'A' | 'B' | 'control'
    notes?: string;
}

export interface Hypothesis {
    id: string;
    agentId: string;
    domain: string;
    description: string;      // "Subject lines with emojis increase open rate"
    variants: {
        id: string;           // 'A', 'B', 'control'
        description: string;
    }[];
    status: 'pending_approval' | 'active' | 'concluded' | 'rejected';
    winnerVariant?: string;
    conclusionNotes?: string;
    createdAt: number;
    concludedAt?: number;
    slackTs?: string;         // message ts for approval thread
    approvedBy?: string;
}

export interface AgentLearningDoc {
    agentId: string;
    domain: string;
    updatedAt: number;
    activeHypotheses: string[];   // hypothesis IDs currently being tested
    pendingApprovals: string[];   // hypothesis IDs awaiting human sign-off
    performanceTrend: 'improving' | 'stable' | 'declining' | 'unknown';
    trendBasis: string;           // human-readable reason for the trend assessment
    weekSummary: string;          // one-paragraph synthesis for Friday memo
    recentMetrics: AgentRunMetrics; // last run's key numbers
    nextHypothesis?: string;      // what agent plans to test next
}

// ─── Run Records ─────────────────────────────────────────────────────────────

export async function recordAgentRun(
    input: AgentRunRecord,
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const db = getAdminFirestore();
        const ref = await db.collection(PERF_LOGS_COLLECTION).add({
            ...input,
            createdAt: Date.now(),
        });
        return { success: true, id: ref.id };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.warn('[AgentPerf] recordAgentRun failed', { agentId: input.agentId, error: msg });
        return { success: false, error: msg };
    }
}

export async function getAgentRunHistory(
    agentId: string,
    domain: string,
    limit = 8,
): Promise<AgentRunRecord[]> {
    try {
        const db = getAdminFirestore();
        const snap = await db.collection(PERF_LOGS_COLLECTION)
            .where('agentId', '==', agentId)
            .where('domain', '==', domain)
            .orderBy('runAt', 'desc')
            .limit(limit)
            .get();
        return snap.docs.map(d => d.data() as AgentRunRecord);
    } catch (e) {
        logger.warn('[AgentPerf] getAgentRunHistory failed', { agentId, domain, error: String(e) });
        return [];
    }
}

// ─── Learning Docs ────────────────────────────────────────────────────────────

function learningDocId(agentId: string, domain: string) {
    return `${agentId}__${domain}`;
}

export async function upsertAgentLearningDoc(
    agentId: string,
    domain: string,
    update: Partial<Omit<AgentLearningDoc, 'agentId' | 'domain' | 'updatedAt'>>,
): Promise<void> {
    try {
        const db = getAdminFirestore();
        const docId = learningDocId(agentId, domain);
        await db.collection(LEARNING_DOCS_COLLECTION).doc(docId).set(
            { agentId, domain, updatedAt: Date.now(), ...update },
            { merge: true },
        );
    } catch (e) {
        logger.warn('[AgentPerf] upsertAgentLearningDoc failed', { agentId, domain, error: String(e) });
    }
}

export async function getAgentLearningDoc(
    agentId: string,
    domain: string,
): Promise<AgentLearningDoc | null> {
    try {
        const db = getAdminFirestore();
        const snap = await db.collection(LEARNING_DOCS_COLLECTION)
            .doc(learningDocId(agentId, domain))
            .get();
        return snap.exists ? (snap.data() as AgentLearningDoc) : null;
    } catch (e) {
        logger.warn('[AgentPerf] getAgentLearningDoc failed', { agentId, domain, error: String(e) });
        return null;
    }
}

export async function getAllAgentLearningDocs(): Promise<AgentLearningDoc[]> {
    try {
        const db = getAdminFirestore();
        const snap = await db.collection(LEARNING_DOCS_COLLECTION)
            .orderBy('updatedAt', 'desc')
            .limit(100)
            .get();
        return snap.docs.map(d => d.data() as AgentLearningDoc);
    } catch (e) {
        logger.warn('[AgentPerf] getAllAgentLearningDocs failed', { error: String(e) });
        return [];
    }
}

// ─── Hypotheses ──────────────────────────────────────────────────────────────

export async function createHypothesis(
    input: Omit<Hypothesis, 'id' | 'status' | 'createdAt'>,
): Promise<{ id: string }> {
    const db = getAdminFirestore();
    const ref = await db.collection('agent_hypotheses').add({
        ...input,
        status: 'pending_approval',
        createdAt: Date.now(),
    });
    await upsertAgentLearningDoc(input.agentId, input.domain, {
        pendingApprovals: [ref.id],
    });
    return { id: ref.id };
}

export async function resolveHypothesis(
    hypothesisId: string,
    winner: string,
    notes: string,
): Promise<void> {
    const db = getAdminFirestore();
    await db.collection('agent_hypotheses').doc(hypothesisId).update({
        status: 'concluded',
        winnerVariant: winner,
        conclusionNotes: notes,
        concludedAt: Date.now(),
    });
}

// ─── Slack Approval Gate ─────────────────────────────────────────────────────

const APPROVAL_CHANNEL = (process.env.SLACK_CHANNEL_AGENT_APPROVALS || 'marty-approvals').replace(/^#/, '');

export interface ApprovalRequest {
    agentId: string;
    domain: string;
    title: string;
    description: string;
    variants: { id: string; label: string; preview: string }[];
    hypothesisId?: string;
    /** ISO date string for when the campaign is scheduled to send */
    scheduledFor?: string;
    approvalTimeoutMs?: number; // default 4h
}

export interface ApprovalResult {
    approved: boolean;
    selectedVariant?: string;
    feedback?: string;
    timedOut?: boolean;
}

/**
 * Posts a Slack approval card with variant previews and waits up to approvalTimeoutMs.
 * If Marty doesn't respond, defaults to variant 'A' (first variant) and proceeds.
 */
export async function requestSlackApproval(
    input: ApprovalRequest,
): Promise<ApprovalResult> {
    const timeoutMs = input.approvalTimeoutMs ?? 4 * 60 * 60 * 1000; // 4h default
    try {
        const variantBlocks = input.variants.map(v => ({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Variant ${v.id}: ${v.label}*\n${v.preview.slice(0, 300)}`,
            },
        }));

        const blocks: Record<string, unknown>[] = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: [
                        `:test_tube: *${input.title}* — A/B approval needed`,
                        `*Agent:* ${input.agentId} | *Domain:* ${input.domain}`,
                        input.description,
                        input.scheduledFor ? `*Scheduled for:* ${input.scheduledFor}` : '',
                        `_Reply with the variant ID (A, B, control) to approve. No reply = ${input.variants[0]?.id ?? 'A'} proceeds after ${Math.round(timeoutMs / 3600000)}h._`,
                    ].filter(Boolean).join('\n'),
                },
            },
            ...variantBlocks,
            {
                type: 'actions',
                elements: input.variants.map(v => ({
                    type: 'button',
                    text: { type: 'plain_text', text: `Use ${v.id}` },
                    value: `approve_variant:${input.agentId}:${v.id}`,
                    action_id: `approve_variant_${v.id.toLowerCase()}`,
                    style: v.id === input.variants[0]?.id ? 'primary' : undefined,
                })).concat([{
                    type: 'button',
                    text: { type: 'plain_text', text: 'Cancel send' },
                    value: `cancel_send:${input.agentId}`,
                    action_id: 'cancel_send',
                    style: 'danger',
                }]),
            },
        ];

        const channelId = await ensureElroyChannel(APPROVAL_CHANNEL);
        const fallback = `${input.agentId} A/B test needs approval: ${input.title}`;
        const result = await elroySlackService.postMessage(channelId, fallback, blocks);

        if (!result.sent) {
            logger.warn('[AgentPerf] Slack approval post failed, proceeding with default', {
                agentId: input.agentId,
                error: result.error,
            });
            return { approved: true, selectedVariant: input.variants[0]?.id, timedOut: true };
        }

        // Store pending approval in Firestore for webhook to resolve
        const db = getAdminFirestore();
        const approvalRef = await db.collection('agent_approvals').add({
            agentId: input.agentId,
            domain: input.domain,
            title: input.title,
            hypothesisId: input.hypothesisId ?? null,
            slackTs: result.ts,
            slackChannel: result.channel,
            status: 'pending',
            defaultVariant: input.variants[0]?.id ?? 'A',
            createdAt: Date.now(),
            expiresAt: Date.now() + timeoutMs,
        });

        // Poll for resolution (simple poll approach — approval webhook updates the doc)
        const pollIntervalMs = 15_000;
        const pollStart = Date.now();
        while (Date.now() - pollStart < timeoutMs) {
            await new Promise(res => setTimeout(res, pollIntervalMs));
            const approvalDoc = await db.collection('agent_approvals').doc(approvalRef.id).get();
            const data = approvalDoc.data();
            if (data?.status === 'approved') {
                return { approved: true, selectedVariant: data.selectedVariant, feedback: data.feedback };
            }
            if (data?.status === 'cancelled') {
                return { approved: false, feedback: data.feedback };
            }
        }

        // Timeout — proceed with default variant
        await db.collection('agent_approvals').doc(approvalRef.id).update({ status: 'timed_out' });
        return { approved: true, selectedVariant: input.variants[0]?.id, timedOut: true };
    } catch (e) {
        logger.warn('[AgentPerf] requestSlackApproval failed, proceeding', {
            agentId: input.agentId,
            error: String(e),
        });
        return { approved: true, selectedVariant: input.variants[0]?.id, timedOut: true };
    }
}


// ─── Trend Computation ────────────────────────────────────────────────────────

/**
 * Derives a simple trend from the last N run records for a given numeric metric.
 * Returns 'improving' if the last run is >= median of prior runs, etc.
 */
export function computeTrend(
    history: AgentRunRecord[],
    metricKey: string,
): 'improving' | 'stable' | 'declining' | 'unknown' {
    if (history.length < 2) return 'unknown';
    const values = history
        .map(r => r.metrics[metricKey])
        .filter((v): v is number => typeof v === 'number');
    if (values.length < 2) return 'unknown';

    const latest = values[0];
    const prior = values.slice(1);
    const avg = prior.reduce((a, b) => a + b, 0) / prior.length;

    if (latest > avg * 1.05) return 'improving';
    if (latest < avg * 0.95) return 'declining';
    return 'stable';
}
