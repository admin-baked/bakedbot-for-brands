'use server';

/**
 * Brand Website Image Sync
 *
 * For brands whose products still have placeholder images after Leafly scraping
 * (edibles, branded products, items without strain names), this service scrapes
 * the brand's own website to extract product photos.
 *
 * Architecture:
 *   1. Get brands carried by a retailer (default: retail_thrive_syracuse)
 *   2. For each brand, discover their official website URL
 *      (stored on brands.website, or discovered via Firecrawl web search)
 *   3. Scrape products page → extract markdown with inline images
 *   4. Parse ![alt](url) pairs from markdown, match to our product records
 *   5. Re-host matched images on Firebase Storage, update product.imageUrl
 *
 * Rate: ~500ms between brands, ~300ms between URL fetches
 * Storage path: product-images/{brand-slug}/{product-slug}-brand.{ext}
 */

import { getAdminFirestore } from '@/firebase/admin';
import { getStorage } from 'firebase-admin/storage';
import { logger } from '@/lib/logger';
import { discovery } from '@/server/services/firecrawl';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PLACEHOLDER = '/icon-192.png';
const UNSPLASH_PREFIX = 'https://images.unsplash.com';
const DEFAULT_RETAILER_ID = 'retail_thrive_syracuse';

/** Aggregator / social domains that are never valid brand websites */
const AGGREGATOR_DOMAINS = [
    'leafly.com', 'weedmaps.com', 'iheartjane.com', 'dutchie.com',
    'allbud.com', 'yelp.com', 'google.com', 'instagram.com',
    'facebook.com', 'twitter.com', 'x.com', 'wikipedia.org',
    'youtube.com', 'linkedin.com', 'cannabisnow.com',
];

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface BrandWebsiteImageSyncResult {
    brandsProcessed: number;
    websitesFound: number;
    imagesExtracted: number;
    productsMatched: number;
    productsUpdated: number;
    productsFailed: number;
    durationMs: number;
    brandResults: BrandSyncResult[];
}

