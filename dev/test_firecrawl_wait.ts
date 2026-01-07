/**
 * Test Firecrawl with wait actions for JS-rendered menu
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MENU_URL = 'https://essexapothecary.com/our-menu';

async function main() {
    console.log('Testing Firecrawl with JavaScript wait...');
    console.log('URL:', MENU_URL);
    
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
        console.log('❌ FIRECRAWL_API_KEY not found');
        process.exit(1);
    }

    const FirecrawlApp = (await import('@mendable/firecrawl-js')).default;
    const app = new FirecrawlApp({ apiKey });

    // Test with wait action for JS content
    console.log('\n=== Scrape with Wait ===');
    try {
        const response = await app.scrape(MENU_URL, {
            formats: ['markdown', 'html'],
            waitFor: 5000, // Wait 5 seconds for JS to load
            timeout: 30000,
        } as any) as any;

        if (response.success || response.markdown) {
            console.log('✅ Scrape successful!');
            const content = response.markdown || response.data?.markdown || '';
            console.log('Markdown length:', content.length);
            
            // Save full content to file for analysis
            const fs = await import('fs');
            fs.writeFileSync('essex_menu_scraped.md', content, 'utf-8');
            console.log('Full content saved to essex_menu_scraped.md');
            
            // Preview
            console.log('\nPreview:');
            console.log('-'.repeat(50));
            console.log(content.substring(0, 2000));
            console.log('-'.repeat(50));
            
            // Look for menu indicators
            const hasProducts = content.toLowerCase().includes('flower') || 
                               content.toLowerCase().includes('edible') ||
                               content.toLowerCase().includes('concentrate') ||
                               content.toLowerCase().includes('thc');
            console.log('\nHas cannabis product keywords:', hasProducts);
            
            const priceMatches = content.match(/\$[\d,.]+/g) || [];
            console.log('Price patterns found:', priceMatches.length);
            if (priceMatches.length > 0) {
                console.log('Sample prices:', priceMatches.slice(0, 5));
            }
        } else {
            console.log('❌ Scrape failed');
            console.log('Response:', JSON.stringify(response, null, 2).substring(0, 500));
        }
    } catch (error: any) {
        console.log('Error:', error.message);
    }

    // Also try the HTML version to see iframe sources
    console.log('\n=== Check for Embedded Iframes ===');
    try {
        const response = await app.scrape(MENU_URL, {
            formats: ['rawHtml'],
            timeout: 30000,
        } as any) as any;

        if (response.rawHtml || response.data?.rawHtml) {
            const html = response.rawHtml || response.data?.rawHtml || '';
            
            // Look for iframes (Dutchie embed)
            const iframeMatches = html.match(/<iframe[^>]*src="([^"]+)"[^>]*>/gi) || [];
            console.log('Iframes found:', iframeMatches.length);
            
            // Look for Dutchie references
            const hasDutchie = html.toLowerCase().includes('dutchie');
            console.log('Contains "dutchie" reference:', hasDutchie);
            
            // Find Dutchie script/embed URLs
            const dutchieUrls = html.match(/https?:\/\/[^"'\s]*dutchie[^"'\s]*/gi) || [];
            console.log('Dutchie URLs:', dutchieUrls.slice(0, 5));
        }
    } catch (error: any) {
        console.log('HTML scrape error:', error.message);
    }

    console.log('\n=== Done ===');
}

main().catch(console.error);
