/**
 * Diagnose Dispense API Auth
 * Captures all request details for Dispense API calls from Playwright browser
 */
import { chromium } from 'playwright';
const THRIVE_URL = 'https://thrivesyracuse.com/menu';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
    console.log('🔍 Capturing Dispense API request details...\n');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();

    const capturedRequests = [];

    page.on('request', req => {
        const url = req.url();
        if (!url.includes('dispenseapp.com')) return;
        capturedRequests.push({
            url,
            method: req.method(),
            headers: req.headers(),
        });
    });

    page.on('response', async resp => {
        const url = resp.url();
        if (!url.includes('dispenseapp.com')) return;
        if (!url.includes('product')) return;
        if (resp.status() !== 200) return;
        try {
            const body = await resp.json();
            const products = Array.isArray(body) ? body : body.products || body.data?.products || body.items || [];
            if (products.length > 0) {
                console.log(`✅ RESPONSE: ${url}`);
                console.log(`   Products: ${products.length}`);
                console.log(`   First: ${products[0]?.name || 'unknown'}`);
                console.log(`   Image: ${products[0]?.photo_urls?.full || products[0]?.photo_url || 'none'}\n`);
            }
        } catch {}
    });

    await page.goto(THRIVE_URL, { waitUntil: 'networkidle', timeout: 45000 });
    await sleep(2000);
    // Scroll to trigger more sections
    for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollBy(0, 500));
        await sleep(400);
    }
    await sleep(2000);
    await browser.close();

    console.log('\n📋 Captured Dispense API requests:\n');
    const dispenseRequests = capturedRequests.filter(r => r.url.includes('dispenseapp.com'));
    for (const req of dispenseRequests.slice(0, 20)) {
        console.log(`🔗 ${req.method} ${req.url.slice(0, 120)}`);
        const authHeaders = Object.entries(req.headers)
            .filter(([k]) => k.toLowerCase().includes('auth') || k.toLowerCase().includes('key') ||
                             k.toLowerCase().includes('token') || k.toLowerCase().includes('session') ||
                             k.toLowerCase().includes('venue') || k.toLowerCase() === 'cookie');
        if (authHeaders.length > 0) {
            for (const [k, v] of authHeaders) {
                console.log(`   ${k}: ${v.slice(0, 80)}`);
            }
        } else {
            // Show ALL headers
            console.log('   Headers:');
            for (const [k, v] of Object.entries(req.headers)) {
                console.log(`     ${k}: ${v.slice(0, 60)}`);
            }
        }
        console.log();
    }

    // Check if auth is in URL query string
    console.log('\n🔍 Full URL query strings:');
    for (const req of dispenseRequests.slice(0, 5)) {
        try {
            const u = new URL(req.url);
            const params = Object.fromEntries(u.searchParams);
            if (Object.keys(params).length > 0) {
                console.log(`URL: ${req.url.slice(0, 80)}`);
                console.log('Params:', JSON.stringify(params, null, 2));
            }
        } catch {}
    }
}

run().catch(err => { console.error('❌', err); process.exit(1); });
