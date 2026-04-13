/**
 * scrape-thrive-product-images.mjs
 *
 * Backfills product images for org_thrive_syracuse using Leafly strain pages
 * (direct HTTP — no API credits needed). For each product without a real image:
 *   1. Extract strain slug(s) from the product name
 *   2. Fetch leafly.com/strains/{slug} and pull the nugImage from __NEXT_DATA__
 *   3. Download the image and re-host on Firebase Storage (bakedbot-prod.appspot.com)
 *   4. Write the public Storage URL back to Firestore
 *
 * Usage:
 *   node scripts/scrape-thrive-product-images.mjs [--dry-run] [--limit=N] [--force]
 *
 * Options:
 *   --dry-run   Print matches without writing to Firestore / Storage
 *   --limit=N   Stop after N products processed (default: all)
 *   --force     Update products that already have a non-placeholder imageUrl
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '9999');
const FORCE = args.includes('--force');

const ORG_ID = 'org_thrive_syracuse';
const BUCKET_NAME = 'bakedbot-global-assets';
const STORAGE_PREFIX = `product-images/${ORG_ID}`;
const PLACEHOLDER = '/icon-192.png';

// Leafly headers — mimics a real browser to avoid bot detection
const LEAFLY_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
};

// ─── Firebase Init ────────────────────────────────────────────────────────────

const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
const saMatch = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
const sa = JSON.parse(Buffer.from(saMatch[1].trim(), 'base64').toString('utf-8'));

if (!getApps().length) {
    initializeApp({ credential: cert(sa) });
}
const db = getFirestore();
const storage = getStorage();
db.settings({ ignoreUndefinedProperties: true });

// ─── String Utilities ─────────────────────────────────────────────────────────

function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function isSizeToken(s) {
    return /^\d+(?:\.\d+)?\s*(?:mg|g|oz|ml|pk|ct|pack|count)$/i.test(s.trim())
        || /^\d+[-]?(?:pk|x|ct|count)$/i.test(s.trim())
        || /^x\d+$/i.test(s.trim());
}

function containsCategoryWord(s) {
    return /\b(?:aio|pre[-\s]?roll|flower|vape|vapor|cartridge|cart|live\s*resin|live\s*rosin|rosin|wax|shatter|distillate|concentrate|tincture|gumm(?:y|ies)|edible|capsule|oil|extract|hash|kief|badder|sugar|sauce|infused|infusion|single|twin|double|liquid\s*diamonds?)\b/i.test(s);
}

/**
 * Extract Leafly-compatible strain slugs from an Alleaves product name.
 * Handles: "Brand - Category - Strain - Size" and "Simple Strain Name"
 */
function extractStrainSlugs(productName) {
    const slugs = new Set();

    // Strategy 1: Alleaves dash-separated — "Jaunty - AIO - Blue Dream - 1.5g"
    const dashParts = productName.split(/\s+[-–]\s+/);
    if (dashParts.length >= 3) {
        const strainParts = dashParts
            .slice(1)
            .filter(p => !isSizeToken(p) && !containsCategoryWord(p))
            .map(p => p.replace(/\([^)]*\)/g, '').trim())
            .filter(Boolean);

        if (strainParts.length > 0) {
            const strainName = strainParts.join(' ');
            let clean = strainName
                .replace(/\d+(?:\.\d+)?\s*(?:mg|g|oz|ml|pk)\b/gi, '')
                .replace(/\b(?:sativa|indica|hybrid)\b/gi, '')
                .replace(/\s+/g, ' ').trim();

            if (clean) {
                const s = slugify(clean);
                if (s.length > 2) {
                    slugs.add(s);
                    const words = clean.split(/\s+/);
                    if (words.length >= 2) slugs.add(slugify(words.slice(0, 2).join(' ')));
                }

                // Cross strains: "Donny Burger x Strawberry Cough" → try each side
                const crossParts = clean.split(/\s+x\s+/i);
                if (crossParts.length > 1) {
                    for (const part of crossParts) {
                        const cs = slugify(part.trim());
                        if (cs.length > 3) {
                            slugs.add(cs);
                            const noNum = cs.replace(/-\d+$/, '');
                            if (noNum !== cs && noNum.length > 3) slugs.add(noNum);
                        }
                    }
                }
            }
        }
    }

    // Strategy 2: Strip known prefixes, sizes, and category words
    let clean = productName.replace(/\([^)]*\)/g, ' ');
    clean = clean.replace(/\d+(?:\.\d+)?\s*(?:mg|g|oz|ml|pack|count|ct|pk)\b/gi, '');
    clean = clean.replace(/\b\d+[-]?(?:pack|pk|x|ct|count)\b/gi, '');
    clean = clean.replace(/\bx\d+\b/gi, '');
    clean = clean.replace(/\b(?:pre[-\s]?roll|flower|vape|vapor|cartridge|cart|carts|live\s+resin|live\s+rosin|rosin|wax|shatter|distillate|concentrate|tincture|gumm(?:y|ies)|edible|capsule|oil|extract|hash|kief|badder|sugar|sauce|infused|infusion|single|twin|double|liquid\s+diamonds?|aio)\b/gi, '');
    clean = clean.replace(/\b(?:sativa|indica|hybrid|ruderalis|autoflower)\b/gi, '');
    clean = clean.replace(/\b(?:premium|select|reserve|craft|limited|special|edition)\b/gi, '');
    clean = clean.replace(/\b(?:jaunty|flowerhouse|melo|koa|nar|cannabals|cannabols|kings\s+road|revert|thrive)\s*[-–]?\s*/gi, '');
    clean = clean.replace(/\s*[-–]\s*/g, ' ');
    clean = clean.replace(/\s+/g, ' ').trim();

    if (clean.length > 2) {
        const s = slugify(clean);
        if (s.length > 2) {
            slugs.add(s);
            const words = clean.split(/\s+/);
            if (words.length >= 2) slugs.add(slugify(words.slice(0, 2).join(' ')));
            // Phenotype variant: "gelato-41" → "gelato"
            const noNum = s.replace(/-\d+$/, '');
            if (noNum !== s && noNum.length > 2) slugs.add(noNum);
        }
    }

    return Array.from(slugs).filter(s => s.length > 2);
}