export interface BrandSyncResult {
    brandId: string;
    brandName: string;
    website: string | null;
    websiteSource: 'stored' | 'discovered' | 'not_found';
    imagesFound: number;
    productsMatched: number;
    productsUpdated: number;
    productsFailed: number;
    error?: string;
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

function normalize(s: string): string {
    return s
        .toLowerCase()
        .replace(/\(.*?\)/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function slugify(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function needsRealImage(imageUrl: string | undefined): boolean {
    if (!imageUrl || imageUrl === '' || imageUrl === PLACEHOLDER) return true;
    if (imageUrl.startsWith(UNSPLASH_PREFIX)) return true;
    return false;
}

function isValidBrandWebsite(url: string): boolean {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return hostname.length > 4 &&
            !AGGREGATOR_DOMAINS.some(d => hostname.endsWith(d) || hostname.includes(`.${d}`));
    } catch {
        return false;
    }
}

/** How many words do two normalized strings share? */
function wordOverlap(a: string, b: string): number {
    const wordsA = new Set(a.split(' ').filter(w => w.length > 2));
    const wordsB = new Set(b.split(' ').filter(w => w.length > 2));
    let overlap = 0;
    for (const w of wordsA) {
        if (wordsB.has(w)) overlap++;
    }
    return overlap;
}

// ============================================================================
// WEBSITE DISCOVERY
// ============================================================================

/**
 * Find the official website URL for a cannabis brand.
 * Checks stored value first, then searches via DiscoveryService.
 */
async function discoverBrandWebsite(
    brandId: string,
    brandName: string,
    storedWebsite: string | undefined | null,
): Promise<{ url: string; source: 'stored' | 'discovered' } | null> {
    // 1. Use stored website if valid
    if (storedWebsite && isValidBrandWebsite(storedWebsite)) {
        return { url: storedWebsite, source: 'stored' };
    }

    if (!discovery.isConfigured()) {
        logger.warn('[BrandImgSync] Discovery not configured, skipping website search');
        return null;
    }

    // 2. Search for official website
    logger.info('[BrandImgSync] Searching for brand website', { brandId, brandName });
    try {
        const results = await discovery.search(`"${brandName}" cannabis New York official website`);
        const candidates = Array.isArray(results) ? results : [];

        for (const r of candidates.slice(0, 6)) {
            const url = r?.url || r?.link || r?.href || '';
            if (url && isValidBrandWebsite(url)) {
                logger.info('[BrandImgSync] Brand website found via search', { brandName, url });
                // Persist discovered URL to brands doc (best-effort)
                const db = getAdminFirestore();
                db.collection('brands').doc(brandId).update({
                    website: url,
                    websiteDiscoveredAt: new Date(),
                }).catch(() => {});
                return { url, source: 'discovered' };
            }
        }
    } catch (err) {
        logger.warn('[BrandImgSync] Website search failed', { brandName, err: String(err) });
    }

    return null;
}

// ============================================================================
// IMAGE EXTRACTION FROM MARKDOWN
// ============================================================================

interface ScrapedProductImage {
    name: string;
    imageUrl: string;
}

/**
 * Parse Firecrawl markdown for inline images: ![alt text](image_url)
 * Returns all (alt, url) pairs where both are present.
 */
function parseMarkdownImages(markdown: string): ScrapedProductImage[] {
    const results: ScrapedProductImage[] = [];
    const imgPattern = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
    let m: RegExpExecArray | null;

    while ((m = imgPattern.exec(markdown)) !== null) {
        const name = m[1].trim();
        const imageUrl = m[2].trim();
        // Skip icons/favicons (tiny) but keep logos and product images
        if (imageUrl && !imageUrl.match(/favicon|\.ico/i)) {
            results.push({ name: name || imageUrl, imageUrl });
        }
    }

    return results;
}

/**
 * Extract og:image / logo URL from scraped markdown/html.
 * Looks for og:image meta, or images with "logo" in alt/url.
 */
function extractLogoUrl(markdown: string, brandName: string): string | null {
    // Firecrawl sometimes includes og:image in metadata block
    const ogMatch = markdown.match(/og:image["\s:]*["']?(https?:\/\/[^\s"'<>]+)/i);
    if (ogMatch) return ogMatch[1];

    // Look for images explicitly named "logo"
    const logoMatch = markdown.match(/!\[[^\]]*logo[^\]]*\]\((https?:\/\/[^)]+)\)/i)
        || markdown.match(/!\[[^\]]*\]\((https?:\/\/[^)]*logo[^)]*)\)/i);
    if (logoMatch) return logoMatch[1];

    // Look for image with brand name as alt text that appears near the top
    const brandSlugRe = new RegExp(
        `!\\[${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\]]*\\]\\((https?://[^)]+)\\)`,
        'i'
    );
    const brandMatch = markdown.match(brandSlugRe);
    if (brandMatch) return brandMatch[1];

    return null;
}

/**
 * Scrape one or more URLs on a brand's website and extract product images + logo.
 * Tries homepage, /products, /shop, and /menu paths.
 */
async function scrapeProductImages(
    websiteUrl: string,
    brandName: string,
): Promise<{ images: ScrapedProductImage[]; logoUrl: string | null }> {
    const base = websiteUrl.replace(/\/$/, '');
    const urlsToTry = [base, `${base}/products`, `${base}/shop`, `${base}/menu`];

    const allImages: ScrapedProductImage[] = [];
    const seen = new Set<string>();
    let logoUrl: string | null = null;

    for (const url of urlsToTry) {
        try {
            const resp = await discovery.discoverUrl(url, ['markdown']) as any;
            const markdown: string = resp?.markdown || resp?.data?.markdown || '';
            if (!markdown) continue;

            // Try to find logo from homepage scrape
            if (!logoUrl) {
                logoUrl = extractLogoUrl(markdown, brandName);
            }

            const images = parseMarkdownImages(markdown);
            for (const img of images) {
                if (!seen.has(img.imageUrl)) {
                    seen.add(img.imageUrl);
                    allImages.push(img);
                }
            }

            if (allImages.length >= 20) break; // Enough images found
        } catch (err) {
            logger.debug('[BrandImgSync] Scrape URL failed', { url, err: String(err) });
        }

        await new Promise(r => setTimeout(r, 300));
    }

    logger.info('[BrandImgSync] Scraped images from brand website', {
        brandName, websiteUrl, imageCount: allImages.length, logoFound: !!logoUrl,
    });

    return { images: allImages, logoUrl };
}

// ============================================================================
// IMAGE DOWNLOAD + FIREBASE STORAGE
// ============================================================================

