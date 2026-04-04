/**
 * jina-thrive-images.mjs
 *
 * Scrapes product images from thrivesyracuse.com (Dispense SPA) via Jina reader.
 * Jina renders the JS and returns all images with alt text in markdown format.
 * Processes each category page, matches products to Firestore, uploads to GCS.
 *
 * Usage:
 *   node scripts/jina-thrive-images.mjs [--dry-run] [--category=flower]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import https from 'https';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const CATEGORY_FILTER = args.find(a => a.startsWith('--category='))?.split('=')[1];

const BUCKET = 'bakedbot-global-assets';
const ORG_ID = 'org_thrive_syracuse';

// ─── Firebase ──────────────────────────────────────────────────────────────────

const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
const saMatch = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
const sa = JSON.parse(Buffer.from(saMatch[1].trim(), 'base64').toString('utf-8'));

if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
const storage = getStorage();
db.settings({ ignoreUndefinedProperties: true });

// ─── Jina fetch ────────────────────────────────────────────────────────────────

function jinaFetch(url, timeoutMs = 90_000) {
    const jinaUrl = 'https://r.jina.ai/' + url;
    return new Promise((resolve, reject) => {
        const req = https.request(jinaUrl, {
            method: 'GET',
            headers: {
                'X-With-Images-Summary': 'all',
                'X-Return-Format': 'markdown',
                'Accept': 'text/markdown',
            },
            timeout: timeoutMs,
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('timeout', () => { req.destroy(); reject(new Error(`Jina timeout after ${timeoutMs}ms`)); });
        req.on('error', reject);
        req.end();
    });
}

// ─── Parse product images from Jina markdown ───────────────────────────────────
// Jina numbers all images sequentially: "Image N: <alt text>"
// First 13 are store logos/icons — skip them.

const NON_PRODUCT_ALTS = /^(store-logo|logo|icon|Offers|Flower icon|Pre Rolls|Vaporizers|Concentrates|Edibles|Tinctures|Topicals|Accessories|Merchandise|Thrive Syracuse)/i;

function parseProductImages(markdown) {
    const matches = [...markdown.matchAll(/!\[Image \d+: ([^\]]+)\]\((https:\/\/dispense-images\.imgix\.net\/[^)]+)\)/g)];
    return matches
        .filter(m => !NON_PRODUCT_ALTS.test(m[1]))
        .map(m => ({
            name: m[1].trim(),
            imageUrl: m[2].split('?')[0], // strip imgix query params — we'll re-add width later
        }));
}

// ─── Categories ────────────────────────────────────────────────────────────────

const CATEGORIES = [
    { name: 'flower',       url: 'https://thrivesyracuse.com/menu/?category=flower' },
    { name: 'pre-rolls',    url: 'https://thrivesyracuse.com/menu/?category=pre-rolls' },
    { name: 'vapes',        url: 'https://thrivesyracuse.com/menu/?category=vapes' },
    { name: 'concentrates', url: 'https://thrivesyracuse.com/menu/?category=concentrates' },
    { name: 'edibles',      url: 'https://thrivesyracuse.com/menu/?category=edibles' },
    { name: 'tinctures',    url: 'https://thrivesyracuse.com/menu/?category=tinctures' },
    { name: 'topicals',     url: 'https://thrivesyracuse.com/menu/?category=topicals' },
].filter(c => !CATEGORY_FILTER || c.name === CATEGORY_FILTER);

// ─── Matching ─────────────────────────────────────────────────────────────────

function normalize(s) {
    return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function safeFilename(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

// ─── Upload ───────────────────────────────────────────────────────────────────

async function uploadImage(imageUrl, productName, brand) {
    const ext = 'jpg'; // Dispense uses imgix which serves jpg by default
    const storagePath = `product-images/${ORG_ID}/${safeFilename(brand || 'brand')}/${safeFilename(productName)}.${ext}`;

    const file = storage.bucket(BUCKET).file(storagePath);
    const [exists] = await file.exists();
    if (exists) {
        return `https://storage.googleapis.com/${BUCKET}/${storagePath}`;
    }

    // Fetch with width param for reasonable size
    const fetchUrl = imageUrl + '?w=400&auto=format&q=85';
    const resp = await fetch(fetchUrl, { signal: AbortSignal.timeout(20_000) });
    if (!resp.ok) throw new Error(`Download failed: ${resp.status} ${fetchUrl}`);

    const buffer = Buffer.from(await resp.arrayBuffer());
    const contentType = resp.headers.get('content-type') ?? 'image/jpeg';

    await file.save(buffer, {
        metadata: {
            contentType,
            metadata: { source: 'thrivesyracuse.com', productName, scrapedAt: new Date().toISOString() },
        },
    });
    await file.makePublic();
    return `https://storage.googleapis.com/${BUCKET}/${storagePath}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n🌿 Jina Thrive Image Scraper`);
    console.log(`   Dry run: ${DRY_RUN}`);
    if (CATEGORY_FILTER) console.log(`   Category: ${CATEGORY_FILTER}`);

    // Load Firestore products
    const snap = await db.collection('tenants').doc(ORG_ID)
        .collection('publicViews').doc('products').collection('items').get();

    const allProducts = snap.docs.map(doc => ({
        ref: doc.ref,
        name: doc.data().name ?? '',
        normalized: normalize(doc.data().name ?? ''),
        imageUrl: doc.data().imageUrl ?? '',
        brand: doc.data().brandName ?? '',
    }));
    console.log(`\n📦 Loaded ${allProducts.length} Firestore products`);

    // Build lookup maps
    const exactIndex = new Map(allProducts.map(p => [p.normalized, p]));

    // Collect scraped products
    const catalogPath = join(__dirname, '..', 'dev', 'jina-thrive-products.json');
    const allScraped = [];

    for (const cat of CATEGORIES) {
        console.log(`\n📡 Fetching: ${cat.name}`);
        try {
            const markdown = await jinaFetch(cat.url);
            const products = parseProductImages(markdown);
            console.log(`   ✅ ${products.length} product images found`);
            if (products.length > 0) {
                console.log(`   Sample: ${products[0].name.slice(0, 55)}`);
            }
            allScraped.push(...products.map(p => ({ ...p, category: cat.name })));
        } catch (err) {
            console.error(`   ❌ Failed: ${err.message}`);
        }
        // Polite delay between categories
        await new Promise(r => setTimeout(r, 1500));
    }

    // Deduplicate by name
    const seen = new Set();
    const deduped = allScraped.filter(p => {
        const key = normalize(p.name);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    writeFileSync(catalogPath, JSON.stringify(deduped, null, 2));
    console.log(`\n📋 Total scraped: ${allScraped.length}, deduplicated: ${deduped.length}`);

    // Match and upload
    let updated = 0, skipped = 0, unmatched = 0, failed = 0;

    for (const scraped of deduped) {
        const normScraped = normalize(scraped.name);

        // Exact match
        let product = exactIndex.get(normScraped);

        // Partial match if no exact (first 25 chars)
        if (!product) {
            product = allProducts.find(p =>
                p.normalized.includes(normScraped.slice(0, 25)) ||
                normScraped.includes(p.normalized.slice(0, 25))
            );
        }

        if (!product) {
            unmatched++;
            continue;
        }

        // Skip if already has a real GCS image
        if (!DRY_RUN && product.imageUrl?.includes('storage.googleapis.com')) {
            skipped++;
            continue;
        }

        console.log(`\n🔗 ${scraped.name.slice(0, 60)}`);

        if (DRY_RUN) {
            console.log(`   [DRY RUN] img: ${scraped.imageUrl.slice(0, 60)}`);
            updated++;
            continue;
        }

        try {
            const publicUrl = await uploadImage(scraped.imageUrl, scraped.name, product.brand);
            await product.ref.update({
                imageUrl: publicUrl,
                imageSource: 'dispense',
                imageUpdatedAt: new Date(),
            });
            console.log(`   ☁️  ${publicUrl.slice(0, 70)}`);
            updated++;
        } catch (err) {
            console.error(`   ❌ ${err.message}`);
            failed++;
        }
    }

    console.log(`\n─────────────────────────────────────────`);
    console.log(`✅ Done`);
    console.log(`   Updated:   ${updated}`);
    console.log(`   Skipped:   ${skipped} (already had GCS image)`);
    console.log(`   Unmatched: ${unmatched}`);
    console.log(`   Errors:    ${failed}`);
    process.exit(0);
}

main().catch(err => {
    console.error('\n💥', err.message);
    process.exit(1);
});
