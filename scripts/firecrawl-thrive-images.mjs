/**
 * firecrawl-thrive-images.mjs
 *
 * Uses Firecrawl's /map endpoint to discover all product URLs on
 * thrivesyracuse.com/menu, then scrapes each product page for its image.
 *
 * This gets us the highest-quality, brand-provided product images straight
 * from Thrive's own menu website.
 *
 * Usage:
 *   node scripts/firecrawl-thrive-images.mjs [--dry-run] [--limit=N]
 *
 * Options:
 *   --dry-run   Print matches without writing to Firestore / Storage
 *   --limit=N   Max product pages to scrape (default: 500)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '500');

const ORG_ID = 'org_thrive_syracuse';
const BUCKET_NAME = 'bakedbot-global-assets';
const STORAGE_PREFIX = `product-images/${ORG_ID}`;
const BASE_URL = 'https://thrivesyracuse.com';

// ─── Firebase Init ────────────────────────────────────────────────────────────

const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
const saMatch = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
const sa = JSON.parse(Buffer.from(saMatch[1].trim(), 'base64').toString('utf-8'));
const firecrawlKey = env.match(/FIRECRAWL_API_KEY=(.+)/)?.[1]?.trim();

if (!getApps().length) {
    initializeApp({ credential: cert(sa) });
}
const db = getFirestore();
const storage = getStorage();
db.settings({ ignoreUndefinedProperties: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Firecrawl Helpers ────────────────────────────────────────────────────────

const FC_HEADERS = {
    'Authorization': `Bearer ${firecrawlKey}`,
    'Content-Type': 'application/json',
};

/**
 * Map the site to discover all product page URLs.
 * Firecrawl's /map endpoint is fast (1-2s) and returns all links it can find.
 */
