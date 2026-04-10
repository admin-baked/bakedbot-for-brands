import { logger } from '@/lib/logger';
import { elroySlackService, slackService, type SlackService } from './communications/slack';

const THRIVE_PILOT_CHANNEL_NAME = 'thrive-syracuse-pilot';

export interface PilotSlackActorIdentity {
    key: 'elroy' | 'shared';
    userId?: string;
    botId?: string;
}

export interface PilotSlackMessage {
    ts: string;
    text: string;
    user?: string;
    botId?: string;
    subtype?: string;
}

export interface PilotCleanupCandidate extends PilotSlackMessage {
    actorKey: PilotSlackActorIdentity['key'];
}

export interface ThrivePilotCleanupResult {
    ok: boolean;
    dryRun: boolean;
    channelId?: string;
    channelName: string;
    scannedMessages: number;
    candidateMessages: number;
    deletedMessages: number;
    byActor: Record<string, number>;
    sample: Array<{ ts: string; actorKey: string; text: string }>;
    warnings: string[];
}

export function isPilotCleanupCandidate(
    message: PilotSlackMessage,
    actor: PilotSlackActorIdentity,
    beforeTs?: string
): boolean {
    if (!message.ts) return false;
    if (beforeTs && Number(message.ts) >= Number(beforeTs)) return false;
    if (message.subtype === 'message_deleted') return false;

    if (actor.userId && message.user === actor.userId) {
        return true;
    }

    if (actor.botId && message.botId === actor.botId) {
        return true;
    }

    return false;
}

export function buildPilotCleanupPlan(
    messages: PilotSlackMessage[],
    actors: PilotSlackActorIdentity[],
    beforeTs?: string
): PilotCleanupCandidate[] {
    const planned = new Map<string, PilotCleanupCandidate>();

    for (const actor of actors) {
        for (const message of messages) {
            if (!isPilotCleanupCandidate(message, actor, beforeTs)) {
                continue;
            }

            if (!planned.has(message.ts)) {
                planned.set(message.ts, {
                    ...message,
                    actorKey: actor.key,
                });
            }
        }
    }

    return [...planned.values()].sort((left, right) => Number(left.ts) - Number(right.ts));
}

async function resolveChannelId(): Promise<{ channelId?: string; warnings: string[] }> {
    const warnings: string[] = [];
    const resolvedByElroy = await elroySlackService.findChannelByName(THRIVE_PILOT_CHANNEL_NAME);
    if (resolvedByElroy?.id) {
        return { channelId: resolvedByElroy.id, warnings };
    }

    const resolvedByShared = await slackService.findChannelByName(THRIVE_PILOT_CHANNEL_NAME);
    if (resolvedByShared?.id) {
        return { channelId: resolvedByShared.id, warnings };
    }

    warnings.push(`Could not resolve #${THRIVE_PILOT_CHANNEL_NAME}.`);
    return { warnings };
}

async function loadActorIdentities(): Promise<{ actors: PilotSlackActorIdentity[]; warnings: string[] }> {
    const warnings: string[] = [];
    const actors: PilotSlackActorIdentity[] = [];

    const identities = await Promise.all([
        loadActorIdentity('elroy', elroySlackService),
        loadActorIdentity('shared', slackService),
    ]);

    for (const identity of identities) {
        if (!identity) continue;
        const dedupeKey = `${identity.userId || ''}:${identity.botId || ''}`;
        if (dedupeKey === ':') continue;
        if (actors.some((actor) => `${actor.userId || ''}:${actor.botId || ''}` === dedupeKey)) {
            continue;
        }
        actors.push(identity);
    }

    if (actors.length === 0) {
        warnings.push('No Slack bot identities were available for cleanup.');
    }

    return { actors, warnings };
}

async function loadActorIdentity(
    key: PilotSlackActorIdentity['key'],
    service: SlackService
): Promise<PilotSlackActorIdentity | null> {
    const auth = await service.authTest();
    if (!auth?.user_id && !auth?.bot_id) {
        return null;
    }

    return {
        key,
        userId: auth.user_id,
        botId: auth.bot_id,
    };
}

async function listPilotMessages(channelId: string, service: SlackService, maxMessages: number): Promise<PilotSlackMessage[]> {
    const messages: PilotSlackMessage[] = [];
    let cursor: string | undefined;

    do {
        const page = await service.listChannelMessages(channelId, {
            limit: Math.min(200, Math.max(1, maxMessages - messages.length)),
            cursor,
        });
        messages.push(...page.messages);
        cursor = page.nextCursor;
    } while (cursor && messages.length < maxMessages);

    return messages;
}

export async function runThrivePilotSlackCleanup(options?: {
    dryRun?: boolean;
    beforeTs?: string;
    maxMessages?: number;
}): Promise<ThrivePilotCleanupResult> {
    const dryRun = options?.dryRun !== false;
    const beforeTs = options?.beforeTs ?? `${Date.now() / 1000}`;
    const maxMessages = Math.min(Math.max(options?.maxMessages ?? 2000, 50), 5000);
    const warnings: string[] = [];

    const { channelId, warnings: channelWarnings } = await resolveChannelId();
    warnings.push(...channelWarnings);
    if (!channelId) {
        return {
            ok: false,
            dryRun,
            channelName: THRIVE_PILOT_CHANNEL_NAME,
            scannedMessages: 0,
            candidateMessages: 0,
            deletedMessages: 0,
            byActor: {},
            sample: [],
            warnings,
        };
    }

    const { actors, warnings: actorWarnings } = await loadActorIdentities();
    warnings.push(...actorWarnings);

    const historyService = actors.some((actor) => actor.key === 'elroy') ? elroySlackService : slackService;
    const messages = await listPilotMessages(channelId, historyService, maxMessages);
    const cleanupPlan = buildPilotCleanupPlan(messages, actors, beforeTs);
    const byActor = cleanupPlan.reduce<Record<string, number>>((acc, message) => {
        acc[message.actorKey] = (acc[message.actorKey] || 0) + 1;
        return acc;
    }, {});

    let deletedMessages = 0;
    if (!dryRun) {
        for (const candidate of cleanupPlan) {
            const service = candidate.actorKey === 'elroy' ? elroySlackService : slackService;
            const result = await service.deleteMessage(channelId, candidate.ts);
            if (result.deleted) {
                deletedMessages += 1;
            } else if (result.error) {
                warnings.push(`Delete failed for ${candidate.ts}: ${result.error}`);
            }
        }
    }

    logger.info('[SlackPilotCleanup] Completed', {
        channelId,
        dryRun,
        scannedMessages: messages.length,
        candidateMessages: cleanupPlan.length,
        deletedMessages,
    });

    return {
        ok: true,
        dryRun,
        channelId,
        channelName: THRIVE_PILOT_CHANNEL_NAME,
        scannedMessages: messages.length,
        candidateMessages: cleanupPlan.length,
        deletedMessages,
        byActor,
        sample: cleanupPlan.slice(0, 20).map((message) => ({
            ts: message.ts,
            actorKey: message.actorKey,
            text: message.text.slice(0, 140),
        })),
        warnings,
    };
}
