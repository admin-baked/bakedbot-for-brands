import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { elroySlackService } from '@/server/services/communications/slack';

export const AGENT_LEARNING_RESULTS = ['success', 'failure', 'pending', 'partial'] as const;
export type AgentLearningResult = (typeof AGENT_LEARNING_RESULTS)[number];

const DEFAULT_FAILURE_CHANNEL = (process.env.SLACK_CHANNEL_AGENT_FAILURES || 'agent-learning-loop').replace(/^#/, '');
const AGENT_LEARNING_COLLECTION = 'agent_learning_log';

export interface AgentLearningLogInput {
    agentId: string;
    action: string;
    result: AgentLearningResult;
    category: string;
    reason?: string | null;
    nextStep?: string | null;
    orgId?: string | null;
    brandId?: string | null;
    metadata?: Record<string, unknown>;
}

export interface AgentLearningSearchInput {
    agentId?: string;
    query: string;
    category?: string;
    limit?: number;
    legacyCollection?: string;
}

export interface AgentFailureNotificationInput {
    agentId: string;
    role?: string;
    problem: string;
    context: string;
    proposedFix?: string | null;
    category?: string;
    severity?: 'low' | 'medium' | 'high';
    orgId?: string | null;
    brandId?: string | null;
    channelName?: string;
    metadata?: Record<string, unknown>;
}

function normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function safeErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function buildSearchText(entry: Record<string, unknown>): string {
    return [
        entry.agentId,
        entry.action,
        entry.reason,
        entry.nextStep,
        entry.problem,
        entry.context,
        entry.proposedFix,
        entry.category,
    ]
        .map(value => normalizeText(value))
        .join(' ')
        .toLowerCase();
}

async function ensureElroyChannel(channelName: string): Promise<string> {
    const normalized = channelName.replace(/^#/, '');

    const existing = await elroySlackService.findChannelByName(normalized);
    if (existing?.id) {
        await elroySlackService.joinChannel(existing.id);
        return existing.id;
    }

    const created = await elroySlackService.createChannel(normalized);
    if (created?.id) {
        await elroySlackService.joinChannel(created.id);
        return created.id;
    }

    return normalized;
}

async function postFailureToSlack(
    channelName: string,
    fallbackText: string,
    blocks: Record<string, unknown>[],
): Promise<{ sent: boolean; channel: string | null; ts: string | null; error?: string }> {
    try {
        const channelId = await ensureElroyChannel(channelName);
        const result = await elroySlackService.postMessage(channelId, fallbackText, blocks);

        if (!result.sent) {
            return {
                sent: false,
                channel: null,
                ts: null,
                error: result.error || 'Slack delivery failed',
            };
        }

        return {
            sent: true,
            channel: String(result.channel || channelId),
            ts: typeof result.ts === 'string' ? result.ts : null,
        };
    } catch (error) {
        return {
            sent: false,
            channel: null,
            ts: null,
            error: safeErrorMessage(error),
        };
    }
}

export async function logAgentLearning(input: AgentLearningLogInput): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const db = getAdminFirestore();
        const timestamp = Date.now();
        const ref = await db.collection(AGENT_LEARNING_COLLECTION).add({
            agentId: input.agentId,
            action: normalizeText(input.action),
            result: input.result,
            reason: input.reason ? normalizeText(input.reason) : null,
            nextStep: input.nextStep ? normalizeText(input.nextStep) : null,
            category: normalizeText(input.category) || 'general',
            orgId: input.orgId || null,
            brandId: input.brandId || null,
            metadata: input.metadata || null,
            timestamp,
            createdAt: timestamp,
        });

        return { success: true, id: ref.id };
    } catch (error) {
        logger.warn('[AgentLearningLoop] Failed to write learning log', {
            agentId: input.agentId,
            error: safeErrorMessage(error),
        });
        return { success: false, error: safeErrorMessage(error) };
    }
}

