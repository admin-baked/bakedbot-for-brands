/**
 * Dispense Product Image Scraper (Playwright + Network Intercept)
 *
 * Opens thrivesyracuse.com/menu in a headless browser, intercepts all
 * Dispense API responses, and captures product name → image URL mappings.
 * Navigates through every category page to get full coverage.
 *
 * Usage:
 *   node scripts/scrape-dispense-images.mjs               (build catalog only)
 *   node scripts/scrape-dispense-images.mjs --apply       (build + write Firestore)
 *   node scripts/scrape-dispense-images.mjs --apply --limit=50
 *
 * Output: scripts/dispense-images-catalog.json
 */

import { chromium } from 'playwright';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const DRY_RUN = !APPLY;
const ORG_ID = args.find(a => a.startsWith('--org='))?.split('=')[1] || 'org_thrive_syracuse';
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '9999', 10);
const FORCE_SCRAPE = args.includes('--force-scrape');
const CATALOG_PATH = join(__dirname, 'dispense-images-catalog.json');
const THRIVE_MENU_URL = 'https://thrivesyracuse.com/menu';
const THRIVE_VENUE_ID = '13455748f2d363fd';

// ── Firebase Init ─────────────────────────────────────────────────────────────
let db;
const initFirebase = () => {
    if (db) return;
    const saPath = join(__dirname, '..', 'service-account.json');
    if (!existsSync(saPath)) {
        const envPath = join(__dirname, '..', '.env.local');
        if (existsSync(envPath)) {
            const envContent = readFileSync(envPath, 'utf8');
            const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
            if (match) {
                const decoded = Buffer.from(match[1].trim(), 'base64').toString('utf-8');
                const sa = JSON.parse(decoded);
                if (!getApps().length) initializeApp({ credential: cert(sa) });
            }
        } else {
            console.error('❌ service-account.json not found');
            process.exit(1);
        }
    } else {
        const sa = JSON.parse(readFileSync(saPath, 'utf8'));
        if (!getApps().length) initializeApp({ credential: cert(sa) });
    }
    db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true });
    console.log('✅ Firebase Admin initialized');
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalize(s) {
    return s.toLowerCase()
        .replace(/\(.*?\)/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const PLACEHOLDER = '/icon-192.png';
const UNSPLASH_PREFIX = 'https://images.unsplash.com';

function needsRealImage(imageUrl) {
    if (!imageUrl || imageUrl === '' || imageUrl === PLACEHOLDER) return true;
    if (imageUrl.startsWith(UNSPLASH_PREFIX)) return true;
    return false;
}

function extractBestImage(product) {
    // Multiple Dispense API response shapes
    if (product.photo_urls?.full) return product.photo_urls.full;
    if (product.photo_urls?.default) return product.photo_urls.default;
    if (product.photo_urls?.original) return product.photo_urls.original;
    if (product.photo_url) return product.photo_url;
    if (product.image_url) return product.image_url;
    if (product.image) return product.image;
    if (product.pictures?.length > 0) return product.pictures[0].url || product.pictures[0];
    if (product.product_variants?.length > 0) {
        for (const v of product.product_variants) {
            const img = extractBestImage(v);
            if (img) return img;
        }
    }
    if (product.variant_groups?.length > 0) {
        for (const g of product.variant_groups) {
            if (g.variants?.length > 0) {
                const img = extractBestImage(g.variants[0]);
                if (img) return img;
            }
        }
    }
    return null;
}

function isValidImage(url) {
    if (!url) return false;
    if (url.includes('placeholder')) return false;
    if (url.includes('default.png')) return false;
    if (url.includes('no-image')) return false;
    return true;
}

// ── Phase 1: Scrape Dispense via Playwright ───────────────────────────────────
async function scrapeDispenseMenu() {
    console.log('\n🎭 Launching Playwright browser...');
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    // ── Intercept ALL network responses ────────────────────────────────────
    const catalog = new Map(); // normalized_name → { name, brand, imageUrl, category }
    const capturedUrls = [];
    let rawApiCount = 0;

    page.on('response', async (response) => {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';

        // Track ALL JSON responses for debugging
        if (contentType.includes('application/json') && response.status() === 200) {
            capturedUrls.push(url);
        }

        // Focus on dispense/venue-related endpoints
        const isDispense = url.includes('dispenseapp.com') || url.includes(THRIVE_VENUE_ID);
        const isProductData = url.match(/product|item|inventory|menu|categor|catalog/i);
        if (!isDispense && !isProductData) return;

        try {
            if (!contentType.includes('application/json')) return;
            if (response.status() !== 200) return;

            const body = await response.json();
            rawApiCount++;
            console.log(`  🔗 API: ${url.slice(0, 100)}`);

            // Unwrap various response shapes
            let products = [];
            if (Array.isArray(body)) products = body;
            else if (body.products) products = body.products;
            else if (body.data?.products) products = body.data.products;
            else if (body.items) products = body.items;
            else if (body.data?.items) products = body.data.items;
            else if (body.data && Array.isArray(body.data)) products = body.data;
            else if (body.results) products = body.results;
            else if (body.catalog) products = body.catalog;
            else {
                // Log unknown shapes for debugging
                const keys = Object.keys(body).slice(0, 8).join(', ');
                console.log(`    Shape: {${keys}} (${products.length} items)`);
            }

            let added = 0;
            for (const product of products) {
                const name = product.name || product.product_name || product.title || product.display_name;
                const brand = product.brand?.name || product.brand_name || product.brand || '';
                const category = product.category?.name || product.category_name || product.product_type || product.type || '';
                const imageUrl = extractBestImage(product);

                if (!name || !imageUrl || !isValidImage(imageUrl)) continue;

                const key = normalize(name);
                if (!catalog.has(key)) {
                    catalog.set(key, { name, brand, imageUrl, category });
                    added++;
                }
            }
            if (added > 0) console.log(`    → ${added} new products captured (total: ${catalog.size})`);

        } catch {
            // Not JSON or parse error — skip
        }
    });

    // ── Navigate through category pages ─────────────────────────────────────
    // The Thrive menu uses category slugs from Dispense
    const pages = [
        { url: THRIVE_MENU_URL, label: 'Main menu' },
        { url: `${THRIVE_MENU_URL}/categories/flower`, label: 'Flower' },
        { url: `${THRIVE_MENU_URL}/categories/pre-rolls`, label: 'Pre-Rolls' },
        { url: `${THRIVE_MENU_URL}/categories/vapes`, label: 'Vapes' },
        { url: `${THRIVE_MENU_URL}/categories/edibles`, label: 'Edibles' },
        { url: `${THRIVE_MENU_URL}/categories/concentrates`, label: 'Concentrates' },
        { url: `${THRIVE_MENU_URL}/categories/tinctures`, label: 'Tinctures' },
        { url: `${THRIVE_MENU_URL}/categories/topicals`, label: 'Topicals' },
        { url: `${THRIVE_MENU_URL}/categories/accessories`, label: 'Accessories' },
        { url: `${THRIVE_MENU_URL}/categories/vaporizers`, label: 'Vaporizers' },
        { url: `${THRIVE_MENU_URL}/categories/infused-pre-rolls`, label: 'Infused Pre-Rolls' },
        { url: `${THRIVE_MENU_URL}/categories/sublinguals`, label: 'Sublinguals' },
    ];

    for (const p of pages) {
        console.log(`\n📄 Loading: ${p.label} (${p.url})`);
        try {
            await page.goto(p.url, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(3000);

            // Scroll to trigger lazy-loaded products
            for (let scroll = 0; scroll < 5; scroll++) {
                await page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await page.waitForTimeout(800);
            }

            // DOM extraction as additional source (imgix images in <img> tags)
            const domProducts = await page.evaluate(() => {
                const results = [];
                // Strategy 1: img tags with imgix/dispense URLs
                document.querySelectorAll('img[src*="imgix"], img[src*="dispenseapp"]').forEach(img => {
                    const src = img.src || img.dataset.src || '';
                    if (!src || src.includes('placeholder')) return;

                    // Walk up the DOM to find the product name
                    let el = img.parentElement;
                    for (let depth = 0; depth < 8 && el; depth++) {
                        const nameEl = el.querySelector(
                            'h1, h2, h3, h4, [class*="name"], [class*="title"], [class*="product-name"], ' +
                            '[class*="ProductName"], [class*="item-name"], [class*="itemName"]'
                        );
                        if (nameEl) {
                            const name = nameEl.textContent?.trim();
                            if (name && name.length > 3 && name.length < 150) {
                                results.push({ name, imageUrl: src });
                                break;
                            }
                        }
                        el = el.parentElement;
                    }
                });
                return results;
            });

            let domAdded = 0;
            for (const p of domProducts) {
                if (!p.name || !p.imageUrl) continue;
                const key = normalize(p.name);
                if (!catalog.has(key)) {
                    catalog.set(key, { name: p.name, brand: '', imageUrl: p.imageUrl, category: '' });
                    domAdded++;
                }
            }
            if (domAdded > 0) console.log(`  → DOM extraction: +${domAdded} products (total: ${catalog.size})`);

        } catch (err) {
            console.warn(`  ⚠️  Failed: ${err.message}`);
        }
    }

    await browser.close();

    console.log(`\n📊 Summary:`);
    console.log(`   JSON APIs intercepted: ${rawApiCount}`);
    console.log(`   All JSON URLs seen: ${capturedUrls.length}`);
    if (capturedUrls.length > 0 && capturedUrls.length <= 20) {
        capturedUrls.forEach(u => console.log(`   - ${u.slice(0, 100)}`));
    }
    console.log(`   Unique products in catalog: ${catalog.size}`);

    return catalog;
}

// ── Phase 2: Try direct Dispense API calls with intercepted cookies ───────────
async function tryDirectDispenseApi(catalog) {
    console.log('\n🔌 Attempting direct Dispense API calls...');

    // From the Playwright session, capture auth token
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    let apiKey = null;
    let authHeaders = {};

    // Intercept request headers to get auth token
    page.on('request', (req) => {
        const url = req.url();
        if (!url.includes('dispenseapp.com')) return;
        const headers = req.headers();
        if (headers['authorization'] || headers['x-api-key'] || headers['x-venue-id']) {
            authHeaders = {
                authorization: headers['authorization'],
                'x-api-key': headers['x-api-key'],
                'x-venue-id': headers['x-venue-id'],
                'x-dispensary-id': headers['x-dispensary-id'],
                origin: headers['origin'],
                referer: headers['referer'],
            };
            apiKey = headers['authorization'] || headers['x-api-key'];
            console.log('  🔑 Captured auth headers from browser request');
        }
    });

    page.on('response', async (response) => {
        const url = response.url();
        if (!url.includes('dispenseapp.com')) return;
        if (response.status() !== 200) return;
        const ct = response.headers()['content-type'] || '';
        if (!ct.includes('json')) return;

        try {
            const body = await response.json();
            let products = [];
            if (Array.isArray(body)) products = body;
            else if (body.products) products = body.products;
            else if (body.data?.products) products = body.data.products;
            else if (body.items) products = body.items;

            for (const product of products) {
                const name = product.name || product.product_name || product.title;
                const imageUrl = extractBestImage(product);
                if (!name || !imageUrl || !isValidImage(imageUrl)) continue;
                const key = normalize(name);
                if (!catalog.has(key)) {
                    catalog.set(key, { name, brand: '', imageUrl, category: '' });
                }
            }
        } catch {}
    });

    await page.goto(THRIVE_MENU_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await browser.close();

    if (!apiKey && Object.keys(authHeaders).length === 0) {
        console.log('  ℹ️  No API key found — Dispense may use session-based auth');
        return catalog;
    }

    // Try direct API calls with captured headers
    const endpoints = [
        `https://api.dispenseapp.com/venues/${THRIVE_VENUE_ID}/products`,
        `https://api.dispenseapp.com/venues/${THRIVE_VENUE_ID}/menu`,
        `https://api.dispenseapp.com/v2/venues/${THRIVE_VENUE_ID}/products`,
        `https://api.dispenseapp.com/venues/${THRIVE_VENUE_ID}/catalog`,
        `https://api.dispenseapp.com/venues/${THRIVE_VENUE_ID}/products?limit=500`,
        `https://api.dispenseapp.com/venues/${THRIVE_VENUE_ID}/products?page=1&limit=200`,
    ];

    for (const endpoint of endpoints) {
        try {
            const resp = await fetch(endpoint, {
                headers: {
                    ...authHeaders,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                },
            });
            if (!resp.ok) {
                console.log(`  HTTP ${resp.status}: ${endpoint.slice(0, 80)}`);
                continue;
            }
            const body = await resp.json();
            let products = [];
            if (Array.isArray(body)) products = body;
            else if (body.products) products = body.products;
            else if (body.data?.products) products = body.data.products;

            let added = 0;
            for (const product of products) {
                const name = product.name || product.product_name;
                const imageUrl = extractBestImage(product);
                if (!name || !imageUrl || !isValidImage(imageUrl)) continue;
                const key = normalize(name);
                if (!catalog.has(key)) {
                    catalog.set(key, { name, brand: '', imageUrl, category: '' });
                    added++;
                }
            }
            console.log(`  ✅ ${endpoint.slice(0, 80)}: ${added} new products`);
        } catch (err) {
            console.log(`  ❌ ${endpoint.slice(0, 80)}: ${err.message}`);
        }
    }

    return catalog;
}

// ── Phase 3: Match + Update Firestore ─────────────────────────────────────────
async function updateFirestoreProducts(catalog) {
    initFirebase();
    console.log('\n🔥 Matching products in Firestore...');

    const snap = await db
        .collection('tenants')
        .doc(ORG_ID)
        .collection('publicViews')
        .doc('products')
        .collection('items')
        .get();

    if (snap.empty) {
        console.error('❌ No products found in Firestore');
        return { matched: 0, updated: 0 };
    }

    const needsImage = snap.docs
        .filter(d => needsRealImage(d.data().imageUrl))
        .slice(0, LIMIT);

    console.log(`📦 ${snap.size} total products, ${needsImage.length} need images`);
    console.log(`🗂️  Catalog has ${catalog.size} entries\n`);

    let matched = 0;
    let updated = 0;
    const unmatched = [];

    for (const doc of needsImage) {
        const product = doc.data();
        const name = product.name || '';
        const normName = normalize(name);

        // 1. Exact match
        let entry = catalog.get(normName);

        // 2. Prefix match (first 8 chars)
        if (!entry) {
            const prefix8 = normName.substring(0, Math.min(8, normName.length));
            for (const [k, v] of catalog) {
                if (k.startsWith(prefix8) || (prefix8.length >= 6 && normName.startsWith(k.substring(0, Math.min(6, k.length))))) {
                    entry = v;
                    break;
                }
            }
        }

        // 3. Significant word overlap (≥2 words match)
        if (!entry) {
            const words = normName.split(' ').filter(w => w.length > 3);
            if (words.length >= 2) {
                for (const [k, v] of catalog) {
                    const catWords = k.split(' ').filter(w => w.length > 3);
                    const overlap = words.filter(w => catWords.includes(w)).length;
                    if (overlap >= 2) {
                        entry = v;
                        break;
                    }
                }
            }
        }

        if (!entry) {
            unmatched.push(name);
            continue;
        }

        matched++;
        console.log(`  ✅ "${name.slice(0, 50)}" → ${entry.imageUrl.slice(0, 70)}`);

        if (APPLY) {
            await doc.ref.update({
                imageUrl: entry.imageUrl,
                imageSource: 'dispense',
                imageUpdatedAt: new Date(),
            });
            updated++;
        }
    }

    if (unmatched.length > 0) {
        const showCount = Math.min(20, unmatched.length);
        console.log(`\n❌ ${unmatched.length} unmatched (showing ${showCount}):`);
        unmatched.slice(0, showCount).forEach(n => console.log(`   - ${n}`));
    }

    return { matched, updated };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
    console.log('\n🌿 Dispense Image Scraper');
    console.log('━'.repeat(60));
    console.log(`  Target:   ${THRIVE_MENU_URL}`);
    console.log(`  Mode:     ${APPLY ? 'APPLY (write to Firestore)' : 'DRY RUN (no writes)'}`);
    console.log(`  Org:      ${ORG_ID}`);
    console.log(`  Catalog:  ${CATALOG_PATH}`);
    console.log(`  Limit:    ${LIMIT}`);

    let catalog;

    // Use cached catalog if available (unless --force-scrape)
    if (!FORCE_SCRAPE && existsSync(CATALOG_PATH)) {
        console.log('\n📋 Loading cached catalog...');
        const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
        catalog = new Map(Object.entries(raw));
        console.log(`  ✅ Loaded ${catalog.size} products from cache`);
    } else {
        // Scrape Phase 1: browser interception
        catalog = await scrapeDispenseMenu();

        // Scrape Phase 2: try direct API with captured headers
        if (catalog.size < 50) {
            catalog = await tryDirectDispenseApi(catalog);
        }

        // Save catalog
        const catalogObj = Object.fromEntries(catalog);
        writeFileSync(CATALOG_PATH, JSON.stringify(catalogObj, null, 2));
        console.log(`\n💾 Catalog saved to ${CATALOG_PATH} (${catalog.size} products)`);
    }

    if (catalog.size === 0) {
        console.log('\n⚠️  Empty catalog — menu may be closed/protected.');
        console.log('   Try visiting https://thrivesyracuse.com/menu in Chrome');
        console.log('   and check DevTools → Network for Dispense API calls.\n');
        process.exit(0);
    }

    // Show preview
    console.log('\n📋 Catalog preview (first 10):');
    let i = 0;
    for (const [, v] of catalog) {
        if (i++ >= 10) break;
        console.log(`   • ${v.name?.slice(0, 50)} → ${v.imageUrl?.slice(0, 70)}`);
    }

    // Match + update
    const { matched, updated } = await updateFirestoreProducts(catalog);

    console.log(`\n${'━'.repeat(60)}`);
    console.log(`✅ Done!`);
    console.log(`   Catalog size: ${catalog.size}`);
    console.log(`   Matched:      ${matched}`);
    if (APPLY) {
        console.log(`   Updated:      ${updated}`);
    } else {
        console.log(`   (DRY RUN — run with --apply to write to Firestore)`);
    }
}

run().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
