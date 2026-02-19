'use server';

/**
 * WeedMaps NY Brand Image Sync
 *
 * Crawls WeedMaps' undocumented JSON API to extract product images for all
 * NY cannabis brands, matches them to BakedBot Firestore products, and
 * re-hosts images on Firebase Storage so product cards look real.
 *
 * Architecture:
 *  1. GET /discovery/v1/listings  — All NY dispensaries (paginated)
 *  2. GET /listings/{slug}/menu_items — Products + CDN image URLs per dispensary
 *  3. Build brand→product→imageUrl catalog
 *  4. Match to Firestore products by normalized (brand, name)
 *  5. Download image → Firebase Storage → update product.imageUrl in Firestore
 *
 * Rate limit: 2 req/sec against WeedMaps API
 * Storage path: product-images/{brand-slug}/{product-slug}.{ext}
 */

import { getAdminFirestore } from '@/firebase/admin';
import { getStorage } from 'firebase-admin/storage';
import { logger } from '@/lib/logger';

// ============================================================================
// WEEDMAPS API TYPES
// ============================================================================

const WM_API = 'https://api.weedmaps.com/discovery/v1';

const WM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://weedmaps.com/',
    'Origin': 'https://weedmaps.com',
};

interface WMDispensary {
    id: string;
    slug: string;
    name: string;
    city: string;
    state_abbreviation: string;
    license_type: string;
    status: string;
}

interface WMMenuItemPhoto {
    urls: {
        original: string;
        small?: string;
        medium?: string;
        large?: string;
    };
}

interface WMMenuItem {
    id: string;
    name: string;
    brand: { name: string; slug: string } | null;
    category: { name: string; slug: string } | null;
    photos: WMMenuItemPhoto[];
    prices: Array<{ price: number; unit: string }>;
    available: boolean;
}

interface WMMenuResponse {
    data: {
        menu_items: WMMenuItem[];
        meta?: { total_count: number };
    };
}

interface WMListingsResponse {
    data: {
        listings: WMDispensary[];
        meta: {
            total_count: number;
            page: number;
            per_page: number;
        };
    };
}

// ============================================================================
// SYNC RESULT TYPES
// ============================================================================

export interface ImageSyncResult {
    orgId: string;
    runAt: Date;
    dispensariesScanned: number;
    brandsFound: number;
    productImagesFound: number;
    productsMatched: number;
    productsUpdated: number;
    productsFailed: number;
    durationMs: number;
}

export interface WMProductImage {
    brand: string;
    name: string;
    imageUrl: string;           // WeedMaps CDN URL
    category: string;
    dispensarySlug: string;
}

// ============================================================================
// WEEDMAPS API HELPERS
// ============================================================================

/** Sleep helper for rate limiting */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Normalize brand/product name for fuzzy matching */
function normalize(s: string): string {
    return s
        .toLowerCase()
        .replace(/\(.*?\)/g, '')        // remove parenthetical suffixes
        .replace(/[^a-z0-9]/g, ' ')     // special chars → spaces
        .replace(/\s+/g, ' ')           // collapse whitespace
        .trim();
}

