/**
 * rtrvr-thrive-images.mjs
 *
 * Scrapes product images from thrivesyracuse.com using RTRVR browser automation.
 * Processes one category at a time to avoid timeouts, then uploads to GCS
 * and backfills Firestore.
 *
 * Usage:
 *   node scripts/rtrvr-thrive-images.mjs [--dry-run] [--category=flower]
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

// ─── Firebase ─────────────────────────────────────────────────────────────────

const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
const saMatch = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
const sa = JSON.parse(Buffer.from(saMatch[1].trim(), 'base64').toString('utf-8'));
const rtrvrKey = env.match(/RTRVR_API_KEY=(.+)/)?.[1]?.trim();

if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
const storage = getStorage();
db.settings({ ignoreUndefinedProperties: true });

// ─── RTRVR call via https (bypasses Node fetch timeout) ───────────────────────

async function rtrvrAgent(task, url, timeoutMs = 300_000) {
    const body = JSON.stringify({
        input: task,
        urls: [url],
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.rtrvr.ai',
            path: '/agent',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${rtrvrKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
            timeout: timeoutMs,
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { resolve({ raw: data }); }
            });
        });
        req.on('timeout', () => { req.destroy(); reject(new Error(`RTRVR timeout after ${timeoutMs}ms`)); });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function parseProducts(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw?.json && Array.isArray(raw.json)) return raw.json;
    if (typeof raw === 'string') {
        const m = raw.match(/\[[\s\S]*?\]/);
        if (m) { try { return JSON.parse(m[0]); } catch {} }
    }
    return [];
}

// ─── Categories to scrape ─────────────────────────────────────────────────────

const CATEGORIES = [
    { name: 'flower',       url: 'https://thrivesyracuse.com/menu/?category=flower' },
    { name: 'pre-rolls',    url: 'https://thrivesyracuse.com/menu/?category=pre-rolls' },
    { name: 'vapes',        url: 'https://thrivesyracuse.com/menu/?category=vapes' },
    { name: 'concentrates', url: 'https://thrivesyracuse.com/menu/?category=concentrates' },
    { name: 'edibles',      url: 'https://thrivesyracuse.com/menu/?category=edibles' },
    { name: 'tinctures',    url: 'https://thrivesyracuse.com/menu/?category=tinctures' },
    { name: 'topicals',     url: 'https://thrivesyracuse.com/menu/?category=topicals' },
].filter(c => !CATEGORY_FILTER || c.name === CATEGORY_FILTER);

// ─── Matching & upload ────────────────────────────────────────────────────────

function normalize(s) {
    return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function safeFilename(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

async function uploadImage(imageUrl, productName, brand) {
    const ext = imageUrl.match(/\.(jpe?g|png|webp)/i)?.[1]?.toLowerCase() ?? 'jpg';
    const storagePath = `product-images/${ORG_ID}/${safeFilename(brand || 'brand')}/${safeFilename(productName)}.${ext}`;

    const file = storage.bucket(BUCKET).file(storagePath);
    const [exists] = await file.exists();
    if (exists) {
        return `https://storage.googleapis.com/${BUCKET}/${storagePath}`;
    }

    const resp = await fetch(imageUrl, { signal: AbortSignal.timeout(20_000) });
    if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
    const buffer = Buffer.from(await resp.arrayBuffer());
    const contentType = resp.headers.get('content-type') ?? `image/${ext}`;

    await file.save(buffer, { metadata: { contentType, metadata: { source: 'thrivesyracuse.com', productName } } });
    await file.makePublic();
    return `https://storage.googleapis.com/${BUCKET}/${storagePath}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n🌿 RTRVR Thrive Image Scraper`);
    console.log(`   Dry run: ${DRY_RUN}`);
    if (CATEGORY_FILTER) console.log(`   Category: ${CATEGORY_FILTER}`);

    // Load Firestore products for matching
    const snap = await db.collection('tenants').doc(ORG_ID)
        .collection('publicViews').doc('products').collection('items').get();
    const firestoreProducts = snap.docs.map(doc => ({
        ref: doc.ref,
        name: doc.data().name ?? '',
        normalized: normalize(doc.data().name ?? ''),
        imageUrl: doc.data().imageUrl ?? '',
        brand: doc.data().brandName ?? '',
    }));
    console.log(`\n📦 Loaded ${firestoreProducts.length} Firestore products`);

    // Build name index
    const nameIndex = new Map(firestoreProducts.map(p => [p.normalized, p]));

    // Collect all scraped products across categories
    const allScraped = [];
    const catalogPath = join(__dirname, '..', 'dev', 'rtrvr-thrive-products.json');

    // Resume from cached catalog if exists
    if (existsSync(catalogPath)) {
        const cached = JSON.parse(readFileSync(catalogPath, 'utf8'));
        if (cached.length > 0) {
            console.log(`\n♻️  Resuming from cached catalog: ${cached.length} products`);
            allScraped.push(...cached);
        }
    }

    if (allScraped.length === 0) {
        // Scrape each category
        for (const cat of CATEGORIES) {
            console.log(`\n📡 Scraping: ${cat.name} (${cat.url})`);
            try {
                const data = await rtrvrAgent(
                    `Go to this dispensary menu page. Wait for the product grid to load (2-3 seconds).
For EVERY product card visible, extract:
- "name": the full product name text
- "imageUrl": the complete src URL of the product image

Scroll down to load more products. Return ONLY a JSON array: [{"name":"...","imageUrl":"..."}]
Do not include products without images.`,
                    cat.url,
                    300_000 // 5 min per category
                );

                console.log('  Credits left:', data.userUsageData?.creditsLeft ?? 'unknown');
                const products = parseProducts(data.result ?? data.output ?? '');
                const withImages = products.filter(p => p?.name && p?.imageUrl && p.imageUrl.startsWith('http'));
                console.log(`  ✅ ${withImages.length} products with images`);
                allScraped.push(...withImages);

                // Cache after each category in case we need to resume
                writeFileSync(catalogPath, JSON.stringify(allScraped, null, 2));
            } catch (err) {
                console.error(`  ❌ Failed: ${err.message}`);
            }
        }
    }

    console.log(`\n📋 Total scraped: ${allScraped.length} products`);

    // Deduplicate by name
    const seen = new Set();
    const deduped = allScraped.filter(p => {
        const key = normalize(p.name);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    console.log(`   Deduplicated: ${deduped.length} unique`);

    // Match and upload
    let updated = 0, unmatched = 0, skipped = 0, failed = 0;

    for (const scraped of deduped) {
        const normScraped = normalize(scraped.name);
        const fsMatch = nameIndex.get(normScraped);

        if (!fsMatch) {
            // Try partial match (first 25 chars)
            const partial = firestoreProducts.find(p =>
                p.normalized.includes(normScraped.slice(0, 25)) ||
                normScraped.includes(p.normalized.slice(0, 25))
            );
            if (!partial) { unmatched++; continue; }
            Object.assign(scraped, { _matched: partial });
        }

        const product = fsMatch ?? scraped._matched;

        // Skip if already has a real GCS image
        if (!DRY_RUN && product.imageUrl?.includes('storage.googleapis.com')) {
            skipped++;
            continue;
        }

        console.log(`\n🔗 ${scraped.name.slice(0, 55)}`);
        console.log(`   img: ${scraped.imageUrl.slice(0, 70)}`);

        if (DRY_RUN) { updated++; continue; }

        try {
            const publicUrl = await uploadImage(scraped.imageUrl, scraped.name, product.brand);
            await product.ref.update({ imageUrl: publicUrl, imageSource: 'rtrvr', imageUpdatedAt: new Date() });
            console.log(`   ☁️  ${publicUrl.slice(0, 70)}`);
            updated++;
        } catch (err) {
            console.error(`   ❌ ${err.message}`);
            failed++;
        }
    }

    // Save final results
    writeFileSync(catalogPath, JSON.stringify(deduped, null, 2));

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
