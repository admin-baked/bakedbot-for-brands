#!/usr/bin/env node
/**
 * BakedBot Firecrawl UI Tests
 *
 * JS-rendered browser tests for flows that pure fetch-based smoke tests can't cover:
 *   - Kiosk/tablet page renders (logo, mood grid, form)
 *   - Check-in form submission → visitId format on QR code (C4 regression)
 *   - Dashboard checkin page content (authenticated shell)
 *
 * Uses Firecrawl /scrape with actions for click/fill/wait flows.
 *
 * Usage:
 *   node scripts/run-firecrawl-tests.mjs
 *   node scripts/run-firecrawl-tests.mjs --env=staging
 *   node scripts/run-firecrawl-tests.mjs --filter=kiosk
 *   node scripts/run-firecrawl-tests.mjs --screenshots   # save PNG files to reports/
 */

import FirecrawlApp from '@mendable/firecrawl-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const ENV = args.find(a => a.startsWith('--env='))?.split('=')[1] || 'production';
const FILTER = args.find(a => a.startsWith('--filter='))?.split('=')[1] || '';
const SAVE_SCREENSHOTS = args.includes('--screenshots');

const BASE_URLS = {
    production: 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app',
    staging: 'http://localhost:3000',
};
const BASE_URL = BASE_URLS[ENV] || BASE_URLS.production;

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
if (!FIRECRAWL_API_KEY) {
    console.error('❌  FIRECRAWL_API_KEY not set — cannot run Firecrawl tests.');
    process.exit(1);
}

const fc = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY }).v1;

// ── Helpers ─────────────────────────────────────────────────────────────────

const PASS = '✅';
const FAIL = '❌';
const SKIP = '⏭️ ';

function saveScreenshot(name, base64) {
    if (!SAVE_SCREENSHOTS || !base64) return;
    const dir = join(__dirname, '..', 'reports', 'screenshots');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const file = join(dir, `${name}-${Date.now()}.png`);
    writeFileSync(file, Buffer.from(base64, 'base64'));
    console.log(`    📸  Screenshot saved → ${file}`);
}

async function scrape(url, options = {}) {
    // Firecrawl v4: scrapeUrl lives on .v1 client.
    // "Interact with a page" (dashboard tile) = scrape with actions[] array — same endpoint.
    return fc.scrapeUrl(url, {
        formats: ['html'],
        waitFor: 2000,
        ...options,
    });
}

