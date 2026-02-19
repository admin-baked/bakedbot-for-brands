'use server';

/**
 * Cannabis Product Image Sync — Leafly Strain Image Edition
 *
 * WeedMaps' API was retired (404) and their website blocks all server requests (406).
 * This service instead scrapes Leafly strain pages to get high-quality product images,
 * then matches them to BakedBot Firestore products by normalized strain name.
 *
 * Coverage: Flower, Pre-rolls, Vapes, Concentrates (anything with a strain name)
 *           Edibles / branded products that don't match strain names are skipped.
 *
 * Architecture:
 *  1. Query Firestore products for the org (imageUrl = placeholder or missing)
 *  2. Extract unique normalized strain names from product names
 *  3. For each strain slug, fetch leafly.com/strains/{slug} → extract nugImage
 *  4. Try multiple slug variations (strip sizes/types/categories)
 *  5. Build a strain→imageUrl catalog (cached 7 days in Firestore)
 *  6. Download images → Firebase Storage → update product.imageUrl in Firestore
 *
 * Rate limit: 300ms between Leafly page fetches (~3 req/sec)
 * Storage path: product-images/{brand-slug}/{product-slug}.{ext}
 */

import { getAdminFirestore } from '@/firebase/admin';
import { getStorage } from 'firebase-admin/storage';
import type { Firestore } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const LEAFLY_WEB = 'https://www.leafly.com';

const LEAFLY_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
};

// ============================================================================
// RESULT TYPES (unchanged interface — same as original WeedMaps version)
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
    imageUrl: string;
    category: string;
    dispensarySlug: string;
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/** Normalize a string for catalog key matching */
function normalize(s: string): string {
    return s
        .toLowerCase()
        .replace(/\(.*?\)/g, '')        // remove parenthetical suffixes
        .replace(/[^a-z0-9]/g, ' ')     // special chars → spaces
        .replace(/\s+/g, ' ')           // collapse whitespace
        .trim();
}

