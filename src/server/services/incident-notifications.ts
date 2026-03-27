import { logger } from '@/lib/logger';
import { slackService } from '@/server/services/communications/slack';

const LINUS_INCIDENTS_CHANNEL = 'linus-incidents';
const SLACK_TIMEOUT_MS = 5_000;

export type LinusIncidentSlackBlock = Record<string, unknown>;

export interface LinusIncidentSlackMessage {
    blocks: LinusIncidentSlackBlock[];
    fallbackText: string;
    source: 'auto-escalator' | 'support-ticket';
    incidentId?: string | null;
}

function getIncidentWebhookUrl(): string | null {
    return process.env.SLACK_WEBHOOK_INCIDENTS || process.env.SLACK_WEBHOOK_URL || null;
}

async function postToIncidentChannel(message: LinusIncidentSlackMessage): Promise<boolean> {
    try {
        const channel = await slackService.findChannelByName(LINUS_INCIDENTS_CHANNEL);
        if (!channel) {
            logger.warn('[IncidentNotifications] Slack channel not found', {
                channelName: LINUS_INCIDENTS_CHANNEL,
                source: message.source,
                incidentId: message.incidentId ?? null,
            });
            return false;
        }

        await slackService.joinChannel(channel.id);

        const result = await slackService.postMessage(channel.id, message.fallbackText, message.blocks);
        if (!result.sent) {
            logger.warn('[IncidentNotifications] Slack channel post failed', {
                channelId: channel.id,
                channelName: channel.name,
                source: message.source,
                incidentId: message.incidentId ?? null,
                error: result.error ?? 'unknown_error',
            });
            return false;
        }

        logger.info('[IncidentNotifications] Slack channel post sent', {
            channelId: channel.id,
            channelName: channel.name,
            source: message.source,
            incidentId: message.incidentId ?? null,
        });
        return true;
    } catch (error) {
        logger.warn('[IncidentNotifications] Slack channel post threw', {
            channelName: LINUS_INCIDENTS_CHANNEL,
            source: message.source,
            incidentId: message.incidentId ?? null,
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}

async function postToIncidentWebhook(message: LinusIncidentSlackMessage): Promise<boolean> {
    const webhookUrl = getIncidentWebhookUrl();
    if (!webhookUrl) {
        logger.warn('[IncidentNotifications] No Slack webhook configured', {
            source: message.source,
            incidentId: message.incidentId ?? null,
        });
        return false;
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
            return false;
        }

        logger.info('[IncidentNotifications] Slack webhook sent', {
            source: message.source,
            incidentId: message.incidentId ?? null,
        });
        return true;
    } catch (error) {
        logger.error('[IncidentNotifications] Slack webhook threw', {
            source: message.source,
            incidentId: message.incidentId ?? null,
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    } finally {
        clearTimeout(timeout);
    }
}

export async function postLinusIncidentSlack(message: LinusIncidentSlackMessage): Promise<void> {
    const postedToChannel = await postToIncidentChannel(message);
    if (postedToChannel) {
        return;
    }

    await postToIncidentWebhook(message);
}