/** Slugify a string for Storage paths */
function slugify(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Fetch all NY dispensaries from WeedMaps API (paginated)
 */
export async function fetchNYDispensaries(maxPages = 20): Promise<WMDispensary[]> {
    const all: WMDispensary[] = [];
    const perPage = 100;

    for (let page = 1; page <= maxPages; page++) {
        try {
            const url = `${WM_API}/listings?filter[state_abbreviation]=NY&filter[license_type]=dispensary&filter[status]=open&page[limit]=${perPage}&page[offset]=${(page - 1) * perPage}`;
            const resp = await fetch(url, { headers: WM_HEADERS });

            if (!resp.ok) {
                logger.warn('[WM_IMAGE_SYNC] Dispensary fetch failed', { page, status: resp.status });
                break;
            }

            const json: WMListingsResponse = await resp.json();
            const listings = json?.data?.listings || [];
            all.push(...listings);

            logger.info('[WM_IMAGE_SYNC] Fetched dispensary page', { page, count: listings.length, total: all.length });

            if (listings.length < perPage) break; // last page
            await sleep(500); // 2 req/sec
        } catch (err) {
            logger.warn('[WM_IMAGE_SYNC] Dispensary page error', { page, err: String(err) });
            break;
        }
    }

    logger.info('[WM_IMAGE_SYNC] Total NY dispensaries', { count: all.length });
    return all;
}

/**
 * Fetch all menu items with images for a single dispensary
 * Returns only items that have at least one photo
 */
export async function fetchDispensaryImages(dispensarySlug: string): Promise<WMProductImage[]> {
    const results: WMProductImage[] = [];
    const perPage = 100;
    let page = 1;
    let fetched = 0;

    while (true) {
        try {
            const url = `${WM_API}/listings/${dispensarySlug}/menu_items?page[limit]=${perPage}&page[offset]=${(page - 1) * perPage}`;
            const resp = await fetch(url, { headers: WM_HEADERS });

            if (!resp.ok) {
                if (resp.status === 404) break; // Dispensary has no menu in API
                logger.warn('[WM_IMAGE_SYNC] Menu fetch failed', { dispensarySlug, page, status: resp.status });
                break;
            }

            const json: WMMenuResponse = await resp.json();
            const items = json?.data?.menu_items || [];
            fetched += items.length;

            for (const item of items) {
                if (!item.photos?.length) continue;
                const imageUrl = item.photos[0].urls.large
                    || item.photos[0].urls.medium
                    || item.photos[0].urls.original;
                if (!imageUrl) continue;

                results.push({
                    brand: item.brand?.name || '',
                    name: item.name,
                    imageUrl,
                    category: item.category?.name || 'Other',
                    dispensarySlug,
                });
            }

            if (items.length < perPage) break;
            page++;
            await sleep(500);
        } catch (err) {
            logger.warn('[WM_IMAGE_SYNC] Menu page error', { dispensarySlug, page, err: String(err) });
            break;
        }
    }

    logger.debug('[WM_IMAGE_SYNC] Dispensary scanned', { dispensarySlug, total: fetched, withImages: results.length });
    return results;
}

/**
 * Build a brand→product→imageUrl catalog from all NY WeedMaps dispensaries.
 * Key: `${normBrand}||${normName}` → imageUrl (first match wins)
 *
 * This is the expensive step (100+ dispensaries × 100+ products each).
 * Results are stored in Firestore `wm_image_catalog` for reuse.
 */
export async function buildNYImageCatalog(): Promise<Map<string, string>> {
    const catalog = new Map<string, string>(); // normalized key → imageUrl
    const db = getAdminFirestore();

    const dispensaries = await fetchNYDispensaries();
    logger.info('[WM_IMAGE_SYNC] Building catalog from dispensaries', { count: dispensaries.length });

    let dispensaryCount = 0;
    for (const dispensary of dispensaries) {
        const images = await fetchDispensaryImages(dispensary.slug);

        for (const img of images) {
            const key = `${normalize(img.brand)}||${normalize(img.name)}`;
            if (!catalog.has(key) && img.imageUrl) {
                catalog.set(key, img.imageUrl);
            }
        }

        dispensaryCount++;
        if (dispensaryCount % 10 === 0) {
            logger.info('[WM_IMAGE_SYNC] Catalog progress', { dispensaryCount, catalogSize: catalog.size });
        }

        await sleep(500); // rate limit
    }

    // Persist catalog to Firestore for faster subsequent runs
    const catalogDoc = db.collection('wm_image_catalog').doc('ny');
    await catalogDoc.set({
        entries: Object.fromEntries(catalog),
        builtAt: new Date(),
        dispensaryCount,
        entryCount: catalog.size,
    });

    logger.info('[WM_IMAGE_SYNC] Catalog built and saved', {
        dispensaries: dispensaryCount,
        entries: catalog.size,
    });

    return catalog;
}

/**
 * Load catalog from Firestore (if built within last 7 days), else rebuild.
 */
export async function getOrBuildCatalog(forceRebuild = false): Promise<Map<string, string>> {
    if (!forceRebuild) {
        const db = getAdminFirestore();
        try {
            const doc = await db.collection('wm_image_catalog').doc('ny').get();
            if (doc.exists) {
                const data = doc.data()!;
                const ageMs = Date.now() - (data.builtAt?.toDate?.()?.getTime() || 0);
                const sevenDays = 7 * 24 * 60 * 60 * 1000;
                if (ageMs < sevenDays && data.entries) {
                    const map = new Map<string, string>(Object.entries(data.entries));
                    logger.info('[WM_IMAGE_SYNC] Loaded catalog from Firestore', { size: map.size });
                    return map;
                }
            }
        } catch (err) {
            logger.warn('[WM_IMAGE_SYNC] Catalog load failed, rebuilding', { err: String(err) });
        }
    }

    return buildNYImageCatalog();
}

// ============================================================================
// IMAGE DOWNLOAD + FIREBASE STORAGE
// ============================================================================

/**
 * Download an image from WeedMaps CDN and upload to Firebase Storage.
 * Returns the public signed URL, or null on failure.
 */
async function storeProductImage(
    wmImageUrl: string,
    brand: string,
    productName: string
): Promise<string | null> {
    try {
        // Download from WeedMaps CDN
        const resp = await fetch(wmImageUrl, { headers: { 'Referer': 'https://weedmaps.com/' } });
        if (!resp.ok) return null;

        const contentType = resp.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await resp.arrayBuffer());
        if (buffer.length < 1000) return null; // Skip tiny/corrupt images

        // Determine extension
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';

        // Storage path: product-images/{brand-slug}/{product-slug}.{ext}
        const brandSlug = slugify(brand) || 'unknown-brand';
        const productSlug = slugify(productName) || `product-${Date.now()}`;
        const storagePath = `product-images/${brandSlug}/${productSlug}.${ext}`;

        // Upload to Firebase Storage
        const bucket = getStorage().bucket();
        const fileRef = bucket.file(storagePath);

        await fileRef.save(buffer, {
            contentType,
            metadata: {
                metadata: {
                    source: 'weedmaps',
                    brand,
                    productName,
                    originalUrl: wmImageUrl,
                    syncedAt: new Date().toISOString(),
                },
            },
        });

        // Generate signed URL (100 year expiry)
        const [signedUrl] = await fileRef.getSignedUrl({
            action: 'read',
            expires: '01-01-2125',
        });

        return signedUrl;
    } catch (err) {
        logger.warn('[WM_IMAGE_SYNC] Image store failed', { wmImageUrl, err: String(err) });
        return null;
    }
}

