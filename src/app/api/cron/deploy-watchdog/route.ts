/**
 * Deploy Health Watchdog Cron Endpoint
 * Alerts #linus-deployments when Firebase App Hosting builds stall (RUNNING > 25 min).
 * Queries Cloud Build REST API directly (gcloud CLI not available in production).
 *
 * Cloud Scheduler:
 *   Schedule: every 20 minutes
 *   Name: deploy-watchdog
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { slackService } from '@/server/services/communications/slack';
import { GoogleAuth } from 'google-auth-library';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const PROJECT_ID = 'studio-567050101-bc6e8';
const LOCATION = 'us-central1';
const STALLED_THRESHOLD_MIN = 25;
const LINUS_DEPLOYMENTS_CHANNEL = 'linus-deployments';

interface CloudBuild {
    id: string;
    status: string; // WORKING, QUEUED, SUCCESS, FAILURE, CANCELLED, TIMEOUT
    createTime: string;
    startTime?: string;
    finishTime?: string;
    tags?: string[];
    source?: {
        developerConnectConfig?: {
            revision?: string;
        };
    };
}

/** Query Cloud Build REST API for recent builds */
async function getRecentCloudBuilds(limit: number = 10): Promise<CloudBuild[]> {
    try {
        const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        const url = `https://cloudbuild.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/builds?pageSize=${limit}`;
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token.token}`,
                Accept: 'application/json',
            },
            signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) {
            logger.error('[DeployWatchdog] Cloud Build API error', { status: res.status, body: await res.text() });
            return [];
        }

        const data = await res.json() as { builds?: CloudBuild[] };
        return data.builds || [];
    } catch (err) {
        logger.error('[DeployWatchdog] Failed to query Cloud Build API', {
            error: err instanceof Error ? err.message : String(err),
        });
        return [];
    }
}

/** Extract short commit hash from build tags or source */
function getCommitHash(build: CloudBuild): string {
    // Tags contain the full SHA
    const shaTag = build.tags?.find(t => /^[0-9a-f]{40}$/.test(t));
    if (shaTag) return shaTag.slice(0, 8);
    // Fallback to source revision
    const rev = build.source?.developerConnectConfig?.revision;
    if (rev) return rev.slice(0, 8);
    return build.id.slice(0, 8);
}

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

        const builds = await getRecentCloudBuilds(10);
        const now = Date.now();

        // WORKING/QUEUED = in-progress builds
        const stalledBuilds = builds.filter(build => {
            if (build.status !== 'WORKING' && build.status !== 'QUEUED') return false;
            const buildStart = build.startTime || build.createTime;
            const ageMin = (now - new Date(buildStart).getTime()) / 60_000;
            return ageMin > STALLED_THRESHOLD_MIN;
        });

        if (stalledBuilds.length === 0) {
            logger.info('[DeployWatchdog] No stalled builds detected');
            return NextResponse.json({
                success: true,
                stalled: 0,
                checked: builds.length,
                durationMs: Date.now() - startTime,
            });
        }

        // Alert for each stalled build
        let alertsSent = 0;
        for (const build of stalledBuilds) {
            const buildStart = build.startTime || build.createTime;
            const durationMin = Math.round((now - new Date(buildStart).getTime()) / 60_000);
            const shortHash = getCommitHash(build);

            const text = [
                `⚠️ *Stuck build detected*: \`${shortHash}\` (Cloud Build \`${build.id.slice(0, 8)}\`)`,
                `Status: \`${build.status}\` for *${durationMin} min* — likely infra timeout.`,
                `Cancel: \`node scripts/firebase-apphosting.mjs cancel ${build.id}\``,
                `Then push empty commit to re-trigger.`,
            ].join('\n');

            const result = await slackService.postMessage(LINUS_DEPLOYMENTS_CHANNEL, text);

            if (result.sent) {
                alertsSent++;
                logger.info('[DeployWatchdog] Alert sent for stalled build', {
                    buildId: build.id.slice(0, 8),
                    commitHash: shortHash,
                    durationMin,
                });
            } else {
                logger.warn('[DeployWatchdog] Failed to send Slack alert', {
                    buildId: build.id.slice(0, 8),
                    error: result.error ?? 'unknown',
                });
            }
        }

        return NextResponse.json({
            success: true,
            stalled: stalledBuilds.length,
            alertsSent,
            durationMs: Date.now() - startTime,
        });
    } catch (error: unknown) {
        logger.error('[DeployWatchdog] Failed to execute', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            { success: false, error: 'Deploy watchdog failed', durationMs: Date.now() - startTime },
            { status: 500 },
        );
    }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    return POST(req);
}
