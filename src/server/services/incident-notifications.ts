import { logger } from '@/lib/logger';
import { slackService } from '@/server/services/communications/slack';

const LINUS_INCIDENTS_CHANNEL = 'linus-incidents';
const SLACK_TIMEOUT_MS = 5_000;

export type LinusIncidentSlackBlock = Record<string, unknown>;

export interface LinusIncidentSlackMessage {
    blocks: LinusIncidentSlackBlock[];
    fallbackText: string;
    source: 'auto-escalator' | 'support-ticket' | 'server-error' | 'marty-ceo-briefing' | 'marty-meeting-reminder' | 'marty-problem-report' | 'marty-followup-cadence';
    incidentId?: string | null;
    channelName?: string;
    threadTs?: string;
    webhookUrl?: string;
}

export interface LinusIncidentSlackResult {
    sent: boolean;
    channelId: string | null;
    channelName: string | null;
    ts: string | null;
    delivery: 'channel' | 'thread' | 'webhook' | 'none';
}

function getIncidentWebhookUrl(): string | null {
    // Only use a dedicated incidents webhook — never fall back to SLACK_WEBHOOK_URL,
    // which is a customer-org webhook (e.g. #thrive-syracuse-pilot) and must not
    // receive internal BakedBot deployment/incident notifications.
    return process.env.SLACK_WEBHOOK_INCIDENTS || null;
}

function getChannelName(message: LinusIncidentSlackMessage): string {
    if (typeof message.channelName === 'string' && message.channelName.trim().length > 0) {
        return message.channelName.trim();
    }

    return LINUS_INCIDENTS_CHANNEL;
}

async function postToIncidentChannel(message: LinusIncidentSlackMessage): Promise<LinusIncidentSlackResult> {
    const channelName = getChannelName(message);

    // Resolve channel: env var ID takes priority (most reliable), then name lookup.
    // Channel IDs never change even if the channel is renamed, and bypass membership checks.
    const envChannelId = channelName === 'linus-deployments'
        ? (process.env.SLACK_CHANNEL_ID_LINUS_DEPLOYMENTS ?? null)
        : null;

    try {
        // Fast path: try posting directly by name (works for public channels with
        // chat:write.public scope, or any channel the bot is already a member of).
        // This avoids conversations.list pagination and membership gating.
        const directTarget = envChannelId ?? channelName;
        const directResult = message.threadTs
            ? await slackService.postInThread(directTarget, message.threadTs, message.fallbackText, message.blocks)
            : await slackService.postMessage(directTarget, message.fallbackText, message.blocks);

        if (directResult.sent) {
            logger.info('[IncidentNotifications] Slack channel post sent (direct)', {
                channelName,
                source: message.source,
                incidentId: message.incidentId ?? null,
                delivery: message.threadTs ? 'thread' : 'channel',
            });
            return {
                sent: true,
                channelId: String(directResult.channel || directTarget),
                channelName,
                ts: typeof directResult.ts === 'string' ? directResult.ts : null,
                delivery: message.threadTs ? 'thread' : 'channel',
            };
        }

        // Direct post failed (e.g. not_in_channel for a private channel).
        // Fall back: look up by name, join if needed, then post by ID.
        logger.warn('[IncidentNotifications] Direct post failed, trying find+join', {
            channelName,
            error: directResult.error ?? 'unknown',
            source: message.source,
        });

        const channel = await slackService.findChannelByName(channelName);
        if (!channel) {
            logger.warn('[IncidentNotifications] Slack channel not found', {
                channelName,
                source: message.source,
                incidentId: message.incidentId ?? null,
            });
            return { sent: false, channelId: null, channelName, ts: null, delivery: 'none' };
        }

        await slackService.joinChannel(channel.id);

        const result = message.threadTs
            ? await slackService.postInThread(channel.id, message.threadTs, message.fallbackText, message.blocks)
            : await slackService.postMessage(channel.id, message.fallbackText, message.blocks);

        if (!result.sent) {
            logger.warn('[IncidentNotifications] Slack channel post failed', {
                channelId: channel.id,
                channelName: channel.name,
                source: message.source,
                incidentId: message.incidentId ?? null,
                error: result.error ?? 'unknown_error',
            });
            return { sent: false, channelId: channel.id, channelName: channel.name, ts: null, delivery: 'none' };
        }

        logger.info('[IncidentNotifications] Slack channel post sent (find+join)', {
            channelId: channel.id,
            channelName: channel.name,
            source: message.source,
            incidentId: message.incidentId ?? null,
            delivery: message.threadTs ? 'thread' : 'channel',
        });
        return {
            sent: true,
            channelId: String(result.channel || channel.id),
            channelName: channel.name,
            ts: typeof result.ts === 'string' ? result.ts : null,
            delivery: message.threadTs ? 'thread' : 'channel',
        };
    } catch (error) {
        logger.warn('[IncidentNotifications] Slack channel post threw', {
            channelName,
            source: message.source,
            incidentId: message.incidentId ?? null,
            error: error instanceof Error ? error.message : String(error),
        });
        return { sent: false, channelId: null, channelName, ts: null, delivery: 'none' };
    }
}

async function postToIncidentWebhook(message: LinusIncidentSlackMessage): Promise<LinusIncidentSlackResult> {
    const webhookUrl = message.webhookUrl || getIncidentWebhookUrl();
    if (!webhookUrl) {
        logger.warn('[IncidentNotifications] No Slack webhook configured', {
            source: message.source,
            incidentId: message.incidentId ?? null,
        });
        return {
            sent: false,
            channelId: null,
            channelName: null,
            ts: null,
            delivery: 'none',
        };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: message.fallbackText,
                blocks: message.blocks,
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            logger.error('[IncidentNotifications] Slack webhook failed', {
                status: response.status,
                source: message.source,
                incidentId: message.incidentId ?? null,
            });
            return {
                sent: false,
                channelId: null,
                channelName: null,
                ts: null,
                delivery: 'none',
            };
        }

        logger.info('[IncidentNotifications] Slack webhook sent', {
            source: message.source,
            incidentId: message.incidentId ?? null,
        });
        return {
            sent: true,
            channelId: null,
            channelName: null,
            ts: null,
            delivery: 'webhook',
        };
    } catch (error) {
        logger.error('[IncidentNotifications] Slack webhook threw', {
            source: message.source,
            incidentId: message.incidentId ?? null,
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            sent: false,
            channelId: null,
            channelName: null,
            ts: null,
            delivery: 'none',
        };
    } finally {
        clearTimeout(timeout);
    }
}

export async function postLinusIncidentSlack(message: LinusIncidentSlackMessage): Promise<LinusIncidentSlackResult> {
    const postedToChannel = await postToIncidentChannel(message);
    if (postedToChannel.sent) {
        return postedToChannel;
    }

    return postToIncidentWebhook(message);
}
