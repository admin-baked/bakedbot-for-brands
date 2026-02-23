/**
 * Dispense Full Product Catalog Scraper
 *
 * Uses the Dispense static API key to paginate through ALL product categories
 * and build a complete product name → image URL catalog.
 *
 * Auth: static api-key embedded in the thrivesyracuse.com JavaScript bundle
 *   api-key: 49dac8e0-7743-11e9-8e3f-a5601eb2e936
 *
 * Usage:
 *   node scripts/scrape-dispense-full.mjs               (build catalog)
 *   node scripts/scrape-dispense-full.mjs --apply       (build + write to Firestore)
 *   node scripts/scrape-dispense-full.mjs --apply --force-scrape
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const FORCE_SCRAPE = args.includes('--force-scrape');
const ORG_ID = args.find(a => a.startsWith('--org='))?.split('=')[1] || 'org_thrive_syracuse';
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '9999', 10);
const CATALOG_PATH = join(__dirname, 'dispense-images-catalog.json');

const VENUE_ID = '13455748f2d363fd';
const API_BASE = 'https://api.dispenseapp.com';
// Static API key from thrivesyracuse.com JavaScript bundle
const API_KEY = '49dac8e0-7743-11e9-8e3f-a5601eb2e936';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Origin': 'https://thrivesyracuse.com',
    'Referer': 'https://thrivesyracuse.com/menu',
    'api-key': API_KEY,
};

// ── Firebase ──────────────────────────────────────────────────────────────────
let db;
const initFirebase = () => {
    if (db) return;
    const saPath = join(__dirname, '..', 'service-account.json');
    let sa;
    if (existsSync(saPath)) {
        sa = JSON.parse(readFileSync(saPath, 'utf8'));
    } else {
        const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
        const m = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
        sa = JSON.parse(Buffer.from(m[1].trim(), 'base64').toString('utf-8'));
    }
    if (!getApps().length) initializeApp({ credential: cert(sa) });
    db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true });
    console.log('✅ Firebase initialized');
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const normalize = s => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
const needsRealImage = url => !url || url === '/icon-192.png' || url.startsWith('https://images.unsplash.com');
const isGenericImage = url => !url || url.includes('default-') || url.includes('dispense-images.imgix.net/default') || url.includes('icon-cannabis');

function extractImage(p) {
    // Dispense API uses "image" (string) and "images" (array with fileUrl)
    if (p.image && typeof p.image === 'string' && !p.image.includes('placeholder') && !p.image.includes('no-image')) {
        return p.image;
    }
    if (p.images?.length > 0 && p.images[0].fileUrl) return p.images[0].fileUrl;
    // Fallback fields
    for (const field of ['photo_urls.full', 'photo_urls.default', 'photo_url', 'image_url', 'thumbnail']) {
        const parts = field.split('.');
        let val = p;
        for (const part of parts) val = val?.[part];
        if (val && typeof val === 'string' && !val.includes('placeholder')) return val;
    }
    return null;
}

function addToMap(catalog, products, catName = '') {
    let added = 0;
    for (const p of products) {
        const name = p.name || p.product_name || p.title;
        const img = extractImage(p);
        if (!name || !img) continue;
        const key = normalize(name);
        if (!catalog.has(key)) {
            catalog.set(key, { name, imageUrl: img, brand: p.brand?.name || p.brand_name || '', category: catName });
            added++;
        }
    }
    return added;
}

// ── API Helper ────────────────────────────────────────────────────────────────
async function apiGet(path) {
    try {
        const resp = await fetch(`${API_BASE}${path}`, { headers: HEADERS });
        if (!resp.ok) {
            console.log(`  ⚠️  HTTP ${resp.status}: ${path}`);
            return null;
        }
        return await resp.json();
    } catch (err) {
        console.log(`  ❌ Fetch error: ${err.message} (${path})`);
        return null;
    }
}

// ── Phase 1: Fetch all categories ─────────────────────────────────────────────
async function getCategories() {
    const body = await apiGet(`/v1/venues/${VENUE_ID}/product-categories?orderPickUpType=IN_STORE`);
    if (!body) return [];
    const cats = Array.isArray(body) ? body : body.categories || body.data || [];
    console.log(`  ✅ ${cats.length} categories: ${cats.map(c => c.name || c._id).join(', ')}`);
    return cats;
}

// ── Phase 2: Paginate all products per category ───────────────────────────────
async function fetchAllProducts() {
    console.log('\n📂 Fetching product categories...');
    const categories = await getCategories();

    const catalog = new Map();
    let grandTotal = 0;

    console.log('\n📦 Fetching products (all categories, paginated)...');

    for (const cat of categories) {
        const catId = cat._id || cat.id;
        const catName = cat.name || catId?.slice(0, 8) || '?';
        let skip = 0;
        const pageSize = 50;
        let catTotal = 0;

        while (true) {
            const body = await apiGet(
                `/v1/venues/${VENUE_ID}/product-categories/${catId}/products?skip=${skip}&limit=${pageSize}&orderPickUpType=IN_STORE`
            );

            if (!body) break;

            // Dispense returns products as a raw array
            const products = Array.isArray(body) ? body :
                body.products || body.data?.products || body.items || body.data || [];

            if (!Array.isArray(products)) {
                console.log(`  ⚠️  Unexpected response shape for ${catName}:`, typeof body, Object.keys(body || {}).slice(0, 5));
                break;
            }
            if (products.length === 0) break;

            const added = addToMap(catalog, products, catName);
            catTotal += products.length;
            skip += products.length;

            // Log progress for large categories
            if (catTotal === products.length && added > 0) {
                process.stdout.write(`  📁 ${catName}: `);
            }

            if (products.length < pageSize) break; // Last page
            await sleep(100);
        }

        if (catTotal > 0) {
            console.log(`${catTotal} products (${catalog.size} total unique)`);
            grandTotal += catTotal;
        }
        await sleep(80);
    }

    console.log(`\n  Grand total API products: ${grandTotal}`);
    console.log(`  Unique in catalog: ${catalog.size}`);
    return catalog;
}

// ── Phase 3: Match + Update Firestore ─────────────────────────────────────────
async function updateFirestore(catalog) {
    initFirebase();
    console.log('\n🔥 Matching products in Firestore...');

    const snap = await db
        .collection('tenants').doc(ORG_ID)
        .collection('publicViews').doc('products')
        .collection('items').get();

    const needsImage = snap.docs.filter(d => needsRealImage(d.data().imageUrl)).slice(0, LIMIT);
    console.log(`📦 ${snap.size} total, ${needsImage.length} need images`);
    console.log(`🗂️  Catalog: ${catalog.size} entries\n`);

    let matched = 0, updated = 0;
    const unmatched = [];

    for (const doc of needsImage) {
        const name = doc.data().name || '';
        const normName = normalize(name);

        // 1. Exact match
        let entry = catalog.get(normName);

        // 2. Compact prefix (first 12 non-space chars)
        if (!entry) {
            const compacted = normName.replace(/\s/g, '').substring(0, 12);
            if (compacted.length >= 8) {
                for (const [k, v] of catalog) {
                    if (k.replace(/\s/g, '').startsWith(compacted)) { entry = v; break; }
                }
            }
        }

        // 3. Word overlap scoring (≥ 2 significant words in common)
        if (!entry) {
            const words = normName.split(' ').filter(w => w.length > 3);
            let bestScore = 1, bestEntry = null;
            for (const [k, v] of catalog) {
                const kw = k.split(' ').filter(w => w.length > 3);
                const overlap = words.filter(w => kw.includes(w)).length;
                if (overlap > bestScore) { bestScore = overlap; bestEntry = v; }
            }
            if (bestEntry) entry = bestEntry;
        }

        if (!entry) { unmatched.push(name); continue; }
        if (isGenericImage(entry.imageUrl)) { unmatched.push(`${name} (generic img)`); continue; }

        matched++;
        const pad = name.slice(0, 48).padEnd(48);
        console.log(`  ✅ "${pad}" → ${entry.imageUrl.slice(0, 65)}`);

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
        const show = unmatched.slice(0, 30);
        console.log(`\n❌ ${unmatched.length} unmatched (${show.length} shown):`);
        show.forEach(n => console.log(`   - ${n}`));
    }

    return { matched, updated, total: needsImage.length };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
    console.log('\n🌿 Dispense Full Catalog Scraper');
    console.log('━'.repeat(60));
    console.log(`  Mode:   ${APPLY ? 'APPLY (write Firestore)' : 'CATALOG ONLY (no Firestore writes)'}`);
    console.log(`  Org:    ${ORG_ID}`);

    let catalog;

    if (!FORCE_SCRAPE && existsSync(CATALOG_PATH)) {
        const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
        catalog = new Map(Object.entries(raw));
        console.log(`\n📋 Cached catalog: ${catalog.size} products (use --force-scrape to refresh)`);
    } else {
        catalog = await fetchAllProducts();

        writeFileSync(CATALOG_PATH, JSON.stringify(Object.fromEntries(catalog), null, 2));
        console.log(`💾 Saved → ${CATALOG_PATH}`);
    }

    // Preview
    console.log('\n📋 Catalog sample (first 20):');
    let i = 0;
    for (const [, v] of catalog) {
        if (i++ >= 20) break;
        const flag = isGenericImage(v.imageUrl) ? '⚠️ ' : '✅ ';
        console.log(`   ${flag}${v.name?.slice(0, 55)}`);
    }

    const { matched, updated, total } = await updateFirestore(catalog);

    console.log(`\n${'━'.repeat(60)}`);
    console.log(`✅ Done!`);
    console.log(`   Catalog:   ${catalog.size} unique products`);
    console.log(`   Scanned:   ${total} needed images`);
    console.log(`   Matched:   ${matched}`);
    if (APPLY) console.log(`   Updated:   ${updated} in Firestore`);
    else console.log(`   → Run with --apply to write to Firestore`);
}

run().catch(err => { console.error('❌ Fatal:', err); process.exit(1); });