// ─── Leafly Lookup ────────────────────────────────────────────────────────────

const GENERIC_IMAGE_PATTERNS = ['defaults/generic', 'defaults/dark', 'defaults/light', '/defaults/'];
function isGenericImage(url) {
    return GENERIC_IMAGE_PATTERNS.some(p => url.includes(p));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// In-memory cache so we don't re-fetch the same strain slug twice
const slugCache = new Map();

// Brand asset cache from RTRVR scrape
const RTRVR_CACHE_PATH = join(__dirname, '..', 'dev', 'rtrvr-thrive-products.json');
const DISPENSE_CATALOG_PATH = join(__dirname, '..', 'scripts', 'dispense-images-catalog.json');

let rtrvrCache = [];
let dispenseCatalog = {};

if (existsSync(RTRVR_CACHE_PATH)) {
    try {
        rtrvrCache = JSON.parse(readFileSync(RTRVR_CACHE_PATH, 'utf8'));
        console.log(`\n📂 Loaded RTRVR brand cache: ${rtrvrCache.length} products`);
    } catch {
        console.warn(`\n⚠️ Failed to load RTRVR brand cache`);
    }
}

if (existsSync(DISPENSE_CATALOG_PATH)) {
    try {
        dispenseCatalog = JSON.parse(readFileSync(DISPENSE_CATALOG_PATH, 'utf8'));
        console.log(`\n📂 Loaded Dispense brand catalog: ${Object.keys(dispenseCatalog).length} products`);
    } catch {
        console.warn(`\n⚠️ Failed to load Dispense brand catalog`);
    }
}

function findBrandImageInCache(name) {
    const norm = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

    // 1. Check Dispense Catalog (very high priority)
    if (dispenseCatalog[norm] && dispenseCatalog[norm].imageUrl && !dispenseCatalog[norm].imageUrl.includes('default-')) {
        return dispenseCatalog[norm].imageUrl;
    }

    // 2. Check RTRVR Cache
    if (rtrvrCache.length) {
        const match = rtrvrCache.find(p => {
            const pNorm = p.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
            return pNorm === norm || pNorm.includes(norm) || norm.includes(pNorm);
        });
        if (match) return match.imageUrl;
    }

    return null;
}

async function lookupLeaflyStrain(slug) {
    if (slugCache.has(slug)) return slugCache.get(slug);

    const url = `https://www.leafly.com/strains/${slug}`;
    try {
        const resp = await fetch(url, { headers: LEAFLY_HEADERS, signal: AbortSignal.timeout(15_000) });
        if (!resp.ok) {
            slugCache.set(slug, null);
            return null;
        }

        const html = await resp.text();
        const match = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/);
        if (!match?.[1]) {
            slugCache.set(slug, null);
            return null;
        }

        const data = JSON.parse(match[1]);
        const nugImage = data?.props?.pageProps?.strain?.nugImage;
        const result = (nugImage && !isGenericImage(nugImage)) ? nugImage : null;
        slugCache.set(slug, result);
        return result;
    } catch {
        slugCache.set(slug, null);
        return null;
    }
}

async function findProductImage(productName) {
    // Strategy 0: Brand Image from RTRVR cache (Thrive's own site)
    const brandUrl = findBrandImageInCache(productName);
    if (brandUrl) {
        console.log(`   💎 Found Brand Image in cache`);
        return { imageUrl: brandUrl, source: 'thrive_brand' };
    }

    const slugs = extractStrainSlugs(productName);
    for (const slug of slugs) {
        const imageUrl = await lookupLeaflyStrain(slug);
        if (imageUrl) return { imageUrl, slug, source: 'leafly' };
        await sleep(300); // ~3 req/sec — polite to Leafly
    }
    return null;
}

