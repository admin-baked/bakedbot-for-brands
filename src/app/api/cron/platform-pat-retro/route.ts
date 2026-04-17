export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Platform Pat Retrospective — Weekly Cron Health Review
 *
 * Platform Pat is the engineering agent who owns cron health, Firebase App Hosting,
 * and infrastructure. This weekly cron reviews all agent performance logs from the
 * prior 7 days, flags declining agents, updates their learning docs, and posts a
 * summary to #linus-alerts.
 *
 * Auth: Bearer CRON_SECRET (same as all other cron routes)
 *
 * Cloud Scheduler:
 *   gcloud scheduler jobs create http platform-pat-retro-cron \
 *     --schedule="0 11 * * 0" \
 *     --uri="https://bakedbot.ai/api/cron/platform-pat-retro" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer ${CRON_SECRET}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { elroySlackService } from '@/server/services/communications/slack';
import {
    recordAgentRun,
    upsertAgentLearningDoc,
    PERF_LOGS_COLLECTION,
} from '@/server/services/agent-performance';
import type { AgentRunRecord } from '@/server/services/agent-performance';

const ALERTS_CHANNEL = 'linus-alerts';
const FAILURE_THRESHOLD = 2; // flag if > this many failures in 7 days
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface AgentDomainStats {
    agentId: string;
    domain: string;
    runCount: number;
    totalFailed: number;
    totalErrors: number;
}

function isAuthorized(req: NextRequest): boolean {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return false;
    return req.headers.get('Authorization') === `Bearer ${cronSecret}`;
}

async function fetchRecentRuns(): Promise<AgentRunRecord[]> {
    const db = getAdminFirestore();
    const since = Date.now() - SEVEN_DAYS_MS;

    const snap = await db
        .collection(PERF_LOGS_COLLECTION)
        .where('runAt', '>=', since)
        .orderBy('runAt', 'desc')
        .limit(1000)
        .get();

    return snap.docs.map(d => d.data() as AgentRunRecord);
}

function groupByAgentDomain(runs: AgentRunRecord[]): AgentDomainStats[] {
    const map = new Map<string, AgentDomainStats>();

    for (const run of runs) {
        const key = `${run.agentId}__${run.domain}`;
        const existing = map.get(key) ?? {
            agentId: run.agentId,
            domain: run.domain,
            runCount: 0,
            totalFailed: 0,
            totalErrors: 0,
        };

        existing.runCount += 1;
        const failed = run.metrics['tasksFailed'];
        if (typeof failed === 'number') existing.totalFailed += failed;
        const errors = run.metrics['errorCount'];
        if (typeof errors === 'number') existing.totalErrors += errors;

        map.set(key, existing);
    }

    return Array.from(map.values());
}

async function postSlackAlert(flagged: AgentDomainStats[]): Promise<void> {
    try {
        const lines = flagged.map(
            s =>
                `• *${s.agentId}/${s.domain}*: ${s.runCount} runs, ${s.totalFailed + s.totalErrors} failures`,
        );

        const blocks: Record<string, unknown>[] = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: [
                        ':rotating_light: *Platform Pat — Weekly Retro Alert*',
                        `${flagged.length} agent/domain pair(s) flagged as *declining* (>  ${FAILURE_THRESHOLD} failures in 7 days):`,
                        ...lines,
                        '_Review agent_learning_docs in Firestore for details._',
                    ].join('\n'),
                },
            },
        ];

        const fallbackText = `Platform Pat weekly retro: ${flagged.length} agent(s) flagged with high failure rates.`;

        const channelId = await ensureChannel(ALERTS_CHANNEL);
        const result = await elroySlackService.postMessage(channelId, fallbackText, blocks);

        if (!result.sent) {
            logger.warn('[PlatformPatRetro] Slack alert failed', { error: result.error });
        }
    } catch (err) {
        logger.warn('[PlatformPatRetro] postSlackAlert threw', {
            error: err instanceof Error ? err.message : String(err),
        });
    }
}

async function ensureChannel(channelName: string): Promise<string> {
    try {
        const existing = await elroySlackService.findChannelByName(channelName);
        if (existing?.id) {
            await elroySlackService.joinChannel(existing.id);
            return existing.id;
        }
        const created = await elroySlackService.createChannel(channelName);
        if (created?.id) {
            await elroySlackService.joinChannel(created.id);
            return created.id;
        }
    } catch {}
    return channelName;
}

async function run(): Promise<{ agentsReviewed: number; agentsFlagged: number }> {
    const recentRuns = await fetchRecentRuns();
    const stats = groupByAgentDomain(recentRuns);

    logger.info('[PlatformPatRetro] Reviewing agent performance', {
        totalRuns: recentRuns.length,
        agentDomainPairs: stats.length,
    });

    const flagged: AgentDomainStats[] = [];

    for (const stat of stats) {
        const totalFailures = stat.totalFailed + stat.totalErrors;
        if (totalFailures > FAILURE_THRESHOLD) {
            flagged.push(stat);
            await upsertAgentLearningDoc(stat.agentId, stat.domain, {
                performanceTrend: 'declining',
                trendBasis: `${totalFailures} failures in last 7 days across ${stat.runCount} runs — flagged by Platform Pat retro`,
            });
            logger.info('[PlatformPatRetro] Flagged agent/domain', {
                agentId: stat.agentId,
                domain: stat.domain,
                totalFailures,
                runCount: stat.runCount,
            });
        }
    }

    // Record Platform Pat's own run
    await recordAgentRun({
        agentId: 'platform-pat',
        domain: 'retro',
        runAt: Date.now(),
        periodLabel: 'week-' + new Date().toISOString().slice(0, 10),
        metrics: {
            agentsReviewed: stats.length,
            agentsFlagged: flagged.length,
            totalRunsScanned: recentRuns.length,
        },
    });

    if (flagged.length > 0) {
        await postSlackAlert(flagged);
    } else {
        logger.info('[PlatformPatRetro] All agents healthy — no alerts posted');
    }

    return { agentsReviewed: stats.length, agentsFlagged: flagged.length };
}

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const result = await run();
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        logger.error('[PlatformPatRetro] Handler failed', {
            error: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json(
            { success: false, error: (err as Error).message },
            { status: 500 },
        );
    }
}

export async function GET(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const result = await run();
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        logger.error('[PlatformPatRetro] Handler failed', {
            error: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json(
            { success: false, error: (err as Error).message },
            { status: 500 },
        );
    }
}
