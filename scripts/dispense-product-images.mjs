/**
 * dispense-product-images.mjs
 *
 * Fetches product images for all Thrive Syracuse products from individual
 * Dispense product pages (discovered via sitemap.xml).
 *
 * Strategy: Each product page has "Image of {product name}" as the 4th image.
 * Jina renders the JS and returns it in markdown format.
 *
 * Usage:
 *   node scripts/dispense-product-images.mjs [--dry-run] [--limit=N] [--offset=N]
 *
 * Runs at ~2 req/sec (500ms between pages). Full run: ~800 products ≈ 7 min.
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
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '9999');
const OFFSET = parseInt(args.find(a => a.startsWith('--offset='))?.split('=')[1] ?? '0');

const BUCKET = 'bakedbot-global-assets';
const ORG_ID = 'org_thrive_syracuse';
const SITEMAP_URL = 'https://thrivesyracuse.com/menu/sitemap.xml';

// ─── Firebase ──────────────────────────────────────────────────────────────────

const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
const sa = JSON.parse(Buffer.from(env.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/)[1].trim(), 'base64').toString('utf-8'));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
const storage = getStorage();
db.settings({ ignoreUndefinedProperties: true });

// ─── Jina fetch ────────────────────────────────────────────────────────────────

function jinaFetch(url, timeoutMs = 45_000) {
    return new Promise((resolve, reject) => {
        const req = https.request('https://r.jina.ai/' + url, {
            method: 'GET',
            headers: {
                'X-With-Images-Summary': 'all',
                'X-Return-Format': 'markdown',
                'Accept': 'text/markdown',
            },
            timeout: timeoutMs,
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(data));
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('Jina timeout')); });
        req.on('error', reject);
        req.end();
    });
}

function httpGet(url, timeoutMs = 30_000) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'GET',
            headers: { 'Accept': 'text/xml,application/xml,*/*', 'User-Agent': 'Mozilla/5.0' },
            timeout: timeoutMs,
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(data));
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('HTTP timeout')); });
        req.on('error', reject);
        req.end();
    });
}

// ─── Parse sitemap ─────────────────────────────────────────────────────────────

function parseSitemap(xml) {
    const urls = [];
    for (const m of xml.matchAll(/<loc>(https:\/\/thrivesyracuse\.com\/menu\/[^<]+)<\/loc>/g)) {
        const url = m[1];
        // Extract product slug (last path segment) and brand (second-to-last)
        const parts = url.split('/');
        const productSlug = parts[parts.length - 1];
        const brandSlug = parts[parts.length - 2];
        if (productSlug && brandSlug) {
            urls.push({ url, productSlug, brandSlug });
        }
    }
    return urls;
}

// ─── Extract product image from Jina markdown ──────────────────────────────────

function extractProductImage(markdown) {
    // Individual product pages: "Image 4: Image of {product name}"
    const match = markdown.match(/!\[Image \d+: Image of ([^\]]+)\]\((https:\/\/dispense-images\.imgix\.net\/[^)]+)\)/);
    if (match) {
        return { name: match[1].trim(), imageUrl: match[2].split('?')[0] };
    }
    // Fallback: first dispense product image (not logo/icon)
    const NON_PRODUCT = /^(store-logo|logo|icon|Offers|Thrive Syracuse)/i;
    const all = [...markdown.matchAll(/!\[Image \d+: ([^\]]+)\]\((https:\/\/dispense-images\.imgix\.net\/13455748[^)]+)\)/g)];
    const product = all.find(m => !NON_PRODUCT.test(m[1]));
    if (product) return { name: product[1].trim(), imageUrl: product[2].split('?')[0] };
    return null;
}

// ─── Normalise for matching ─────────────────────────────────────────────────────

