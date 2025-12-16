
import { PageGeneratorService } from '@/server/services/page-generator';
import { createServerClient } from '@/firebase/server-client';

const DETROIT_ZIPS = [
    '48201', '48202', '48226', '48207', '48208', '48216', '48204', '48206', '48219' // Expanded Detroit
];

const CHICAGO_ZIPS = [
    '60601', '60602', '60603', '60604', '60605', '60606',
    '60611', '60654', '60610', // Near North
    '60647', '60622', '60642', // Logan/Wicker
    '60607', '60661', '60612'  // West Loop
];

async function main() {
    console.log('🚀 Starting Pilot Generation for Detroit & Chicago...');

    // DRY RUN first? No, user said "run", let's do it live but maybe with limit?
    // User said "run the initial set". I will set dryRun=false.

    const generator = new PageGeneratorService();

    // 1. Scan & Generate Dispensaries + ZIP Pages
    const allZips = [...DETROIT_ZIPS, ...CHICAGO_ZIPS];
    console.log(`\n📍 Scanning ${allZips.length} ZIP codes...`);

    const dispResult = await generator.scanAndGenerateDispensaries({
        locations: allZips,
        dryRun: false,
        limit: 100 // Should cover all provided ZIPs
    });
    console.log('Dispensary Scan Result:', dispResult);

    // 2. Generate City Pages (Aggregates the dispensaries we just found)
    console.log('\ncity🏙️ Generating City Hub Pages...');
    const cityResult = await generator.scanAndGenerateCities({
        dryRun: false
    });
    console.log('City Scan Result:', cityResult);

    // 3. Generate State Pages
    console.log('\n🗺️ Generating State Hub Pages...');
    const stateResult = await generator.scanAndGenerateStates({
        dryRun: false
    });
    console.log('State Scan Result:', stateResult);

    console.log('\n✅ Pilot Generation Complete!');
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
