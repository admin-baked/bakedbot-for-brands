/**
 * Slack Reports Cron Endpoint
 *
 * POST /api/cron/slack-reports
 *
 * Proactively generates and posts agent reports to dedicated Slack channels on a cron schedule.
 * - Daily (9 AM EST): Ezal posts competitive intelligence summary
 * - Weekly (Monday 8 AM EST): Pops posts analytics summary
 *
 * Authenticated with CRON_SECRET Bearer token.
 * Uses system identity injection for async context (same as Slack agent bridge).
 *
 * Usage:
 * ```
 * curl -X POST https://bakedbot.ai/api/cron/slack-reports \
 *   -H "Authorization: Bearer ${CRON_SECRET}" \
 *   -H "Content-Type: application/json" \
 *   -d '{"reportType":"daily_intel","orgId":"org_thrive_syracuse"}'
 * ```
 *
 * Cloud Scheduler (daily intel — 9 AM ET):
 *   Schedule: 0 9 * * *  (daily 9:00 AM ET)
 *   gcloud scheduler jobs create http slack-reports-daily \
 *     --schedule="0 9 * * *" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/slack-reports" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{\"reportType\":\"daily_intel\"}"
 *
 * Cloud Scheduler (weekly analytics — Monday 8 AM ET):
 *   Schedule: 0 8 * * 1  (weekly Monday 8:00 AM ET)
 *   gcloud scheduler jobs create http slack-reports-weekly \
 *     --schedule="0 8 * * 1" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/slack-reports" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{\"reportType\":\"weekly_analytics\"}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAgentCore } from '@/server/agents/agent-runner';
import { slackService, SlackService } from '@/server/services/communications/slack';
import { logger } from '@/lib/logger';
import type { DecodedIdToken } from 'firebase-admin/auth';

export const maxDuration = 300; // 5 minutes

// System-level identity for cron jobs (same pattern as Slack agent bridge)
const CRON_SYSTEM_USER: DecodedIdToken = {
    uid: 'cron-system',
    sub: 'cron-system',
    aud: 'bakedbot',
    auth_time: 0,
    exp: 9_999_999_999,
    iat: 0,
    iss: 'bakedbot-cron',
    firebase: { identities: {}, sign_in_provider: 'custom' } as any,
    role: 'super_user',
    orgId: 'org_bakedbot_internal',
} as unknown as DecodedIdToken;

type ReportType = 'daily_intel' | 'weekly_analytics';

interface ReportConfig {
    channel: string;
    personaId: string;
    prompt: string;
}

const REPORT_CONFIGS: Record<ReportType, ReportConfig> = {
    daily_intel: {
        channel: 'ezal-intel',
        personaId: 'ezal',
        prompt: `Generate a concise daily competitive intelligence briefing for today. Include:
1. Key competitor pricing changes
2. Menu/product updates from top competitors
3. Notable promotions or campaigns
4. Market trends worth monitoring

Format as bullet points. Keep it under 500 words.`
    },
    weekly_analytics: {
        channel: 'pops-analytics',
        personaId: 'pops',
        prompt: `Generate a concise weekly analytics summary. Include:
1. Top performing products/categories
2. Customer acquisition metrics
3. Engagement trends
4. Key recommendations

Format as bullet points. Keep it under 500 words.`
    }
};

export async function POST(request: NextRequest) {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('[CronSlackReports] Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { reportType, orgId } = body;

        if (!reportType || !REPORT_CONFIGS[reportType as ReportType]) {
            return NextResponse.json(
                { error: 'Missing or invalid reportType. Must be: daily_intel | weekly_analytics' },
                { status: 400 }
            );
        }

        const config = REPORT_CONFIGS[reportType as ReportType];
        logger.info('[CronSlackReports] Starting report generation', {
            reportType,
            channel: config.channel,
            personaId: config.personaId,
            orgId: orgId || 'default'
        });

        // Run agent with system identity (avoids requireUser() cookie lookup in async context)
        const result = await runAgentCore(
            config.prompt,
            config.personaId,
            {},
            CRON_SYSTEM_USER
        );

        if (!result.content) {
            logger.warn('[CronSlackReports] Agent returned empty content', { reportType });
            return NextResponse.json(
                { error: 'Agent returned empty content' },
                { status: 500 }
            );
        }

        // Format response as Block Kit and post to Slack channel
        const blocks = SlackService.formatAgentResponse(result.content, config.personaId);
        const fallbackText = `[${reportType.toUpperCase()}] ${result.content.slice(0, 200)}...`;

        const postResult = await slackService.postMessage(`#${config.channel}`, fallbackText, blocks);

        if (!postResult.sent) {
            logger.error('[CronSlackReports] Failed to post to Slack', {
                reportType,
                channel: config.channel,
                error: postResult.error
            });
            return NextResponse.json(
                { error: `Failed to post to #${config.channel}: ${postResult.error}` },
                { status: 500 }
            );
        }

        logger.info('[CronSlackReports] Report posted successfully', {
            reportType,
            channel: config.channel,
            ts: postResult.ts,
            contentLength: result.content.length
        });

        return NextResponse.json({
            success: true,
            reportType,
            channel: config.channel,
            ts: postResult.ts,
            personaId: config.personaId,
            contentLength: result.content.length,
            postedAt: new Date().toISOString()
        });

    } catch (error: any) {
        logger.error('[CronSlackReports] Report generation failed', {
            error: error.message
        });

        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
