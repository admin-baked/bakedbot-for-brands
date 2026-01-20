
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { runDayDayWeeklyReview } from '@/server/jobs/dayday-weekly-review'; 

async function main() {
    console.log('🚀 Manually triggering Weekly Growth Review...');
    console.log('   (This will query GSC/GA4 and send an email to martez@bakedbot.ai if successful)\n');
    
    try {
        const result = await runDayDayWeeklyReview();
        console.log('\n✅ Job Complete!');
        console.log('Stats:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('\n❌ Job Failed:', error);
        process.exit(1);
    }
}

main();
