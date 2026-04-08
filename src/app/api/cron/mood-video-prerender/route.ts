import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { prerenderAllMoodVideos } from '@/server/services/loyalty/mood-video-cache';

export const dynamic = 'force-dynamic';

/**
 * Cron endpoint to pre-render mood videos for an org.
 *
 * GET /api/cron/mood-video-prerender?orgId=org_thrive_syracuse
 * GET /api/cron/mood-video-prerender?orgId=org_thrive_syracuse&force=true
 */
export async function GET(request: NextRequest) {
    const orgId = request.nextUrl.searchParams.get('orgId');
    const force = request.nextUrl.searchParams.get('force') === 'true';

    if (!orgId) {
        return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

    logger.info('[Cron:MoodVideoPrerender] Starting', { orgId, force });

    try {
        const result = await prerenderAllMoodVideos(orgId, { force });

        logger.info('[Cron:MoodVideoPrerender] Complete', { orgId, ...result });

        return NextResponse.json({
            success: true,
            orgId,
            rendered: result.rendered,
            skipped: result.skipped,
            errors: result.errors,
        });
    } catch (error) {
        logger.error('[Cron:MoodVideoPrerender] Failed', {
            orgId,
            error: error instanceof Error ? error.message : String(error),
        });

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Pre-render failed' },
            { status: 500 },
        );
    }
}
