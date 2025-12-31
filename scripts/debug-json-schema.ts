
import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
    console.log('--- Firecrawl JSON Format Debugger ---');
    const apiKey = process.env.FIRECRAWL_API_KEY;
    const app = new FirecrawlApp({ apiKey });
    const url = 'https://example.com';
    const schema = z.object({ title: z.string() });

    // Attempt 1: json property with schema
    console.log('\n[Test 1] formats: ["json"], json: { schema }');
    try {
        // @ts-ignore
        const res = await app.scrape(url, {
            formats: ['json'],
            json: {
                schema: schema
            }
        });
        console.log('Success:', res.success);
        console.log('Data:', JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.log('Failed:', e.message);
    }

    // Attempt 2: json property with schema AND prompt
    console.log('\n[Test 2] formats: ["json"], json: { schema, prompt }');
    try {
        // @ts-ignore
        const res = await app.scrape(url, {
            formats: ['json'],
            json: {
                schema: schema,
                prompt: "Extract the page title"
            }
        });
        console.log('Success:', res.success);
        console.log('Data:', JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.log('Failed:', e.message);
    }
}

main().catch(console.error);