/** Slugify a string for Leafly URL paths / Storage paths */
function slugify(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/** Returns true if a token is a product size (e.g. "3.5g", "100mg", "2pk") */
function isSizeToken(s: string): boolean {
    return /^\d+(?:\.\d+)?\s*(?:mg|g|oz|ml|pk|ct|pack|count)$/i.test(s.trim())
        || /^\d+[-]?(?:pk|x|ct|count)$/i.test(s.trim())
        || /^x\d+$/i.test(s.trim());
}

/** Returns true if a token contains cannabis category keywords */
function containsCategoryWord(s: string): boolean {
    return /\b(?:aio|pre[-\s]?roll|flower|vape|vapor|cartridge|cart|live\s*resin|live\s*rosin|rosin|wax|shatter|distillate|concentrate|tincture|gumm(?:y|ies)|edible|capsule|oil|extract|hash|kief|badder|sugar|sauce|infused|infusion|single|twin|double|liquid\s*diamonds?)\b/i.test(s);
}

/**
 * Extract likely strain names from a cannabis product name.
 * Handles two naming conventions:
 *
 * 1. Alleaves/POS format: "Brand - Category - Strain - Size"
 *    e.g. "Jaunty - AIO - Blue Dream - 1.5g" → "blue-dream"
 *    e.g. "KOA - Infused Pre roll - 2pk - Trop Cherry - 0.7g" → "trop-cherry"
 *
 * 2. Simple format: "Strain Size Category"
 *    e.g. "Blue Dream 3.5g" → "blue-dream"
 *    e.g. "OG Kush 1g Pre-Roll" → "og-kush"
 */
function extractStrainSlugs(productName: string): string[] {
    const slugs = new Set<string>();

    // --- Strategy 1: Alleaves dash-separated format ---
    // Split on " - " or " – " with surrounding spaces
    const dashParts = productName.split(/\s+[-–]\s+/);

    if (dashParts.length >= 3) {
        // Skip brand (index 0), skip parts that are sizes or category keywords
        // What remains (excluding first part) is the strain
        const strainParts = dashParts
            .slice(1)                               // skip brand
            .filter(p => !isSizeToken(p) && !containsCategoryWord(p))
            .map(p => p.replace(/\([^)]*\)/g, '').trim())  // strip parens
            .filter(Boolean);

        if (strainParts.length > 0) {
            const strainName = strainParts.join(' ');
            // Clean: remove sizes, type words
            let clean = strainName
                .replace(/\d+(?:\.\d+)?\s*(?:mg|g|oz|ml|pk)\b/gi, '')
                .replace(/\b(?:sativa|indica|hybrid)\b/gi, '')
                .replace(/\s+/g, ' ').trim();

            if (clean) {
                const s = slugify(clean);
                if (s.length > 2) {
                    slugs.add(s);
                    // Also try first 2 words
                    const words = clean.split(/\s+/);
                    if (words.length >= 2) slugs.add(slugify(words.slice(0, 2).join(' ')));
                }

                // Cross/blend strains: "Donny Burger x Strawberry Cough" → try each parent
                const crossParts = clean.split(/\s+x\s+/i);
                if (crossParts.length > 1) {
                    for (const part of crossParts) {
                        const cs = slugify(part.trim());
                        if (cs.length > 3) {
                            slugs.add(cs);
                            // Strip trailing phenotype number: "gelato-41" → "gelato"
                            const noNum = cs.replace(/-\d+$/, '');
                            if (noNum !== cs && noNum.length > 3) slugs.add(noNum);
                        }
                    }
                }
            }
        }
    }

    // --- Strategy 2: Simple format (no brand prefix) ---
    // Also run this for dash-format products as a fallback in case strategy 1 fails

    // Preserve parenthetical as additional candidate
    const parenMatch = productName.match(/\(([^)]+)\)/);
    if (parenMatch) slugs.add(slugify(parenMatch[1].trim()));

    let clean = productName.replace(/\([^)]*\)/g, ' ');
    clean = clean.replace(/\d+(?:\.\d+)?\s*(?:mg|g|oz|ml|pack|count|ct|pk)\b/gi, '');
    clean = clean.replace(/\b\d+[-]?(?:pack|pk|x|ct|count)\b/gi, '');
    clean = clean.replace(/\bx\d+\b/gi, '');
    clean = clean.replace(
        /\b(?:pre[-\s]?roll|flower|vape|vapor|cartridge|cart|carts|live\s+resin|live\s+rosin|rosin|wax|shatter|distillate|concentrate|tincture|gumm(?:y|ies)|edible|capsule|oil|extract|hash|kief|badder|sugar|sauce|infused|infusion|single|twin|double|liquid\s+diamonds?|aio)\b/gi,
        ''
    );
    clean = clean.replace(/\b(?:sativa|indica|hybrid|ruderalis|autoflower)\b/gi, '');
    clean = clean.replace(/\b(?:premium|select|reserve|craft|limited|special|edition)\b/gi, '');
    // Also strip brand-like prefixes (common NY brand names)
    clean = clean.replace(/\b(?:jaunty|flowerhouse|melo|koa|nar|cannabals|cannabols|kings\s+road|revert|thrive)\s*[-–]?\s*/gi, '');
    clean = clean.replace(/\s*[-–]\s*/g, ' ');  // flatten remaining dashes
    clean = clean.replace(/\s+/g, ' ').trim();

    if (clean && clean.length > 2) {
        const mainSlug = slugify(clean);
        if (mainSlug.length > 2) {
            slugs.add(mainSlug);
            const words = clean.split(/\s+/).filter(w => w.length > 1);
            if (words.length >= 2) slugs.add(slugify(words.slice(0, 2).join(' ')));
            if (words.length >= 3) slugs.add(slugify(words.slice(0, 3).join(' ')));
        }
        // Cross/blend strains: "Donny Burger x Strawberry Cough" → try each parent
        const crossParts = clean.split(/\s+x\s+/i);
        if (crossParts.length > 1) {
            for (const part of crossParts) {
                const cs = slugify(part.trim());
                if (cs.length > 3) {
                    slugs.add(cs);
                    // Strip trailing phenotype number: "gelato-41" → "gelato"
                    const noNum = cs.replace(/-\d+$/, '');
                    if (noNum !== cs && noNum.length > 3) slugs.add(noNum);
                }
            }
        }
    }

    return Array.from(slugs).filter(s => s.length > 2);
}

// ============================================================================
// LEAFLY STRAIN IMAGE LOOKUP
// ============================================================================