// ============================================================================
// MATCH + UPDATE FIRESTORE
// ============================================================================

const PLACEHOLDER = '/icon-192.png'; // Current placeholder (never overwrite real images)

/**
 * Sync WeedMaps images to Firestore products for a given org.
 *
 * Only updates products that:
 * - Have imageUrl === placeholder or imageUrl is missing
 * - Match catalog by (brand, name)
 */
export async function syncOrgProductImages(
    orgId: string,
    catalog: Map<string, string>,
    dryRun = false
): Promise<{ matched: number; updated: number; failed: number }> {
    const db = getAdminFirestore();

    // Fetch all products for this org that need images
    const productsSnap = await db
        .collection('products')
        .where('orgId', '==', orgId)
        .get();

    const needsImage = productsSnap.docs.filter(doc => {
        const data = doc.data();
        return !data.imageUrl || data.imageUrl === PLACEHOLDER || data.imageUrl === '';
    });

    logger.info('[WM_IMAGE_SYNC] Products needing images', { orgId, total: productsSnap.size, needsImage: needsImage.length });

    let matched = 0;
    let updated = 0;
    let failed = 0;

    for (const doc of needsImage) {
        const product = doc.data();
        const brand = product.brand || '';
        const name = product.name || '';

        // Try exact normalized match first
        const key = `${normalize(brand)}||${normalize(name)}`;
        let wmImageUrl = catalog.get(key);

        // If no exact match, try brand-only prefix search (e.g. "Flower" vs "Flower 3.5g")
        if (!wmImageUrl) {
            const normBrand = normalize(brand);
            const normName = normalize(name);
            for (const [k, v] of catalog) {
                const [kb, kn] = k.split('||');
                if (kb === normBrand && (kn.startsWith(normName.substring(0, 10)) || normName.startsWith(kn.substring(0, 10)))) {
                    wmImageUrl = v;
                    break;
                }
            }
        }

        if (!wmImageUrl) continue;
        matched++;

        if (dryRun) {
            logger.debug('[WM_IMAGE_SYNC] DRY RUN match', { name, brand, wmImageUrl });
            continue;
        }

        // Download + re-host on Firebase Storage
        const storedUrl = await storeProductImage(wmImageUrl, brand, name);
        if (storedUrl) {
            await doc.ref.update({ imageUrl: storedUrl, imageSource: 'weedmaps', imageUpdatedAt: new Date() });
            updated++;
            logger.debug('[WM_IMAGE_SYNC] Updated product image', { name, brand });
        } else {
            // Fallback: use WeedMaps CDN URL directly (not ideal but better than placeholder)
            await doc.ref.update({ imageUrl: wmImageUrl, imageSource: 'weedmaps_cdn', imageUpdatedAt: new Date() });
            updated++;
        }

        // Brief pause to avoid hammering WeedMaps CDN
        await sleep(200);
    }

    logger.info('[WM_IMAGE_SYNC] Org sync complete', { orgId, matched, updated, failed });
    return { matched, updated, failed };
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Full sync: build/load NY image catalog, then update all products for one org.
 * Call this from a cron endpoint or admin script.
 */
export async function runWeedmapsImageSync(
    orgId: string,
    options: { forceRebuild?: boolean; dryRun?: boolean } = {}
): Promise<ImageSyncResult> {
    const startMs = Date.now();
    logger.info('[WM_IMAGE_SYNC] Starting sync', { orgId, ...options });

    const catalog = await getOrBuildCatalog(options.forceRebuild);

    const { matched, updated, failed } = await syncOrgProductImages(orgId, catalog, options.dryRun);

    const result: ImageSyncResult = {
        orgId,
        runAt: new Date(),
        dispensariesScanned: 0,  // only available when rebuilding catalog
        brandsFound: new Set([...catalog.keys()].map(k => k.split('||')[0])).size,
        productImagesFound: catalog.size,
        productsMatched: matched,
        productsUpdated: updated,
        productsFailed: failed,
        durationMs: Date.now() - startMs,
    };

    // Log run to Firestore for monitoring
    const db = getAdminFirestore();
    await db.collection('image_sync_log').add(result);

    logger.info('[WM_IMAGE_SYNC] Sync complete', result);
    return result;
}
