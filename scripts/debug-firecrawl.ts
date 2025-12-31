
import dotenv from 'dotenv';
import { FirecrawlService } from '../src/server/services/firecrawl';

// Load env vars (for API Key)
dotenv.config({ path: '.env.local' });
dotenv.config(); 

async function main() {
    console.log('--- Firecrawl Debug Script ---');
    
    // 1. Check Key
    const key = process.env.FIRECRAWL_API_KEY;
    console.log('API Key configured:', key ? 'YES' : 'NO');
    if (key) console.log('Key length:', key.length);

    // 2. Init Service
    const service = FirecrawlService.getInstance();
    
    // 3. Test Search
    const query = 'recreational cannabis dispensaries in 60601 Chicago, IL site:.com';
    console.log(`\nTesting Search Query: "${query}"`);
    
    try {
        const results = await service.search(query);
        console.log(`\nRaw Results Found: ${results.length}`);
        
        results.forEach((r, i) => {
            console.log(`[${i}] ${r.title} | ${r.url}`);
        });

        // 4. Test Filtering Logic (Same as MassScraper)
        const filtered = results.filter(r => 
            !r.url.includes('leafly') && 
            !r.url.includes('weedmaps') && 
            !r.url.includes('yelp')
        );
        console.log(`\nFiltered Results: ${filtered.length}`);
        filtered.forEach((r, i) => {
            console.log(`[${i}] ${r.title} | ${r.url}`);
        });

    } catch (err) {
        console.error('Search failed:', err);
    }
}

main().catch(console.error);
