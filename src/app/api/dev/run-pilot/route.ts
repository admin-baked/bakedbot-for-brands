import { NextResponse } from 'next/server';
import { PageGeneratorService } from '@/server/services/page-generator';
import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes

const DETROIT_ZIPS = [
    '48201', '48202', '48226', '48207', '48208', '48216', '48204', '48206', '48219'
];

const CHICAGO_ZIPS = [
    '60601', '60602', '60603', '60604', '60605', '60606',
    '60611', '60654', '60610',
    '60647', '60622', '60642',
    '60607', '60661', '60612'
];

/**
 * DEV ONLY: GET /api/dev/run-pilot
 *
 * Runs pilot page generation for test ZIPs.
 *
 * SECURITY: Blocked in production and requires Super User authentication.
 */
export async function GET() {
    // SECURITY: Block in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Dev route disabled in production' },
            { status: 403 }
        );
    }

    // SECURITY: Require Super User authentication
    try {
        await requireSuperUser();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const generator = new PageGeneratorService();
        const allZips = [...DETROIT_ZIPS, ...CHICAGO_ZIPS];

        logger.info(`Starting Pilot Generation for ${allZips.length} ZIPs...`);

        // 1. Dispensaries
        const dispRes = await generator.scanAndGenerateDispensaries({
            locations: allZips,
            limit: 200, // Ample limit
            dryRun: false
        });

        // 2. Cities
        const cityRes = await generator.scanAndGenerateCities({ dryRun: false });

        // 3. States
        const stateRes = await generator.scanAndGenerateStates({ dryRun: false });

        return NextResponse.json({
            success: true,
            dispensaries: dispRes,
            cities: cityRes,
            states: stateRes
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error('Pilot generation failed', { error: message });
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