async function mapSite() {
    console.log(`\n🗺️  Mapping ${BASE_URL}/menu ...`);
    const resp = await fetch('https://api.firecrawl.dev/v1/map', {
        method: 'POST',
        headers: FC_HEADERS,
        body: JSON.stringify({
            url: `${BASE_URL}/menu`,
            includeSubdomains: false,
            limit: 2000,
        }),
        signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Map failed ${resp.status}: ${err.slice(0, 300)}`);
    }

    const data = await resp.json();
    const links = data.links ?? data.urls ?? [];
    console.log(`  Found ${links.length} URLs`);
    return links;
}

/**
 * Scrape a single product page and extract the product image.
 * Uses json extraction format which works with LLM-based parsing.
 */
async function scrapeProductPage(url) {
    const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: FC_HEADERS,
        body: JSON.stringify({
            url,
            formats: ['extract'],
            extract: {
                prompt: `This is a cannabis product detail page. Extract:
- name: the full product name
- imageUrl: the URL of the main product image (must be a real product photo, NOT a placeholder or brand logo)
Return JSON with exactly those two fields.`,
                schema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        imageUrl: { type: 'string' },
                    },
                    required: ['name'],
                },
            },
            waitFor: 1200,
        }),
        signal: AbortSignal.timeout(45_000),
    });

    if (!resp.ok) {
        const err = await resp.text();
        // 402 means out of credits — rethrow as fatal
        if (resp.status === 402) throw new Error(`OUT_OF_CREDITS: ${err.slice(0, 100)}`);
        throw new Error(`Scrape ${resp.status}: ${err.slice(0, 150)}`);
    }

    const data = await resp.json();
    return data?.extract ?? data?.data?.extract ?? null;
}

// ─── Product URL Filter ───────────────────────────────────────────────────────

/**
 * A product URL looks like:
 *   /menu/{brand-slug}/{product-slug}
 * We filter out category pages (/menu/categories/...) and the top /menu page.
 */
function isProductUrl(url) {
    try {
        const path = new URL(url).pathname;
        const parts = path.replace(/\/$/, '').split('/').filter(Boolean);
        // Must be /menu/{something}/{something}
        return parts.length === 3 && parts[0] === 'menu' && parts[1] !== 'categories' && parts[1] !== 'cart' && parts[1] !== 'search';
    } catch {
        return false;
    }
}

// ─── String Utils ─────────────────────────────────────────────────────────────

function normalize(s) {
    return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function safeFilename(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

// ─── Firebase Storage Upload ──────────────────────────────────────────────────

async function downloadAndUpload(imageUrl, productName, brandName) {
    const brand = safeFilename(brandName || 'generic');
    const product = safeFilename(productName);
    const ext = imageUrl.match(/\.(jpe?g|png|webp|avif)/i)?.[1]?.toLowerCase() ?? 'jpg';
    const storagePath = `${STORAGE_PREFIX}/${brand}/${product}.${ext}`;

    const file = storage.bucket(BUCKET_NAME).file(storagePath);
    const [exists] = await file.exists();
    if (exists) {
        console.log(`    ♻️  Reusing cached`);
        return `https://storage.googleapis.com/${BUCKET_NAME}/${storagePath}`;
    }

    const imgResp = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(20_000),
    });
    if (!imgResp.ok) throw new Error(`Download failed: ${imgResp.status}`);

    const buffer = Buffer.from(await imgResp.arrayBuffer());
    if (buffer.length < 500) throw new Error(`Image too small (${buffer.length} bytes) — likely placeholder`);

    const contentType = imgResp.headers.get('content-type') ?? `image/${ext}`;

    await file.save(buffer, {
        metadata: {
            contentType,
            metadata: { source: 'thrivesyracuse.com', productName, scrapedAt: new Date().toISOString() },
        },
    });
    await file.makePublic();
    return `https://storage.googleapis.com/${BUCKET_NAME}/${storagePath}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n🌿 Firecrawl Thrive Image Scraper (Map + Scrape)`);
    console.log(`   Dry run: ${DRY_RUN} | Limit: ${LIMIT}`);

    // Load Firestore products
    const snap = await db.collection('tenants').doc(ORG_ID)
        .collection('publicViews').doc('products')
        .collection('items').get();

    const firestoreProducts = snap.docs.map(doc => ({
        ref: doc.ref,
        name: doc.data().name ?? '',
        normalized: normalize(doc.data().name ?? ''),
        imageUrl: doc.data().imageUrl ?? '',
        brand: doc.data().brandName ?? doc.data().brand ?? '',
    }));

    const nameIndex = new Map(firestoreProducts.map(p => [p.normalized, p]));
    const needsImage = firestoreProducts.filter(p => !p.imageUrl?.includes('storage.googleapis.com'));
    console.log(`\n📦 ${firestoreProducts.length} total | ${needsImage.length} still need GCS images`);

    // Discover product URLs via map
    const CACHE_PATH = join(__dirname, '..', 'dev', 'thrive-product-urls.json');
    let productUrls;

    if (existsSync(CACHE_PATH)) {
        productUrls = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
        console.log(`♻️  Loaded ${productUrls.length} product URLs from cache`);
    } else {
        const allUrls = await mapSite();
        productUrls = [...new Set(allUrls.filter(isProductUrl))];
        writeFileSync(CACHE_PATH, JSON.stringify(productUrls, null, 2));
        console.log(`✅ Found ${productUrls.length} product URLs`);
    }

    const limited = productUrls.slice(0, LIMIT);

    // Scrape each product page
    let updated = 0, skipped = 0, unmatched = 0, failed = 0, noImage = 0;
    const results = [];

    for (let i = 0; i < limited.length; i++) {
        const url = limited[i];
        const prefix = `[${i + 1}/${limited.length}]`;

        let extracted;
        try {
            extracted = await scrapeProductPage(url);
        } catch (err) {
            if (err.message.startsWith('OUT_OF_CREDITS')) {
                console.error(`\n❌ Out of Firecrawl credits. Stopping.`);
                break;
            }
            console.log(`${prefix} ❌ Scrape failed: ${err.message.slice(0, 80)}`);
            failed++;
            await sleep(500);
            continue;
        }

        const name = extracted?.name;
        const imageUrl = extracted?.imageUrl;

        if (!name) { noImage++; await sleep(300); continue; }
        if (!imageUrl || !imageUrl.startsWith('http')) {
            console.log(`${prefix} ⚠️  ${name.slice(0, 50)} — no image extracted`);
            noImage++;
            await sleep(300);
            continue;
        }

        // Skip obviously bad images
        if (imageUrl.includes('placeholder') || imageUrl.includes('default-') || imageUrl.includes('/icon-')) {
            noImage++;
            await sleep(300);
            continue;
        }

        // Match to Firestore
        const normName = normalize(name);
        let product = nameIndex.get(normName);
        if (!product) {
            const key = normName.slice(0, 25);
            product = firestoreProducts.find(p =>
                p.normalized.includes(key) || normName.includes(p.normalized.slice(0, 25))
            );
        }

        if (!product) {
            console.log(`${prefix} 🔍 ${name.slice(0, 50)} — no Firestore match`);
            unmatched++;
            results.push({ name, status: 'unmatched', url, imageUrl });
            await sleep(300);
            continue;
        }

        // Skip if already has GCS image
        if (product.imageUrl?.includes('storage.googleapis.com')) {
            skipped++;
            await sleep(200);
            continue;
        }

        console.log(`${prefix} ✅ ${name.slice(0, 50)}`);
        console.log(`       ${imageUrl.slice(0, 70)}`);

        if (DRY_RUN) {
            updated++;
            results.push({ name, status: 'matched_dry', imageUrl, url });
            await sleep(200);
            continue;
        }

        try {
            const publicUrl = await downloadAndUpload(imageUrl, name, product.brand);
            await product.ref.update({
                imageUrl: publicUrl,
                imageSource: 'thrive_site',
                imageUpdatedAt: new Date(),
            });
            console.log(`       ☁️  ${publicUrl.slice(0, 70)}`);
            updated++;
            results.push({ name, status: 'updated', publicUrl, url });
        } catch (err) {
            console.error(`       ❌ ${err.message}`);
            failed++;
            results.push({ name, status: 'error', error: err.message, url });
        }

        await sleep(400); // Polite rate limit
    }

    const outPath = join(__dirname, '..', 'dev', 'firecrawl-thrive-results.json');
    writeFileSync(outPath, JSON.stringify(results, null, 2));

    console.log(`\n─────────────────────────────────────────`);
    console.log(`✅ Done`);
    console.log(`   Updated:    ${updated}`);
    console.log(`   Skipped:    ${skipped} (already had GCS image)`);
    console.log(`   No image:   ${noImage}`);
    console.log(`   Unmatched:  ${unmatched}`);
    console.log(`   Errors:     ${failed}`);

    process.exit(0);
}

main().catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
});
