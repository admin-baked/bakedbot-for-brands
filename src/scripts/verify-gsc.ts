
import { searchConsoleService } from '../server/services/growth/search-console';

async function main() {
    console.log('🔍 Testing Google Search Console connection...');
    console.log(`Target Site: ${process.env.SEARCH_CONSOLE_SITE_URL}`);
    
    try {
        // Attempt to pull data
        const summary = await searchConsoleService.getSiteSummary(7);
        
        if (summary.clicks === 0 && summary.impressions === 0) {
            console.log('\n⚠️  Connected, but returned 0 data.');
            console.log('This could mean:');
            console.log('1. The site has no traffic yet.');
            console.log('2. The "Login Required" error was swallowed (check logs).');
            console.log('3. You do not have access to this specific property.');
        } else {
            console.log('\n✅ Data Successfully Pulled!');
            console.log('-------------------------');
            console.log(`Clicks (Last 7 Days): ${summary.clicks}`);
            console.log(`Impressions: ${summary.impressions}`);
            console.log(`CTR: ${(summary.ctr * 100).toFixed(2)}%`);
            console.log(`Avg Position: ${summary.avgPosition.toFixed(1)}`);
        }
        
    } catch (e: any) {
        console.error('\n❌ Fatal Error');
        console.error(e.message);
    }
}

main().catch(console.error);
