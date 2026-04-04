/**
 * Linus Weekly Backlog Brief Cron Endpoint
 * Every Monday at 8 AM EST: reads the engineering backlog, generates a prioritized
 * week-ahead summary via GLM, and posts it to #linus-deployments.
 *
 * Cloud Scheduler:
 *   Schedule: "0 13 * * 1"  (8 AM EST = 1 PM UTC, Mondays)
 *   Name: linus-backlog-brief
 *   gcloud scheduler jobs create http linus-backlog-brief \
 *     --schedule="0 13 * * 1" --time-zone="UTC" \
 *     --uri="https://<domain>/api/cron/linus-backlog-brief" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { callGLM, GLM_MODELS } from '@/ai/glm';
import { slackService } from '@/server/services/communications/slack';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const LINUS_DEPLOYMENTS_CHANNEL = 'linus-deployments';

const PRIORITY_ORDER: Record<string, number> = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
};

interface BacklogItem {
    id: string;
    title: string;
    status: string;
    priority: string;
    description?: string;
    area?: string;
    owner?: string;
}

interface BacklogFile {
    features: BacklogItem[];
}

function verifyCronSecret(bearerToken: string): boolean {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        logger.error('[LinusBacklogBrief] CRON_SECRET not configured');
        return false;
    }
    return bearerToken === `Bearer ${cronSecret}`;
}

function loadPendingItems(limit: number): BacklogItem[] {
    const backlogPath = path.join(process.cwd(), 'dev', 'backlog.json');
    const raw = fs.readFileSync(backlogPath, 'utf-8');
    const data = JSON.parse(raw) as BacklogFile;

    const pending = (data.features ?? []).filter(item => item.status === 'pending');

    pending.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 99;
        const pb = PRIORITY_ORDER[b.priority] ?? 99;
        return pa - pb;
    });

    return pending.slice(0, limit);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();

    try {
        const authHeader = request.headers.get('authorization') ?? '';
        if (!verifyCronSecret(authHeader)) {
            logger.warn('[LinusBacklogBrief] Unauthorized request');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Read top-5 pending backlog items sorted by priority
        const topItems = loadPendingItems(5);

        if (topItems.length === 0) {
            logger.info('[LinusBacklogBrief] No pending backlog items found');
            return NextResponse.json({
                success: true,
                itemsReviewed: 0,
                posted: false,
                durationMs: Date.now() - startTime,
                timestamp: new Date().toISOString(),
            });
        }

        logger.info('[LinusBacklogBrief] Generating brief for pending items', {
            count: topItems.length,
        });

        // Generate brief via GLM
        const brief = await callGLM({
            model: GLM_MODELS.STANDARD,
            systemPrompt:
                'You are Linus, CTO of BakedBot. Summarize the top engineering priorities for this week in 3-5 concise bullet points. Focus on impact and urgency. Be direct and technical.',
            userMessage: JSON.stringify(topItems, null, 2),
            maxTokens: 512,
        });

        if (!brief || brief.trim().length === 0) {
            logger.warn('[LinusBacklogBrief] GLM returned empty brief');
            return NextResponse.json(
                { success: false, error: 'GLM returned empty response', itemsReviewed: topItems.length, posted: false },
                { status: 500 },
            );
        }

        // Post to #linus-deployments
        const slackText = `📋 *Linus — Weekly Backlog Brief*\n${brief.trim()}`;
        const result = await slackService.postMessage(LINUS_DEPLOYMENTS_CHANNEL, slackText);

        if (!result.sent) {
            logger.warn('[LinusBacklogBrief] Failed to post Slack brief', {
                error: result.error ?? 'unknown',
            });
        } else {
            logger.info('[LinusBacklogBrief] Weekly brief posted to Slack', {
                itemsReviewed: topItems.length,
                channel: LINUS_DEPLOYMENTS_CHANNEL,
            });
        }

        return NextResponse.json({
            success: true,
            itemsReviewed: topItems.length,
            posted: result.sent,
            durationMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        });
    } catch (error: unknown) {
        logger.error('[LinusBacklogBrief] Failed to execute', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            {
                success: false,
                error: 'Linus backlog brief failed',
                durationMs: Date.now() - startTime,
            },
            { status: 500 },
        );
    }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    return POST(req);
}