const GENERIC_IMAGE_PATTERNS = [
    'defaults/generic',
    'defaults/dark',
    'defaults/light',
    '/defaults/',
];

function isGenericImage(url: string): boolean {
    return GENERIC_IMAGE_PATTERNS.some(p => url.includes(p));
}

/**
 * Look up a strain on Leafly by slug and extract its nugImage.
 * Returns null if the strain isn't found or only has a generic placeholder image.
 */
async function lookupLeaflyStrain(slug: string): Promise<string | null> {
    const url = `${LEAFLY_WEB}/strains/${slug}`;
    try {
        const resp = await fetch(url, { headers: LEAFLY_HEADERS });
        if (!resp.ok) return null;

        const html = await resp.text();
        const match = html.match(
            /<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/
        );
        if (!match?.[1]) return null;

        const data = JSON.parse(match[1]) as {
            props?: {
                pageProps?: {
                    strain?: {
                        nugImage?: string;
                        name?: string;
                    };
                };
            };
        };

        const nugImage = data?.props?.pageProps?.strain?.nugImage;
        if (!nugImage || isGenericImage(nugImage)) return null;

        return nugImage;
    } catch (err) {
        logger.debug('[PRODUCT_IMG] Leafly lookup error', { slug, err: String(err) });
        return null;
    }
}

/**
 * Find the best Leafly image for a cannabis product.
 * Tries multiple slug variations until one matches.
 * Returns null if no real image found.
 */
async function findProductImage(productName: string): Promise<{ imageUrl: string; slug: string } | null> {
    const slugs = extractStrainSlugs(productName);

    for (const slug of slugs) {
        const imageUrl = await lookupLeaflyStrain(slug);
        if (imageUrl) {
            return { imageUrl, slug };
        }
        await sleep(300); // Rate limit: ~3 req/sec
    }

    return null;
}

/** Sleep helper */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ============================================================================
// CATALOG BUILDER (Leafly-based, 7-day cache)
// ============================================================================

/**
 * Build a strain name → imageUrl catalog from Leafly for the given product set.
 * The catalog is shared across orgs since strains are universal.
 *
 * @param productNames - Unique product names to look up (from any org's inventory)
 */
async function buildLeaflyImageCatalog(
    productNames: string[]
): Promise<Map<string, string>> {
    const catalog = new Map<string, string>(); // normalized name → imageUrl

    logger.info('[PRODUCT_IMG] Building Leafly image catalog', { products: productNames.length });

    let found = 0;
    let notFound = 0;
    let processed = 0;

    for (const name of productNames) {
        const result = await findProductImage(name);
        processed++;

        if (result) {
            const key = normalize(name);
            if (!catalog.has(key)) {
                catalog.set(key, result.imageUrl);
            }
            found++;
            logger.debug('[PRODUCT_IMG] Image found', { name, slug: result.slug });
        } else {
            notFound++;
        }

        if (processed % 20 === 0) {
            logger.info('[PRODUCT_IMG] Catalog progress', {
                processed, found, notFound,
                pct: Math.round(found / processed * 100),
            });
        }
    }

    logger.info('[PRODUCT_IMG] Leafly catalog built', { products: productNames.length, found, notFound });
    return catalog;
}

/**
 * Load catalog from Firestore (7-day cache) or rebuild from Leafly.
 * The catalog is keyed by org since different orgs have different product names.
 */
