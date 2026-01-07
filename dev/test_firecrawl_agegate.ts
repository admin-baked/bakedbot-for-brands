/**
 * Test Firecrawl with age gate bypass action
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MENU_URL = 'https://essexapothecary.com/our-menu';

async function main() {
    console.log('Testing Firecrawl with age gate bypass...');
    console.log('URL:', MENU_URL);
    
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
        console.log('❌ FIRECRAWL_API_KEY not found');
        process.exit(1);
    }

    const FirecrawlApp = (await import('@mendable/firecrawl-js')).default;
    const app = new FirecrawlApp({ apiKey });

    // Test with actions to click age gate
    console.log('\n=== Scrape with Age Gate Click ===');
    try {
        const response = await app.scrape(MENU_URL, {
            formats: ['markdown'],
            actions: [
                // Wait for age gate to appear
                { type: 'wait', milliseconds: 2000 },
                // Click "Yes" button for age verification
                { type: 'click', selector: 'a[href*="#yes"]' },
                // Wait for menu to load after age gate
                { type: 'wait', milliseconds: 5000 },
                // Scroll to load lazy content
                { type: 'scroll', direction: 'down', amount: 1000 },
                { type: 'wait', milliseconds: 2000 },
            ],
            timeout: 60000,
        } as any) as any;

        if (response.success || response.markdown) {
            console.log('✅ Scrape successful!');
            const content = response.markdown || response.data?.markdown || '';
            console.log('Markdown length:', content.length);
            
            // Save full content
            const fs = await import('fs');
            fs.writeFileSync('essex_menu_after_agegate.md', content, 'utf-8');
            console.log('Full content saved to essex_menu_after_agegate.md');
            
            // Check for product indicators
            const hasFlower = content.toLowerCase().includes('flower');
            const hasEdible = content.toLowerCase().includes('edible');
            const hasThc = content.toLowerCase().includes('thc');
            const hasPrices = (content.match(/\$[\d,.]+/g) || []).length;
            
            console.log('\nContent analysis:');
            console.log('  Has "flower":', hasFlower);
            console.log('  Has "edible":', hasEdible);
            console.log('  Has "thc":', hasThc);
            console.log('  Price patterns:', hasPrices);
            
            // Preview
            console.log('\nPreview (first 3000 chars):');
            console.log('-'.repeat(50));
            console.log(content.substring(0, 3000));
            console.log('-'.repeat(50));
        } else {
            console.log('❌ Scrape failed');
            console.log('Response:', JSON.stringify(response, null, 2).substring(0, 1000));
        }
    } catch (error: any) {
        console.log('Error:', error.message);
        
        // Try alternate approach - scrape Dutchie embed directly
        console.log('\n=== Trying Dutchie Embed Direct ===');
        try {
            // Essex's Dutchie embed URL (from their iframe)
            const dutchieUrl = 'https://dutchie.com/embedded-menu/essex-apothecary/products';
            console.log('Trying:', dutchieUrl);
            
            const directResponse = await app.scrape(dutchieUrl, {
                formats: ['markdown'],
                waitFor: 5000,
            } as any) as any;
            
            if (directResponse.markdown) {
                console.log('✅ Direct scrape worked!');
                console.log('Length:', directResponse.markdown.length);
                console.log('Preview:', directResponse.markdown.substring(0, 1500));
            }
        } catch (e2: any) {
            console.log('Direct scrape failed:', e2.message);
        }
    }

    console.log('\n=== Done ===');
}

main().catch(console.error);
