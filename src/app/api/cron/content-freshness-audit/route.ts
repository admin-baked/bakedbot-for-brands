/**
 * Content Freshness Audit Cron Endpoint
 *
 * Runs daily to score every customer-facing content surface and report staleness.
 * Posts a summary to Slack #ops and returns the full report as JSON.
 *
 * Schedule: Daily at 7:00 AM ET
 *
 * Deploy cron job:
 * gcloud scheduler jobs create http content-freshness-audit \
 *   --schedule="0 11 * * *" \
 *   --uri="https://bakedbot-for-brands--bakedbot-ai.us-central1.hosted.app/api/cron/content-freshness-audit" \
 *   --http-method=POST \
 *   --headers="Authorization=Bearer CRON_SECRET,Content-Type=application/json" \
 *   --location=us-central1 \
 *   --time-zone="America/New_York"
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { runContentFreshnessAudit } from '@/server/services/content-freshness-audit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorizeCron(req: NextRequest): NextResponse | null {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        logger.error('[ContentFreshnessAudit Cron] CRON_SECRET is not configured');
        return NextResponse.json(
            { success: false, error: 'Server misconfiguration' },
            { status: 500 }
        );
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    return null;
}

async function handleRequest(req: NextRequest) {
    const authError = authorizeCron(req);
    if (authError) return authError;

    const startTime = Date.now();

    try {
        logger.info('[ContentFreshnessAudit Cron] Starting daily content freshness audit');

        const result = await runContentFreshnessAudit();

        // Post to Slack if there are action items
        if (result.report.actionItems.length > 0) {
            try {
                const slackWebhook = process.env.SLACK_OPS_WEBHOOK;
                if (slackWebhook) {
                    await fetch(slackWebhook, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: result.slackMessage }),
                    });
                }
            } catch (slackError) {
                logger.warn('[ContentFreshnessAudit Cron] Failed to post to Slack', {
                    error: slackError instanceof Error ? slackError.message : String(slackError),
                });
            }
        }

        const durationMs = Date.now() - startTime;

        logger.info('[ContentFreshnessAudit Cron] Audit complete', {
            totalPages: result.report.totalPages,
            actionItems: result.report.actionItems.length,
            durationMs,
        });

        return NextResponse.json({
            success: true,
            summary: result.report.summary,
            totalPages: result.report.totalPages,
            actionItems: result.report.actionItems.length,
            blog: result.blog,
            durationMs,
        });
    } catch (error) {
        const durationMs = Date.now() - startTime;
        logger.error('[ContentFreshnessAudit Cron] Audit failed', {
            error: error instanceof Error ? error.message : String(error),
            durationMs,
        });

        return NextResponse.json(
            { success: false, error: 'Audit failed' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    return handleRequest(req);
}

export async function POST(req: NextRequest) {
    return handleRequest(req);
}