export async function getOrBuildCatalog(
    forceRebuild = false,
    orgId?: string
): Promise<Map<string, string>> {
    const db = getAdminFirestore();
    const docId = orgId ? `leafly_${orgId}` : 'leafly_global';

    if (!forceRebuild) {
        try {
            const doc = await db.collection('wm_image_catalog').doc(docId).get();
            if (doc.exists) {
                const data = doc.data()!;
                const ageMs = Date.now() - (data.builtAt?.toDate?.()?.getTime() || 0);
                const sevenDays = 7 * 24 * 60 * 60 * 1000;
                if (ageMs < sevenDays && data.entries) {
                    const map = new Map<string, string>(Object.entries(data.entries));
                    logger.info('[PRODUCT_IMG] Loaded catalog from Firestore', { size: map.size, docId });
                    return map;
                }
            }
        } catch (err) {
            logger.warn('[PRODUCT_IMG] Catalog load failed, rebuilding', { err: String(err) });
        }
    }

    // Need to rebuild — first get product names from Firestore if orgId provided
    let productNames: string[] = [];
    if (orgId) {
        try {
            const snap = await getOrgProducts(db, orgId);
            // Deduplicate by normalized name
            const nameSet = new Set<string>();
            snap.docs.forEach(d => {
                const name = d.data().name;
                if (name) nameSet.add(name);
            });
            productNames = Array.from(nameSet);
            logger.info('[PRODUCT_IMG] Loaded product names for catalog', { orgId, count: productNames.length });
        } catch (err) {
            logger.warn('[PRODUCT_IMG] Failed to load product names', { orgId, err: String(err) });
        }
    }

    const catalog = await buildLeaflyImageCatalog(productNames);

    // Cache in Firestore
    await db.collection('wm_image_catalog').doc(docId).set({
        entries: Object.fromEntries(catalog),
        builtAt: new Date(),
        entryCount: catalog.size,
        source: 'leafly',
        orgId: orgId || null,
    });

    return catalog;
}

// ============================================================================
// IMAGE DOWNLOAD + FIREBASE STORAGE
// ============================================================================

/**
 * Download an image from Leafly CDN and re-host on Firebase Storage.
 * Returns the public signed URL, or null on failure.
 */
async function storeProductImage(
    imageUrl: string,
    brand: string,
    productName: string
): Promise<string | null> {
    try {
        const resp = await fetch(imageUrl, { headers: { 'Referer': `${LEAFLY_WEB}/` } });
        if (!resp.ok) return null;

        const contentType = resp.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await resp.arrayBuffer());
        if (buffer.length < 1000) return null;

        const ext = contentType.includes('png') ? 'png'
            : contentType.includes('webp') ? 'webp'
            : 'jpg';

        const brandSlug = slugify(brand) || 'unknown-brand';
        const productSlug = slugify(productName) || `product-${Date.now()}`;
        const storagePath = `product-images/${brandSlug}/${productSlug}.${ext}`;

        const bucket = getStorage().bucket();
        const fileRef = bucket.file(storagePath);

        await fileRef.save(buffer, {
            contentType,
            metadata: {
                metadata: {
                    source: 'leafly',
                    brand,
                    productName,
                    originalUrl: imageUrl,
                    syncedAt: new Date().toISOString(),
                },
            },
        });

        const [signedUrl] = await fileRef.getSignedUrl({
            action: 'read',
            expires: '01-01-2125',
        });

        return signedUrl;
    } catch (err) {
        logger.warn('[PRODUCT_IMG] Image store failed', { imageUrl, err: String(err) });
        return null;
    }
}

// ============================================================================
// MATCH + UPDATE FIRESTORE
// ============================================================================

const PLACEHOLDER = '/icon-192.png';
const UNSPLASH_PREFIX = 'https://images.unsplash.com'; // Generic Unsplash category images

/** Returns true if a product still needs a real strain-specific image. */
function needsRealImage(imageUrl: string | undefined): boolean {
    if (!imageUrl || imageUrl === '' || imageUrl === PLACEHOLDER) return true;
    // Unsplash URLs are generic category photos, not real product images
    if (imageUrl.startsWith(UNSPLASH_PREFIX)) return true;
    return false;
}

/**
 * Fetch products from the tenant catalog.
 * Thrive and all POS-integrated orgs store products at:
 *   tenants/{orgId}/publicViews/products/items
 *
 * Falls back to legacy root `products` collection if tenant catalog is empty.
 */
async function getOrgProducts(db: Firestore, orgId: string) {
    // Primary: tenant catalog
    const tenantSnap = await db
        .collection('tenants')
        .doc(orgId)
        .collection('publicViews')
        .doc('products')
        .collection('items')
        .get();

    if (!tenantSnap.empty) {
        return tenantSnap;
    }

    // Fallback: legacy root products collection
    return db.collection('products').where('orgId', '==', orgId).get();
}

/**
 * Sync Leafly strain images to Firestore products for a given org.
 *
 * For products not covered by the catalog (edibles, branded items), the image
 * is looked up individually on Leafly at runtime.
 */