async function storeBrandImage(
    imageUrl: string,
    brandSlug: string,
    productName: string,
): Promise<string | null> {
    try {
        const resp = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; BakedBot/1.0)',
                'Accept': 'image/*,*/*;q=0.8',
            },
        });
        if (!resp.ok) return null;

        const contentType = resp.headers.get('content-type') || 'image/jpeg';
        if (!contentType.startsWith('image/')) return null;

        const buffer = Buffer.from(await resp.arrayBuffer());
        if (buffer.length < 1000) return null;

        const ext = contentType.includes('png') ? 'png'
            : contentType.includes('webp') ? 'webp'
            : 'jpg';

        const productSlug = slugify(productName) || `product-${Date.now()}`;
        const storagePath = `product-images/${brandSlug}/${productSlug}-brand.${ext}`;

        const bucket = getStorage().bucket();
        const fileRef = bucket.file(storagePath);

        await fileRef.save(buffer, {
            contentType,
            metadata: {
                metadata: {
                    source: 'brand_website',
                    brandSlug,
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
        logger.warn('[BrandImgSync] Image store failed', { imageUrl, err: String(err) });
        return null;
    }
}

// ============================================================================
// MATCH IMAGES TO PRODUCTS
// ============================================================================

/**
 * Match scraped images to products by normalized name overlap.
 * Returns a map: productDocId → best matching imageUrl
 */
function matchImagesToProducts(
    products: Array<{ id: string; name: string }>,
    images: ScrapedProductImage[],
): Map<string, string> {
    const matches = new Map<string, string>();

    // Build normalized image index
    const normalizedImages = images.map(img => ({
        ...img,
        normalized: normalize(img.name),
    }));

    for (const product of products) {
        const normalizedProduct = normalize(product.name);
        let bestScore = 0;
        let bestImageUrl: string | null = null;

        for (const img of normalizedImages) {
            // Direct substring match
            if (normalizedProduct.includes(img.normalized) || img.normalized.includes(normalizedProduct)) {
                matches.set(product.id, img.imageUrl);
                break;
            }

            // Word overlap scoring
            const score = wordOverlap(normalizedProduct, img.normalized);
            if (score > bestScore && score >= 2) {
                bestScore = score;
                bestImageUrl = img.imageUrl;
            }
        }

        if (!matches.has(product.id) && bestImageUrl) {
            matches.set(product.id, bestImageUrl);
        }
    }

    return matches;
}

// ============================================================================
// BRAND PROCESSOR
// ============================================================================

async function processBrand(
    brandId: string,
    brandName: string,
    brandSlug: string,
    storedWebsite: string | undefined | null,
    dryRun: boolean,
): Promise<BrandSyncResult> {
    const result: BrandSyncResult = {
        brandId,
        brandName,
        website: null,
        websiteSource: 'not_found',
        imagesFound: 0,
        productsMatched: 0,
        productsUpdated: 0,
        productsFailed: 0,
    };

    try {
        // 1. Discover website
        const websiteResult = await discoverBrandWebsite(brandId, brandName, storedWebsite);
        if (!websiteResult) return result;

        result.website = websiteResult.url;
        result.websiteSource = websiteResult.source;

        // 2. Get brand products that need images
        const db = getAdminFirestore();
        const productsSnap = await db
            .collection('products')
            .where('brandId', '==', brandId)
            .get();

        const productsNeedingImages = productsSnap.docs
            .filter(d => needsRealImage(d.data().imageUrl))
            .map(d => ({ id: d.id, name: d.data().name || '', ref: d.ref }));

        if (productsNeedingImages.length === 0) return result;

        logger.info('[BrandImgSync] Products need images', {
            brandId, count: productsNeedingImages.length,
        });

        // 3. Scrape brand website (products + logo)
        const { images: scrapedImages, logoUrl } = await scrapeProductImages(websiteResult.url, brandName);
        result.imagesFound = scrapedImages.length;

        // 3a. Save discovered logo if brand doesn't have one yet
        if (logoUrl && !dryRun) {
            const brandDoc = await db.collection('brands').doc(brandId).get();
            if (brandDoc.exists && !brandDoc.data()?.logoUrl) {
                await db.collection('brands').doc(brandId).update({
                    logoUrl,
                    logoSource: 'brand_website',
                    logoDiscoveredAt: new Date(),
                }).catch(e => logger.warn('[BrandImgSync] Logo save failed', { brandId, err: String(e) }));
                logger.info('[BrandImgSync] Brand logo saved', { brandId, logoUrl });
            }
        }

        if (scrapedImages.length === 0) return result;

        // 4. Match images to products
        const imageMatches = matchImagesToProducts(productsNeedingImages, scrapedImages);
        result.productsMatched = imageMatches.size;

        if (imageMatches.size === 0 || dryRun) {
            if (dryRun) {
                logger.info('[BrandImgSync] [DRY RUN] Would update products', {
                    brandId, matchCount: imageMatches.size, logoFound: !!logoUrl,
                });
            }
            return result;
        }

        // 5. Store images + update Firestore
        for (const productDoc of productsNeedingImages) {
            const matchedImageUrl = imageMatches.get(productDoc.id);
            if (!matchedImageUrl) continue;

            const storedUrl = await storeBrandImage(matchedImageUrl, brandSlug, productDoc.name);
            if (!storedUrl) {
                result.productsFailed++;
                continue;
            }

            await productDoc.ref.update({
                imageUrl: storedUrl,
                imageSource: 'brand_website',
                imageUpdatedAt: new Date(),
            });
            result.productsUpdated++;

            await new Promise(r => setTimeout(r, 100));
        }

    } catch (err) {
        result.error = String(err);
        logger.error('[BrandImgSync] Brand processing failed', {
            brandId, brandName, err: String(err),
        });
    }

    return result;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export interface BrandWebsiteImageSyncOptions {
    /** Process a single brand by slug (default: all brands at retailer) */
    brandSlug?: string;
    /** Match but do NOT write to Firestore (default: false) */
    dryRun?: boolean;
    /** Max brands to process this run (default: all) */
    maxBrands?: number;
    /** Only process brands at this retailer (default: retail_thrive_syracuse) */
    retailerId?: string;
}

export async function runBrandWebsiteImageSync(
    options: BrandWebsiteImageSyncOptions = {},
): Promise<BrandWebsiteImageSyncResult> {
    const startTime = Date.now();
    const { dryRun = false, maxBrands, retailerId = DEFAULT_RETAILER_ID } = options;
    const db = getAdminFirestore();
    const brandResults: BrandSyncResult[] = [];

    logger.info('[BrandImgSync] Starting sync', { dryRun, retailerId, brandSlug: options.brandSlug });

    // Collect brands to process
    let brandsToProcess: Array<{
        id: string;
        name: string;
        slug: string;
        website?: string;
    }> = [];

    if (options.brandSlug) {
        const brandId = `brand_${options.brandSlug.replace(/-/g, '_')}`;
        const doc = await db.collection('brands').doc(brandId).get();
        if (doc.exists) {
            const d = doc.data()!;
            brandsToProcess = [{ id: doc.id, name: d.name, slug: d.slug || options.brandSlug, website: d.website }];
        }
    } else {
        const retailerDoc = await db.collection('retailers').doc(retailerId).get();
        if (!retailerDoc.exists) throw new Error(`Retailer ${retailerId} not found`);

        const brandIds: string[] = retailerDoc.data()?.brandIds || [];

        // Load brands in batches (Firestore 'in' limit = 30 per query)
        for (let i = 0; i < brandIds.length; i += 30) {
            const batchIds = brandIds.slice(i, i + 30);
            const snap = await db.collection('brands').where('__name__', 'in', batchIds).get();
            for (const d of snap.docs) {
                const data = d.data();
                brandsToProcess.push({ id: d.id, name: data.name, slug: data.slug, website: data.website });
            }
        }
    }

    if (maxBrands) {
        brandsToProcess = brandsToProcess.slice(0, maxBrands);
    }

    logger.info('[BrandImgSync] Brands queued', { count: brandsToProcess.length });

    // Process each brand
    for (const brand of brandsToProcess) {
        const brandResult = await processBrand(
            brand.id,
            brand.name,
            brand.slug || slugify(brand.name),
            brand.website,
            dryRun,
        );
        brandResults.push(brandResult);
        await new Promise(r => setTimeout(r, 500));
    }

    return {
        brandsProcessed: brandResults.length,
        websitesFound: brandResults.filter(r => r.website !== null).length,
        imagesExtracted: brandResults.reduce((s, r) => s + r.imagesFound, 0),
        productsMatched: brandResults.reduce((s, r) => s + r.productsMatched, 0),
        productsUpdated: brandResults.reduce((s, r) => s + r.productsUpdated, 0),
        productsFailed: brandResults.reduce((s, r) => s + r.productsFailed, 0),
        durationMs: Date.now() - startTime,
        brandResults,
    };
}
