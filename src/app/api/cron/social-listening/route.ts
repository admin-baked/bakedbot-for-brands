import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Social Listening Cron
 *
 * Scans Reddit (and future: LinkedIn groups, Facebook groups) for
 * cannabis retail discussions matching BakedBot's target keywords.
 * Scores relevance, persists signals to Firestore, and posts
 * high-value leads to Slack #social-intel.
 *
 * Schedule: every 6 hours (Cloud Scheduler)
 */

function getAuthToken(req: NextRequest): string | null {
    const header = req.headers.get('authorization') || '';
    if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
    return req.nextUrl.searchParams.get('token');
}

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || getAuthToken(req) !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { runFullScan } = await import(
            '@/server/services/social-media/social-listener'
        );

        const result = await runFullScan();

        logger.info('[SocialListening] Cron complete', {
            totalSignals: result.totalSignals,
            highValue: result.highValue,
        });

        return NextResponse.json({
            success: true,
            totalSignals: result.totalSignals,
            highValue: result.highValue,
            platforms: result.results.map(r => ({
                platform: r.platform,
                signals: r.signalsFound,
                highValue: r.highValue,
                engage: r.engage,
            })),
        });
    } catch (e) {
        logger.error('[SocialListening] Cron failed', {
            error: e instanceof Error ? e.message : String(e),
        });
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
        );
    }
}

export async function POST(req: NextRequest) {
    return GET(req);
}