export async function syncOrgProductImages(
    orgId: string,
    catalog: Map<string, string>,
    dryRun = false
): Promise<{ matched: number; updated: number; failed: number }> {
    const db = getAdminFirestore();

    const productsSnap = await getOrgProducts(db, orgId);

    const needsImage = productsSnap.docs.filter(doc => needsRealImage(doc.data().imageUrl));

    logger.info('[PRODUCT_IMG] Products needing images', {
        orgId, total: productsSnap.size, needsImage: needsImage.length
    });

    let matched = 0;
    let updated = 0;
    let failed = 0;

    for (const doc of needsImage) {
        const product = doc.data();
        const name = product.name || '';
        const brand = product.brand || '';

        // Try catalog lookup by normalized name (exact match)
        const normName = normalize(name);
        let imageUrl = catalog.get(normName);

        // Fuzzy fallback: try prefix matching on the catalog
        if (!imageUrl) {
            for (const [k, v] of catalog) {
                if (normName.startsWith(k.substring(0, 8)) || k.startsWith(normName.substring(0, 8))) {
                    imageUrl = v;
                    break;
                }
            }
        }

        // Last resort: look up on Leafly directly (adds latency but covers catalog misses)
        if (!imageUrl) {
            const result = await findProductImage(name);
            if (result) {
                imageUrl = result.imageUrl;
                // Add to catalog for future lookups
                catalog.set(normName, imageUrl);
            }
        }

        if (!imageUrl) {
            continue; // No match — keep placeholder
        }

        matched++;

        if (dryRun) {
            logger.debug('[PRODUCT_IMG] DRY RUN match', { name, brand, imageUrl });
            continue;
        }

        // Download + re-host on Firebase Storage, fall back to CDN URL
        const storedUrl = await storeProductImage(imageUrl, brand, name);
        if (storedUrl) {
            await doc.ref.update({
                imageUrl: storedUrl,
                imageSource: 'leafly',
                imageUpdatedAt: new Date(),
            });
        } else {
            // Use CDN URL directly if Firebase Storage upload fails
            await doc.ref.update({
                imageUrl,
                imageSource: 'leafly_cdn',
                imageUpdatedAt: new Date(),
            });
        }
        updated++;

        await sleep(100); // Brief pause between updates
    }

    logger.info('[PRODUCT_IMG] Org sync complete', { orgId, matched, updated, failed });
    return { matched, updated, failed };
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Full sync: build/load image catalog, then update all products for one org.
 * Exported as `runWeedmapsImageSync` for backwards compatibility with the
 * cron endpoint and backfill script.
 */
export async function runWeedmapsImageSync(
    orgId: string,
    options: { forceRebuild?: boolean; dryRun?: boolean } = {}
): Promise<ImageSyncResult> {
    const startMs = Date.now();
    logger.info('[PRODUCT_IMG] Starting Leafly image sync', { orgId, ...options });

    // Build/load catalog scoped to this org's product names
    const catalog = await getOrBuildCatalog(options.forceRebuild, orgId);

    const { matched, updated, failed } = await syncOrgProductImages(orgId, catalog, options.dryRun);

    const result: ImageSyncResult = {
        orgId,
        runAt: new Date(),
        dispensariesScanned: 0,
        brandsFound: new Set([...catalog.keys()].map(k => k.split(' ')[0])).size,
        productImagesFound: catalog.size,
        productsMatched: matched,
        productsUpdated: updated,
        productsFailed: failed,
        durationMs: Date.now() - startMs,
    };

    const db = getAdminFirestore();
    await db.collection('image_sync_log').add({
        ...result,
        source: 'leafly',
    });

    logger.info('[PRODUCT_IMG] Sync complete', result);
    return result;
}

// ============================================================================
// LEGACY EXPORTS (compatibility)
// ============================================================================

/** @deprecated Use runWeedmapsImageSync instead. Still exported for backwards compat. */
export async function buildNYImageCatalog(): Promise<Map<string, string>> {
    logger.warn('[PRODUCT_IMG] buildNYImageCatalog is deprecated, use getOrBuildCatalog');
    return getOrBuildCatalog(true);
}

/** @deprecated */
export async function fetchNYDispensaries(): Promise<Array<{ slug: string; name: string }>> {
    return []; // No longer applicable — using Leafly, not WeedMaps dispensaries
}

/** @deprecated */
export async function fetchDispensaryImages(): Promise<WMProductImage[]> {
    return []; // No longer applicable
}
