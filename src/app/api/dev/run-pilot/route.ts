
import { NextResponse } from 'next/server';
import { PageGeneratorService } from '@/server/services/page-generator';

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

export async function GET() {
    try {
        const generator = new PageGeneratorService();
        const allZips = [...DETROIT_ZIPS, ...CHICAGO_ZIPS];

        console.log(`Starting Pilot Generation for ${allZips.length} ZIPs...`);

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
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
