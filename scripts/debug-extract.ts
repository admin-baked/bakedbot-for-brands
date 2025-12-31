
import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
    console.log('--- Firecrawl Extraction Debugger ---');
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
        console.error('No API Key found');
        return;
    }

    const app = new FirecrawlApp({ apiKey });
    const url = 'https://example.com';
    const schema = z.object({ 
        page_title: z.string(),
        description: z.string().optional() 
    });

    // Test 1: formats: ['extract'], extract: { schema }
    console.log('\n[Test 1] formats: ["extract"] + extract object');
    try {
        // @ts-ignore
        const res = await app.scrape(url, {
            formats: ['extract'],
            extract: { schema }
        });
        console.log('Success:', res.success);
        console.log('Data:', JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.log('Failed:', e.message);
    }

    // Test 2: formats: ['json'], jsonOptions: { schema }
    console.log('\n[Test 2] formats: ["json"] + jsonOptions object');
    try {
        // @ts-ignore
        const res = await app.scrape(url, {
            formats: ['json'],
            jsonOptions: { schema }
        });
        console.log('Success:', res.success);
        console.log('Data:', JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.log('Failed:', e.message);
    }

    // Test 3: formats: ['json'], includeTags/excludeTags (Baseline)
    console.log('\n[Test 3] formats: ["json"] Baseline');
    try {
        // @ts-ignore
        const res = await app.scrape(url, {
            formats: ['json']
        });
        console.log('Success:', res.success);
        console.log('Data:', JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.log('Failed:', e.message);
    }
}

main().catch(console.error);