export async function searchAgentLearning(input: AgentLearningSearchInput): Promise<{ success: boolean; logs: Array<Record<string, unknown>>; count: number; error?: string }> {
    const limit = Math.max(1, Math.min(input.limit ?? 8, 25));
    const searchTerm = normalizeText(input.query).toLowerCase();

    if (!searchTerm) {
        return { success: true, logs: [], count: 0 };
    }

    try {
        const db = getAdminFirestore();
        const fetchLimit = Math.max(limit * 4, 20);

        let query: FirebaseFirestore.Query = db.collection(AGENT_LEARNING_COLLECTION);
        if (input.agentId) {
            query = query.where('agentId', '==', input.agentId);
        }
        if (input.category) {
            query = query.where('category', '==', input.category);
        }
        query = query.orderBy('timestamp', 'desc').limit(fetchLimit);

        const snap = await query.get();
        const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Array<Record<string, unknown>>;

        if (input.legacyCollection) {
            try {
                let legacyQuery: FirebaseFirestore.Query = db.collection(input.legacyCollection);
                if (input.category) {
                    legacyQuery = legacyQuery.where('category', '==', input.category);
                }
                legacyQuery = legacyQuery.orderBy('timestamp', 'desc').limit(fetchLimit);

                const legacySnap = await legacyQuery.get();
                logs.push(
                    ...legacySnap.docs.map(doc => ({
                        id: doc.id,
                        agentId: input.agentId || 'legacy',
                        ...doc.data(),
                    })) as Array<Record<string, unknown>>
                );
            } catch (error) {
                logger.debug('[AgentLearningLoop] Legacy search skipped', {
                    collection: input.legacyCollection,
                    error: safeErrorMessage(error),
                });
            }
        }

        const filtered = logs
            .filter(log => buildSearchText(log).includes(searchTerm))
            .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
            .slice(0, limit);

        return {
            success: true,
            logs: filtered,
            count: filtered.length,
        };
    } catch (error) {
        logger.warn('[AgentLearningLoop] Failed to search learning logs', {
            agentId: input.agentId || 'all',
            error: safeErrorMessage(error),
        });
        return {
            success: false,
            logs: [],
            count: 0,
            error: safeErrorMessage(error),
        };
    }
}

export async function notifyAgentFailure(input: AgentFailureNotificationInput): Promise<{ success: boolean; channel: string | null; ts: string | null; error?: string }> {
    const channelName = (input.channelName || DEFAULT_FAILURE_CHANNEL).replace(/^#/, '');
    const agentLabel = input.role ? `${input.agentId} (${input.role})` : input.agentId;
    const severity = input.severity || 'medium';
    const fallbackText = `${agentLabel} hit a ${severity} failure: ${normalizeText(input.problem).slice(0, 120)}`;

    const blocks: Record<string, unknown>[] = [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: [
                    ':rotating_light: *Agent failure escalation via Uncle Elroy*',
                    `*Agent:* ${agentLabel}`,
                    `*Severity:* ${severity}`,
                    `*What failed:* ${normalizeText(input.problem) || 'Unknown failure'}`,
                    `*Context:* ${normalizeText(input.context) || 'No context provided'}`,
                    input.proposedFix ? `*Proposed fix:* ${normalizeText(input.proposedFix)}` : '*Proposed fix:* Need human guidance.',
                    '_Reply in this thread with the fix, missing data, approval, or next step so the loop can learn._',
                ].join('\n'),
            },
        },
    ];

    const postResult = await postFailureToSlack(channelName, fallbackText, blocks);

    const learningResult = await logAgentLearning({
        agentId: input.agentId,
        action: normalizeText(input.context) || 'failure escalation',
        result: 'failure',
        reason: normalizeText(input.problem) || 'Unknown failure',
        nextStep: input.proposedFix ? normalizeText(input.proposedFix) : 'Await human guidance in Slack thread.',
        category: normalizeText(input.category) || 'problem',
        orgId: input.orgId || null,
        brandId: input.brandId || null,
        metadata: {
            severity,
            slackChannel: postResult.channel,
            slackTs: postResult.ts,
            ...(input.metadata || {}),
        },
    });

    if (!postResult.sent) {
        logger.warn('[AgentLearningLoop] Failed to notify Uncle Elroy Slack channel', {
            agentId: input.agentId,
            channelName,
            error: postResult.error,
            learningLogged: learningResult.success,
        });
        return {
            success: false,
            channel: postResult.channel,
            ts: postResult.ts,
            error: postResult.error,
        };
    }

    return {
        success: true,
        channel: postResult.channel,
        ts: postResult.ts,
    };
}

export interface LearningLoopToolContext {
    agentId: string;
    role?: string;
    orgId?: string | null;
    brandId?: string | null;
    defaultCategory?: string;
    failureChannelName?: string;
    legacyCollection?: string;
}

export function makeLearningLoopToolsImpl(context: LearningLoopToolContext) {
    return {
        async learning_log(
            action: string,
            result: AgentLearningResult,
            reason?: string,
            nextStep?: string,
            category?: string,
        ) {
            return logAgentLearning({
                agentId: context.agentId,
                action,
                result,
                reason,
                nextStep,
                category: category || context.defaultCategory || 'general',
                orgId: context.orgId || null,
                brandId: context.brandId || null,
            });
        },

        async learning_search(query: string, category?: string, limit?: number) {
            return searchAgentLearning({
                agentId: context.agentId,
                query,
                category,
                limit,
                legacyCollection: context.legacyCollection,
            });
        },

        async notify_agent_problem(
            problem: string,
            runContext: string,
            proposedFix?: string,
            severity?: 'low' | 'medium' | 'high',
            category?: string,
        ) {
            return notifyAgentFailure({
                agentId: context.agentId,
                role: context.role,
                problem,
                context: runContext,
                proposedFix,
                severity,
                category: category || context.defaultCategory || 'problem',
                orgId: context.orgId || null,
                brandId: context.brandId || null,
                channelName: context.failureChannelName,
            });
        },
    };
}