function normalize(s) {
    return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function safeFilename(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

// ─── Upload ───────────────────────────────────────────────────────────────────

async function uploadImage(imageUrl, productName, brand) {
    const ext = 'jpg';
    const storagePath = `product-images/${ORG_ID}/${safeFilename(brand || 'brand')}/${safeFilename(productName)}.${ext}`;
    const file = storage.bucket(BUCKET).file(storagePath);
    const [exists] = await file.exists();
    if (exists) return `https://storage.googleapis.com/${BUCKET}/${storagePath}`;

    const fetchUrl = imageUrl + '?w=400&auto=format&q=85';
    const resp = await fetch(fetchUrl, { signal: AbortSignal.timeout(20_000) });
    if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);

    const buffer = Buffer.from(await resp.arrayBuffer());
    const contentType = resp.headers.get('content-type') ?? 'image/jpeg';
    await file.save(buffer, {
        metadata: { contentType, metadata: { source: 'thrivesyracuse.com/dispense', productName, scrapedAt: new Date().toISOString() } },
    });
    await file.makePublic();
    return `https://storage.googleapis.com/${BUCKET}/${storagePath}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n🌿 Dispense Product Image Scraper`);
    console.log(`   Dry run: ${DRY_RUN}  Limit: ${LIMIT}  Offset: ${OFFSET}`);

    // Load sitemap
    console.log(`\n📋 Fetching sitemap...`);
    const xml = await httpGet(SITEMAP_URL);
    const sitemapUrls = parseSitemap(xml);
    console.log(`   Found ${sitemapUrls.length} product URLs`);

    // Load Firestore products (only those missing images)
    const snap = await db.collection('tenants').doc(ORG_ID)
        .collection('publicViews').doc('products').collection('items').get();

    const allProducts = snap.docs.map(doc => ({
        ref: doc.ref,
        name: doc.data().name ?? '',
        normalized: normalize(doc.data().name ?? ''),
        imageUrl: doc.data().imageUrl ?? '',
        brand: doc.data().brandName ?? '',
    }));

    // Only process products without GCS images
    const needsImage = new Map(
        allProducts
            .filter(p => !p.imageUrl.includes('storage.googleapis.com'))
            .map(p => [p.normalized, p])
    );
    console.log(`   Products needing images: ${needsImage.size}`);

    // Build sitemap slug → normalized name lookup
    // Slug "1937-distillate-vape-1g-cartridge-ice-cream-cake" → normalize → match
    function slugToNormalized(slug) {
        return slug.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    }

    const catalogPath = join(__dirname, '..', 'dev', 'dispense-product-catalog.json');
    const catalog = [];

    let updated = 0, skipped = 0, noMatch = 0, noImage = 0, failed = 0;
    let processed = 0;

    const pagesToProcess = sitemapUrls.slice(OFFSET, OFFSET + LIMIT);
    console.log(`\n🔍 Processing ${pagesToProcess.length} pages...`);

    for (const { url, productSlug, brandSlug } of pagesToProcess) {
        processed++;
        if (processed % 50 === 0) {
            console.log(`  [${processed}/${pagesToProcess.length}] updated=${updated} noMatch=${noMatch} noImage=${noImage}`);
        }

        // Try to find matching Firestore product by slug
        const slugNorm = normalize(slugToNormalized(productSlug));
        let product = needsImage.get(slugNorm);

        // Fuzzy match if exact miss
        if (!product) {
            // Try partial: first 20 chars of slug
            const partial = slugNorm.slice(0, 20);
            for (const [key, val] of needsImage) {
                if (key.startsWith(partial) || partial.startsWith(key.slice(0, 20))) {
                    product = val;
                    break;
                }
            }
        }

        if (!product) {
            noMatch++;
            continue;
        }

        if (DRY_RUN) {
            console.log(`  [DRY] ${product.name.slice(0, 55)}`);
            updated++;
            continue;
        }

        try {
            const markdown = await jinaFetch(url);
            const found = extractProductImage(markdown);

            if (!found) {
                noImage++;
                continue;
            }

            catalog.push({ name: found.name, imageUrl: found.imageUrl, firestoreName: product.name });

            const publicUrl = await uploadImage(found.imageUrl, product.name, product.brand);
            await product.ref.update({
                imageUrl: publicUrl,
                imageSource: 'dispense',
                imageUpdatedAt: new Date(),
            });

            // Remove from needsImage so we don't process duplicates
            needsImage.delete(product.normalized);

            updated++;
        } catch (err) {
            console.error(`  ❌ ${product.name.slice(0, 40)}: ${err.message}`);
            failed++;
        }

        // 500ms polite delay (~2 req/sec)
        await new Promise(r => setTimeout(r, 500));
    }

    writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));

    console.log(`\n─────────────────────────────────────────`);
    console.log(`✅ Done`);
    console.log(`   Updated:   ${updated}`);
    console.log(`   Skipped:   ${skipped}`);
    console.log(`   No match:  ${noMatch}`);
    console.log(`   No image:  ${noImage}`);
    console.log(`   Errors:    ${failed}`);
    console.log(`\n   Run with --offset=${OFFSET + pagesToProcess.length} for next batch`);
    process.exit(0);
}

main().catch(err => {
    console.error('\n💥', err.message);
    process.exit(1);
});