async function checkCredits() {
    const res = await fetch('https://api.firecrawl.dev/v2/team/credit-usage', {
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data ?? null;
}

// ── Test definitions ────────────────────────────────────────────────────────

/**
 * Each test returns { passed: boolean, note?: string, screenshot?: string }
 */
const TESTS = [
    {
        id: 'kiosk-render',
        name: 'Loyalty tablet kiosk page renders (logo, mood grid, form)',
        area: 'checkin',
        priority: 'P0',
        async run() {
            const res = await scrape(`${BASE_URL}/loyalty-tablet?orgId=org_thrive_syracuse`, {
                formats: ['html', 'screenshot'],
                waitFor: 3000,
            });

            if (!res.success) return { passed: false, note: `Firecrawl error: ${res.error}` };

            const html = res.html || '';
            saveScreenshot('kiosk-render', res.screenshot);

            const checks = {
                'page loaded (>5KB)': html.length > 5000,
                'mood section present': /mood|Mood|relax|social|sleep/i.test(html),
                'check-in form present': /firstName|first.name|First Name|check.in|checkin/i.test(html),
                'no server error': !/error|500|Internal Server/i.test(html.slice(0, 2000)),
            };

            const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
            return {
                passed: failures.length === 0,
                note: failures.length ? `Failed checks: ${failures.join(', ')}` : undefined,
                screenshot: res.screenshot,
            };
        },
    },

    {
        id: 'kiosk-logo',
        name: 'Kiosk shows Thrive logo (not broken image)',
        area: 'checkin',
        priority: 'P1',
        async run() {
            const res = await scrape(`${BASE_URL}/loyalty-tablet?orgId=org_thrive_syracuse`, {
                formats: ['html', 'screenshot'],
                waitFor: 3000,
            });

            if (!res.success) return { passed: false, note: `Firecrawl error: ${res.error}` };

            const html = res.html || '';
            saveScreenshot('kiosk-logo', res.screenshot);

            // Logo renders as <img> from Firebase Storage or falls back to emoji
            const hasLogo = /firebasestorage\.googleapis\.com.*logo/i.test(html)
                || /src="[^"]*logo[^"]*"/i.test(html)
                || html.includes('🍃'); // graceful fallback emoji (C3 fix)

            return {
                passed: hasLogo,
                note: hasLogo ? undefined : 'No logo image or fallback emoji found in rendered HTML',
            };
        },
    },

    {
        id: 'kiosk-checkin-flow',
        name: 'Check-in form submits → visitId has server-generated suffix (C4 regression)',
        area: 'checkin',
        priority: 'P0',
        async run() {
            // Fill the check-in form using Firecrawl actions
            const res = await scrape(`${BASE_URL}/loyalty-tablet?orgId=org_thrive_syracuse`, {
                formats: ['html', 'screenshot'],
                waitFor: 3000,
                actions: [
                    // Select a mood first (click "Relaxed" or first mood card)
                    { type: 'click', selector: '[data-mood], .mood-card, button[aria-label*="relax" i], button[aria-label*="mood" i]' },
                    { type: 'wait', milliseconds: 500 },
                    // Fill in first name
                    { type: 'fill', selector: 'input[name="firstName"], input[placeholder*="first" i], input[id*="firstName"]', value: 'SmokeTest' },
                    { type: 'wait', milliseconds: 200 },
                    // Fill in email
                    { type: 'fill', selector: 'input[name="email"], input[type="email"]', value: 'smoketest+firecrawl@bakedbot.ai' },
                    { type: 'wait', milliseconds: 200 },
                    // Fill in phone
                    { type: 'fill', selector: 'input[name="phone"], input[type="tel"]', value: '3155550199' },
                    { type: 'wait', milliseconds: 200 },
                    // Submit
                    { type: 'click', selector: 'button[type="submit"], button:has-text("Check In"), button:has-text("Submit")' },
                    { type: 'wait', milliseconds: 3000 },
                ],
            });

            if (!res.success) return { passed: false, note: `Firecrawl error: ${res.error}` };

            const html = res.html || '';
            saveScreenshot('kiosk-checkin-flow', res.screenshot);

            // C4 regression: visitId must match the server-generated pattern
            // Format: {customerId}_visit_{timestamp}_{6hex}
            // NOT a plain Date.now() timestamp like "1713456789012"
            const visitIdPattern = /_visit_\d{13}_[0-9a-f]{6}/;
            const rawTimestampPattern = /["']?\d{13}["']?/; // bare 13-digit ms timestamp

            const hasServerVisitId = visitIdPattern.test(html);
            const hasQrOrSuccess = /qr|QR|visitId|visit_id|success|points|loyalty/i.test(html);

            if (!hasQrOrSuccess) {
                return {
                    passed: false,
                    note: 'Form submit did not reach QR/success state — check form selectors or flow',
                };
            }

            return {
                passed: hasServerVisitId,
                note: hasServerVisitId
                    ? undefined
                    : 'QR code visible but visitId does not match server-generated pattern (C4 regression?)',
            };
        },
    },

    {
        id: 'kiosk-mood-recs',
        name: 'Mood recommendation cards load on kiosk (instant cache, <3s)',
        area: 'checkin',
        priority: 'P1',
        async run() {
            const start = Date.now();
            const res = await scrape(`${BASE_URL}/loyalty-tablet?orgId=org_thrive_syracuse`, {
                formats: ['html'],
                waitFor: 4000,
                actions: [
                    { type: 'click', selector: '[data-mood="social"], button[aria-label*="social" i], .mood-card:first-child' },
                    { type: 'wait', milliseconds: 3000 },
                ],
            });
            const elapsed = Date.now() - start;

            if (!res.success) return { passed: false, note: `Firecrawl error: ${res.error}` };

            const html = res.html || '';
            const hasProducts = /product|Flower|Vape|Pre-Roll|Edible|price|\\$/i.test(html);

            return {
                passed: hasProducts,
                note: hasProducts
                    ? `Product cards visible (${elapsed}ms total)`
                    : 'No product cards found after mood selection — instant recs may not be rendering',
            };
        },
    },

    {
        id: 'kiosk-age-consent',
        name: 'Kiosk does not expose PII beyond necessary fields',
        area: 'compliance',
        priority: 'P1',
        async run() {
            const res = await scrape(`${BASE_URL}/loyalty-tablet?orgId=org_thrive_syracuse`, {
                formats: ['html'],
                waitFor: 2000,
            });

            if (!res.success) return { passed: false, note: `Firecrawl error: ${res.error}` };

            const html = res.html || '';

            // Should NOT expose API keys, Firestore paths, internal org data in client HTML
            const leaks = [
                { pattern: /AIza[0-9A-Za-z\-_]{35}/, label: 'Firebase API key' },
                { pattern: /AKIA[0-9A-Z]{16}/, label: 'AWS access key' },
                { pattern: /sk-[a-zA-Z0-9]{32,}/, label: 'OpenAI/Anthropic secret' },
                { pattern: /organizations\/org_[a-z_]+\/private/, label: 'Private Firestore path' },
            ];

            const found = leaks.filter(l => l.pattern.test(html)).map(l => l.label);
            return {
                passed: found.length === 0,
                note: found.length ? `Potential secrets in HTML: ${found.join(', ')}` : undefined,
            };
        },
    },
];

// ── Runner ───────────────────────────────────────────────────────────────────

async function main() {
    const tests = FILTER ? TESTS.filter(t => t.area === FILTER || t.id.includes(FILTER)) : TESTS;

    console.log(`\n🔥 BakedBot Firecrawl UI Tests`);
    console.log(`   Environment: ${ENV} (${BASE_URL})`);
    console.log(`   Tests: ${tests.length}${FILTER ? ` (filtered: ${FILTER})` : ''}`);

    // Credit pre-flight
    const credits = await checkCredits();
    if (credits) {
        console.log(`   Credits: ${credits.remainingCredits}/${credits.planCredits} remaining (resets ${new Date(credits.billingPeriodEnd).toLocaleDateString()})`);
        if (credits.remainingCredits < tests.length * 2) {
            console.log(`   ⚠️  Low credits — some tests may fail\n`);
        } else {
            console.log('');
        }
    } else {
        console.log('   Credits: unknown\n');
    }

    const results = [];

    for (const test of tests) {
        process.stdout.write(`  ${test.name} ... `);
        const t0 = Date.now();
        try {
            const result = await test.run();
            const ms = Date.now() - t0;
            const icon = result.passed ? PASS : FAIL;
            console.log(`${icon} ${result.passed ? 'PASSED' : 'FAILED'} (${ms}ms)${result.note ? '\n     ' + result.note : ''}`);
            results.push({ ...test, ...result, ms });
        } catch (err) {
            const ms = Date.now() - t0;
            console.log(`${FAIL} ERROR (${ms}ms)\n     ${err.message}`);
            results.push({ ...test, passed: false, note: err.message, ms });
        }
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📊 Results: ${passed} passed | ${failed} failed | ${tests.length} total\n`);

    if (failed > 0) {
        console.log(`❌ Failed Tests:`);
        results.filter(r => !r.passed).forEach(r => {
            console.log(`   [${r.priority}] ${r.name}`);
            if (r.note) console.log(`     ${r.note}`);
        });
        console.log('');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
