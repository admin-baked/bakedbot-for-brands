
import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

// const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY }); 

async function main() {
    // Dynamic import to handle ESM/CJS compatibility issues
    const FirecrawlApp = (await import('@mendable/firecrawl-js')).default;
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error('FIRECRAWL_API_KEY Missing');
    const app = new FirecrawlApp({ apiKey });
    const url = 'https://dutchie.com/embedded-menu/essex-apothecary/products';
    console.log(`Scraping ${url}...`);

    try {
        // Use scrape with appropriate timeout and waiting for hydration
        const scrapeResult = await app.scrape(url, {
            formats: ['markdown', 'html'],
            waitFor: 5000 // Wait for JS to load products
        } as any);


        console.log('Result keys:', Object.keys(scrapeResult));
        if (!scrapeResult.success && !scrapeResult.markdown) {
            console.error(`Scrape failed: ${scrapeResult.error}`);
            console.log(JSON.stringify(scrapeResult, null, 2));
            return;
        }

        console.log('Scrape successful!');
        fs.writeFileSync('essex_dutchie_menu.md', scrapeResult.markdown || '');
        // fs.writeFileSync('essex_dutchie_menu.html', scrapeResult.html || '');
        console.log('Saved to essex_dutchie_menu.md');
        
    } catch (error) {
        console.error('Error scraping:', error);
    }
}

main().catch(console.error);
