/**
 * Deploy Health Watchdog Cron Endpoint
 * Alerts #linus-deployments when Firebase App Hosting builds stall (RUNNING > 25 min).
 * Does NOT auto-cancel — alerts humans/Linus to decide.
 *
 * Cloud Scheduler:
 *   Schedule: "* /20 * * * *"  (every 20 minutes)
 *   Name: deploy-watchdog
 *   gcloud scheduler jobs create http deploy-watchdog \
 *     --schedule="* /20 * * * *" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/deploy-watchdog" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getRecentBuildStatuses } from '@/server/services/firebase-build-monitor';
import { slackService } from '@/server/services/communications/slack';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const STALLED_THRESHOLD_MIN = 25;
const LINUS_DEPLOYMENTS_CHANNEL = 'linus-deployments';

function verifyCronSecret(bearerToken: string): boolean {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        logger.error('[DeployWatchdog] CRON_SECRET not configured');
        return false;
    }
    return bearerToken === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();

    try {
        const authHeader = request.headers.get('authorization') ?? '';
        if (!verifyCronSecret(authHeader)) {
            logger.warn('[DeployWatchdog] Unauthorized request');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check for builds that have been in building/pending for > 25 minutes
        const recentBuilds = await getRecentBuildStatuses(10);
        const now = Date.now();

        const stalledBuilds = recentBuilds.filter(build => {
            if (build.status !== 'building' && build.status !== 'pending') {
                return false;
            }
            const ageMin = (now - build.timestamp.getTime()) / 60_000;
            return ageMin > STALLED_THRESHOLD_MIN;
        });

        if (stalledBuilds.length === 0) {
            logger.info('[DeployWatchdog] No stalled builds detected');
            return NextResponse.json({
                success: true,
                stalled: 0,
                durationMs: Date.now() - startTime,
                timestamp: new Date().toISOString(),
            });
        }

        // Alert for each stalled build
        let alertsSent = 0;
        for (const build of stalledBuilds) {
            const durationMin = Math.round((now - build.timestamp.getTime()) / 60_000);
            const shortHash = build.commitHash.slice(0, 8);

            const text = [
                `⚠️ Stuck build detected: \`${shortHash}\``,
                `Running for ${durationMin} min — likely infra timeout.`,
                `Cancel: \`node scripts/firebase-apphosting.mjs cancel ${build.commitHash}\``,
            ].join('\n');

            const result = await slackService.postMessage(LINUS_DEPLOYMENTS_CHANNEL, text);

            if (result.sent) {
                alertsSent++;
                logger.info('[DeployWatchdog] Alert sent for stalled build', {
                    commitHash: shortHash,
                    durationMin,
                });
            } else {
                logger.warn('[DeployWatchdog] Failed to send Slack alert', {
                    commitHash: shortHash,
                    error: result.error ?? 'unknown',
                });
            }
        }

        return NextResponse.json({
            success: true,
            stalled: stalledBuilds.length,
            alertsSent,
            durationMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        });
    } catch (error: unknown) {
        logger.error('[DeployWatchdog] Failed to execute', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            {
                success: false,
                error: 'Deploy watchdog failed',
                durationMs: Date.now() - startTime,
            },
            { status: 500 },
        );
    }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    return POST(req);
}
