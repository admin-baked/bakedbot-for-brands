/**
 * Test Firecrawl (Discovery Service) to scrape Essex Apothecary menu
 * 
 * Usage: npx tsx dev/test_firecrawl_menu.ts
 */

import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MENU_URL = 'https://essexapothecary.com/our-menu';

// Product schema for extraction
const ProductSchema = z.object({
    name: z.string(),
    brand: z.string().optional(),
    category: z.string().optional(),
    price: z.number().optional(),
    thc: z.string().optional(),
    cbd: z.string().optional(),
});

const MenuSchema = z.object({
    products: z.array(ProductSchema),
    dispensaryName: z.string().optional(),
    lastUpdated: z.string().optional(),
});

async function main() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║    FIRECRAWL MENU SCRAPING TEST              ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
    console.log('Target URL:', MENU_URL);
    console.log('');

    // Check for API key
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
        console.log('❌ FIRECRAWL_API_KEY not found in environment');
        console.log('Please set FIRECRAWL_API_KEY in .env.local');
        process.exit(1);
    }
    console.log('✅ Firecrawl API key found');
    console.log('');

    // Import the Firecrawl SDK
    const FirecrawlApp = (await import('@mendable/firecrawl-js')).default;
    const app = new FirecrawlApp({ apiKey });

    // Test 1: Basic scrape (markdown)
    console.log('=== Test 1: Basic Markdown Scrape ===');
    try {
        const response = await app.scrape(MENU_URL, {
            formats: ['markdown']
        }) as any;

        if (response.success) {
            console.log('✅ Scrape successful!');
            const markdown = response.markdown || response.data?.markdown || '';
            console.log('Content length:', markdown.length, 'characters');
            console.log('');
            console.log('Preview (first 1000 chars):');
            console.log('-'.repeat(50));
            console.log(markdown.substring(0, 1000));
            console.log('-'.repeat(50));
            console.log('');

            // Look for product-like content
            const productPatterns = markdown.match(/\$\d+(\.\d{2})?/g) || [];
            console.log(`Found ${productPatterns.length} price patterns`);
        } else {
            console.log('❌ Scrape failed:', response.error);
        }
    } catch (error: any) {
        console.log('❌ Scrape error:', error.message);
    }

    // Test 2: LLM-based structured extraction
    console.log('');
    console.log('=== Test 2: LLM Structured Extraction ===');
    try {
        const response = await app.scrape(MENU_URL, {
            formats: [
                {
                    type: "json",
                    schema: MenuSchema,
                    prompt: "Extract all cannabis products from this dispensary menu. Include product name, brand, category (flower, edible, concentrate, etc), price, THC%, and CBD%."
                } as any
            ]
        }) as any;

        console.log('Response received');
        
        if (response.json || (response as any).data?.json) {
            const extracted = response.json || response.data?.json;
            console.log('✅ Extraction successful!');
            console.log('');
            console.log('Extracted data:');
            console.log(JSON.stringify(extracted, null, 2).substring(0, 2000));
        } else if (response.success === false) {
            console.log('❌ Extraction failed:', response.error);
        } else {
            console.log('Response structure:', Object.keys(response));
            console.log('Full response:', JSON.stringify(response, null, 2).substring(0, 1000));
        }
    } catch (error: any) {
        console.log('❌ Extraction error:', error.message);
    }

    // Test 3: Map the site to find menu pages
    console.log('');
    console.log('=== Test 3: Site Map ===');
    try {
        const response = await app.mapUrl('https://essexapothecary.com') as any;

        if (response.success) {
            console.log('✅ Site map successful!');
            console.log('Found links:', response.links?.length || 0);
            // Show menu-related links
            const menuLinks = (response.links || []).filter((url: string) => 
                url.toLowerCase().includes('menu') || 
                url.toLowerCase().includes('product') ||
                url.toLowerCase().includes('shop')
            );
            console.log('Menu-related links:', menuLinks.slice(0, 10));
        } else {
            console.log('Map failed:', response.error);
        }
    } catch (error: any) {
        console.log('Map error:', error.message);
    }

    console.log('');
    console.log('=== Done ===');
}

main().catch(console.error);
