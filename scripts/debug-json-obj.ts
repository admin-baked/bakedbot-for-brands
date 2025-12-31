
import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    console.log('--- Firecrawl Format Object Debugger ---');
    const apiKey = process.env.FIRECRAWL_API_KEY;
    const app = new FirecrawlApp({ apiKey });
    const url = 'https://example.com';
    const schema = z.object({ title: z.string() });

    console.log('\n[Test 1] formats: [ { type: "json", schema } ]');
    try {
        // @ts-ignore
        const res = await app.scrape(url, {
            formats: [
                {
                    type: "json",
                    schema: schema
                }
            ]
        });
        console.log('Success:', res.success);
        console.log('Data:', JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.log('Failed:', e.message);
    }
}
main().catch(console.error);