// ─── Image Download + Firebase Storage Upload ─────────────────────────────────

function safeFilename(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

async function downloadAndUpload(imageUrl, productName, brandName) {
    const brand = safeFilename(brandName || 'generic');
    const product = safeFilename(productName);
    const ext = imageUrl.match(/\.(jpe?g|png|webp)/i)?.[1]?.toLowerCase() ?? 'jpg';
    const storagePath = `${STORAGE_PREFIX}/${brand}/${product}.${ext}`;

    // Reuse if already uploaded
    const file = storage.bucket(BUCKET_NAME).file(storagePath);
    const [exists] = await file.exists();
    if (exists) {
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${storagePath}`;
        console.log(`    ♻️  Reusing cached upload`);
        return publicUrl;
    }

    const imgResp = await fetch(imageUrl, { signal: AbortSignal.timeout(20_000) });
    if (!imgResp.ok) throw new Error(`Image download failed: ${imgResp.status} ${imageUrl}`);

    const buffer = Buffer.from(await imgResp.arrayBuffer());
    const contentType = imgResp.headers.get('content-type') ?? `image/${ext}`;

    await file.save(buffer, {
        metadata: {
            contentType,
            metadata: {
                source: 'leafly.com',
                productName,
                scrapedAt: new Date().toISOString(),
            },
        },
    });
    await file.makePublic();

    return `https://storage.googleapis.com/${BUCKET_NAME}/${storagePath}`;
}

// ─── Firestore Helpers ────────────────────────────────────────────────────────

async function loadProductsNeedingImages() {
    const snap = await db.collection('tenants').doc(ORG_ID)
        .collection('publicViews').doc('products')
        .collection('items').get();

    return snap.docs
        .map(doc => ({
            docRef: doc.ref,
            docId: doc.id,
            name: doc.data().name ?? '',
            brand: doc.data().brandName ?? doc.data().brand ?? '',
            imageUrl: doc.data().imageUrl ?? '',
            category: doc.data().category ?? '',
        }))
        .filter(p => {
            if (FORCE) return true;
            const url = p.imageUrl;
            return !url || url === PLACEHOLDER || url === '' || url.includes('placeholder');
        });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n🌿 Thrive Product Image Scraper (Leafly Edition)`);
    console.log(`   Org:     ${ORG_ID}`);
    console.log(`   Bucket:  ${BUCKET_NAME}`);
    console.log(`   Dry run: ${DRY_RUN}`);
    console.log(`   Limit:   ${LIMIT}`);
    console.log(`   Force:   ${FORCE}`);

    const products = await loadProductsNeedingImages();
    console.log(`\n📦 Products needing images: ${products.length}`);

    let updated = 0, notFound = 0, failed = 0;
    const results = [];

    for (const product of products) {
        if (updated + notFound + failed >= LIMIT) break;

        console.log(`\n[${updated + notFound + failed + 1}/${Math.min(products.length, LIMIT)}] ${product.name.slice(0, 60)}`);

        const found = await findProductImage(product.name);
        if (!found) {
            console.log(`   ⚠️  No Leafly match`);
            notFound++;
            results.push({ name: product.name, status: 'not_found' });
            continue;
        }

        console.log(`   ✅ Leafly slug: ${found.slug} → ${found.imageUrl.slice(0, 60)}`);

        if (DRY_RUN) {
            console.log(`   [DRY RUN] Would upload and update Firestore`);
            updated++;
            results.push({ name: product.name, status: 'matched', slug: found.slug, imageUrl: found.imageUrl });
            continue;
        }

        try {
            const publicUrl = await downloadAndUpload(found.imageUrl, product.name, product.brand);
            await product.docRef.update({
                imageUrl: publicUrl,
                imageSource: found.source || 'leafly',
                imageUpdatedAt: new Date(),
            });
            console.log(`   ☁️  Stored: ${publicUrl}`);
            updated++;
            results.push({ name: product.name, status: 'updated', slug: found.slug, publicUrl, source: found.source });
        } catch (err) {
            console.error(`   ❌ Error: ${err.message}`);
            failed++;
            results.push({ name: product.name, status: 'error', error: err.message });
        }
    }

    // Save full results for review
    const debugPath = join(__dirname, '..', 'dev', 'thrive-image-sync-results.json');
    writeFileSync(debugPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to dev/thrive-image-sync-results.json`);

    console.log(`\n─────────────────────────────────────────`);
    console.log(`✅ Done`);
    console.log(`   Updated:    ${updated}`);
    console.log(`   Not found:  ${notFound} (no Leafly strain match)`);
    console.log(`   Errors:     ${failed}`);
    console.log(`   Coverage:   ${Math.round((updated / (updated + notFound || 1)) * 100)}% of searchable products`);

    process.exit(0);
}

main().catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
});
