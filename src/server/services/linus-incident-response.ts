import { logger } from '@/lib/logger';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';

const DEFAULT_ANALYSIS_HEADER = '🖥️ Linus — Incident Report';
const DEFAULT_BLOCKED_HEADER = '⚠️ Linus Incident Response Blocked';

export interface DispatchLinusIncidentResponseRequest {
    prompt: string;
    source: 'auto-escalator' | 'support-ticket' | 'server-error';
    incidentId?: string | null;
    incidentLink?: string;
    maxIterations?: number;
    analysisHeader?: string;
    analysisFallbackPrefix?: string;
    channelName?: string;
    threadTs?: string;
}

export interface DispatchLinusIncidentResponseResult {
    status: 'posted' | 'blocked' | 'failed';
    content: string | null;
    decision?: string;
    model?: string;
    channelId?: string | null;
    channelName?: string | null;
    threadTs?: string | null;
    delivery?: 'channel' | 'thread' | 'webhook' | 'none';
}

function truncateSlackText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, maxLength - 3)}...`;
}

async function postBlockedIncidentResponse(
    request: DispatchLinusIncidentResponseRequest,
    message: string,
): Promise<DispatchLinusIncidentResponseResult> {
    const slackResult = await postLinusIncidentSlack({
        source: request.source,
        incidentId: request.incidentId ?? null,
        fallbackText: `⚠️ Linus incident response blocked — ${request.incidentId ?? 'no incident ID'}`,
        channelName: request.channelName,
        threadTs: request.threadTs,
        blocks: [
            {
                type: 'header',
                text: { type: 'plain_text', text: DEFAULT_BLOCKED_HEADER, emoji: true },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `Linus could not complete the automated repair/report cycle.\n\n*Error*\n\`${truncateSlackText(message, 400)}\`\n\nA human should take over from here.`,
                },
            },
        ],
    });

    return {
        status: 'blocked',
        content: message,
        channelId: slackResult.channelId,
        channelName: slackResult.channelName,
        threadTs: request.threadTs ?? slackResult.ts,
        delivery: slackResult.delivery,
    };
}

export async function dispatchLinusIncidentResponse(
    request: DispatchLinusIncidentResponseRequest,
): Promise<DispatchLinusIncidentResponseResult> {
    try {
        const { runLinus } = await import('@/server/agents/linus');

        logger.info('[LinusIncidentResponse] Dispatching Linus', {
            source: request.source,
            incidentId: request.incidentId ?? null,
            maxIterations: request.maxIterations ?? 10,
        });

        const result = await runLinus({
            prompt: request.prompt,
            maxIterations: request.maxIterations ?? 10,
            context: { userId: request.source },
        });

        if (!result.content) {
            logger.warn('[LinusIncidentResponse] Linus returned empty content', {
                source: request.source,
                incidentId: request.incidentId ?? null,
            });
            return postBlockedIncidentResponse(request, 'Linus returned an empty response.');
        }

        const incidentLink = request.incidentLink || (request.incidentId ? `Incident \`${request.incidentId}\`` : 'Incident response');

        const slackResult = await postLinusIncidentSlack({
            source: request.source,
            incidentId: request.incidentId ?? null,
            fallbackText: `${request.analysisFallbackPrefix || '🖥️ Linus incident report'} — ${request.incidentId ?? 'no incident ID'}`,
            channelName: request.channelName,
            threadTs: request.threadTs,
            blocks: [
                {
                    type: 'header',
                    text: { type: 'plain_text', text: request.analysisHeader || DEFAULT_ANALYSIS_HEADER, emoji: true },
                },
                {
                    type: 'section',
                    text: { type: 'mrkdwn', text: truncateSlackText(result.content, 2_900) },
                },
                {
                    type: 'context',
                    elements: [{ type: 'mrkdwn', text: incidentLink }],
                },
            ],
        });

        logger.info('[LinusIncidentResponse] Linus report posted to Slack', {
            source: request.source,
            incidentId: request.incidentId ?? null,
            decision: result.decision,
            model: result.model,
        });

        return {
            status: 'posted',
            content: result.content,
            decision: result.decision,
            model: result.model,
            channelId: slackResult.channelId,
            channelName: slackResult.channelName,
            threadTs: request.threadTs ?? slackResult.ts,
            delivery: slackResult.delivery,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        logger.error('[LinusIncidentResponse] Linus dispatch failed', {
            source: request.source,
            incidentId: request.incidentId ?? null,
            error: message,
        });

        return postBlockedIncidentResponse(request, message);
    }
}
