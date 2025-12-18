'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/monitoring';
import { createHash } from 'crypto';
import type {
    LeaflyDispensary,
    LeaflyProduct,
    LeaflyOffer,
    LeaflyIngestionRun,
    ApifyTaskInput,
    ApifyRunResponse,
    CompetitorWatchlistEntry
} from '@/types/leafly';

const APIFY_API_BASE = 'https://api.apify.com/v2';
const LEAFLY_ACTOR_ID = '5BLF5SzgsgQjg1AES';  // paradox-analytics/leafly-scraper
const APIFY_TASK_ID = 'bOaF6v0erob02Q8wI';  // Your saved task

/**
 * Get Apify API token from environment
 * Returns null if not configured (for graceful handling)
 */
function getApifyToken(): string | null {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
        logger.warn('APIFY_API_TOKEN not configured - competitive intel features disabled');
        return null;
    }
    return token;
}

/**
 * Check if Apify is configured
 */
export function isApifyConfigured(): boolean {
    return !!process.env.APIFY_API_TOKEN;
}

/**
 * Create a hash key for deduplication
 */
function createProductKey(dispensarySlug: string, productName: string, brandName: string, weightGrams?: number): string {
    const key = `${dispensarySlug}|${productName}|${brandName}|${weightGrams || 0}`;
    return createHash('md5').update(key).digest('hex');
}

function createOfferKey(dispensarySlug: string, title: string): string {
    const key = `${dispensarySlug}|${title}`;
    return createHash('md5').update(key).digest('hex');
}

/**
 * Trigger a single dispensary scan
 */
export async function triggerSingleStoreScan(leaflyUrl: string): Promise<LeaflyIngestionRun> {
    const token = getApifyToken();
    if (!token) {
        throw new Error('Competitive scanning requires APIFY_API_TOKEN. Please configure this in your environment settings or contact support.');
    }

    const firestore = getAdminFirestore();

    const input: ApifyTaskInput = {
        mode: 'single_url',
        dispensaryUrl: leaflyUrl,
        proxyType: 'residential',
        includeOffers: true,
        includeStrainData: true,
        outputFormat: 'dataset',
    };

    // Start the Apify run
    const response = await fetch(`${APIFY_API_BASE}/actor-tasks/${APIFY_TASK_ID}/runs?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Apify API error: ${error}`);
    }

    const runData: ApifyRunResponse = await response.json();

    // Create ingestion run record
    const runRef = firestore.collection('ingestionRuns').doc(runData.id);
    const ingestionRun: LeaflyIngestionRun = {
        id: runData.id,
        apifyRunId: runData.id,
        mode: 'single_url',
        targetUrl: leaflyUrl,
        status: 'running',
        startedAt: new Date(),
        storesScanned: 0,
        productsIngested: 0,
        offersIngested: 0,
        errors: [],
    };

    await runRef.set(ingestionRun);
    logger.info(`Started Leafly scan for ${leaflyUrl}`, { runId: runData.id });

    return ingestionRun;
}

/**
 * Trigger a state-wide scan
 */
export async function triggerStateScan(state: string, maxStores: number = 50): Promise<LeaflyIngestionRun> {
    const token = getApifyToken();
    if (!token) {
        throw new Error('State scanning requires APIFY_API_TOKEN. Please configure this in your environment settings or contact support.');
    }

    const firestore = getAdminFirestore();

    const input: ApifyTaskInput = {
        mode: 'state',
        state: state.toLowerCase(),
        maxStores,
        taskCount: Math.min(10, Math.ceil(maxStores / 5)),
        workerCount: 6,
        proxyType: 'residential',
        includeOffers: true,
        includeStrainData: true,
        outputFormat: 'dataset',
    };

    const response = await fetch(`${APIFY_API_BASE}/actor-tasks/${APIFY_TASK_ID}/runs?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Apify API error: ${error}`);
    }

    const runData: ApifyRunResponse = await response.json();

    const runRef = firestore.collection('ingestionRuns').doc(runData.id);
    const ingestionRun: LeaflyIngestionRun = {
        id: runData.id,
        apifyRunId: runData.id,
        mode: 'state',
        targetState: state,
        status: 'running',
        startedAt: new Date(),
        storesScanned: 0,
        productsIngested: 0,
        offersIngested: 0,
        errors: [],
    };

    await runRef.set(ingestionRun);
    logger.info(`Started Leafly state scan for ${state}`, { runId: runData.id, maxStores });

    return ingestionRun;
}

/**
 * Check status of an Apify run
 */
export async function checkRunStatus(runId: string): Promise<'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTED'> {
    const token = getApifyToken();

    const response = await fetch(`${APIFY_API_BASE}/actor-runs/${runId}?token=${token}`);
    if (!response.ok) {
        throw new Error(`Failed to check run status: ${await response.text()}`);
    }

    const data = await response.json();
    return data.data.status;
}

/**
 * Ingest dataset from completed Apify run
 */
export async function ingestDataset(runId: string): Promise<{ products: number; offers: number; dispensaries: number }> {
    const firestore = getAdminFirestore();
    const token = getApifyToken();

    // Get the run info to find the dataset ID
    const runResponse = await fetch(`${APIFY_API_BASE}/actor-runs/${runId}?token=${token}`);
    if (!runResponse.ok) {
        throw new Error(`Failed to get run info: ${await runResponse.text()}`);
    }

    const runData = await runResponse.json();
    const datasetId = runData.data.defaultDatasetId;

    // Fetch dataset items
    const datasetResponse = await fetch(`${APIFY_API_BASE}/datasets/${datasetId}/items?token=${token}`);
    if (!datasetResponse.ok) {
        throw new Error(`Failed to fetch dataset: ${await datasetResponse.text()}`);
    }

    const items = await datasetResponse.json();

    let dispensaryCount = 0;
    let productCount = 0;
    let offerCount = 0;

    // Process each item (they have a 'type' field)
    for (const item of items) {
        try {
            if (item.type === 'dispensary' || item.dispensary_info) {
                await upsertDispensary(item);
                dispensaryCount++;
            } else if (item.type === 'product' || item.product_name) {
                await upsertProduct(item);
                productCount++;
            } else if (item.type === 'offer' || item.offer_title) {
                await upsertOffer(item);
                offerCount++;
            }
        } catch (e: any) {
            logger.warn(`Failed to ingest item: ${e.message}`, { item });
        }
    }

    // Update ingestion run record
    await firestore.collection('ingestionRuns').doc(runId).update({
        status: 'completed',
        completedAt: new Date(),
        storesScanned: dispensaryCount,
        productsIngested: productCount,
        offersIngested: offerCount,
    });

    logger.info(`Ingested Leafly dataset`, { runId, dispensaryCount, productCount, offerCount });

    return { products: productCount, offers: offerCount, dispensaries: dispensaryCount };
}

/**
 * Upsert a dispensary into Firestore
 */
async function upsertDispensary(data: any): Promise<void> {
    const firestore = getAdminFirestore();
    const slug = createSlug(data.name || data.dispensary_name);

    const dispensary: LeaflyDispensary = {
        id: slug,
        slug,
        name: data.name || data.dispensary_name,
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zip_code || data.zipCode || '',
        latitude: data.latitude,
        longitude: data.longitude,
        phone: data.phone,
        website: data.website,
        hours: data.hours,
        rating: data.rating,
        reviewCount: data.review_count,
        isOpen: data.is_open,
        leaflyUrl: data.leafly_url || data.url || '',
        lastScrapedAt: new Date(),
    };

    await firestore
        .collection('sources')
        .doc('leafly')
        .collection('dispensaries')
        .doc(slug)
        .set(dispensary, { merge: true });
}

/**
 * Upsert a product into Firestore
 */
async function upsertProduct(data: any): Promise<void> {
    const firestore = getAdminFirestore();
    const dispensarySlug = createSlug(data.dispensary_name || data.store_name || 'unknown');
    const productId = createProductKey(
        dispensarySlug,
        data.product_name || data.name,
        data.brand_name || data.brand || '',
        data.weight_grams || data.weight
    );

    const product: LeaflyProduct = {
        id: productId,
        dispensarySlug,
        dispensaryName: data.dispensary_name || data.store_name || '',
        productName: data.product_name || data.name,
        brandName: data.brand_name || data.brand || '',
        category: data.category || 'other',
        subcategory: data.subcategory,
        thcPercent: data.thc_percent || data.thc,
        cbdPercent: data.cbd_percent || data.cbd,
        weightGrams: data.weight_grams || data.weight,
        price: parseFloat(data.price) || 0,
        originalPrice: data.original_price ? parseFloat(data.original_price) : undefined,
        inStock: data.in_stock !== false,
        strainType: data.strain_type,
        imageUrl: data.image_url || data.image,
        leaflyUrl: data.product_url || data.url,
        lastSeenAt: new Date(),
        lastPrice: parseFloat(data.price) || 0,
    };

    await firestore
        .collection('sources')
        .doc('leafly')
        .collection('dispensaries')
        .doc(dispensarySlug)
        .collection('products')
        .doc(productId)
        .set(product, { merge: true });
}

/**
 * Upsert an offer into Firestore
 */
async function upsertOffer(data: any): Promise<void> {
    const firestore = getAdminFirestore();
    const dispensarySlug = createSlug(data.dispensary_name || data.store_name || 'unknown');
    const offerId = createOfferKey(dispensarySlug, data.offer_title || data.title || '');

    const offer: LeaflyOffer = {
        id: offerId,
        dispensarySlug,
        dispensaryName: data.dispensary_name || data.store_name || '',
        offerType: data.offer_type || 'deal',
        title: data.offer_title || data.title || '',
        description: data.description || '',
        discountPercent: data.discount_percent,
        discountAmount: data.discount_amount,
        conditions: data.conditions,
        validFrom: data.valid_from ? new Date(data.valid_from) : undefined,
        validUntil: data.valid_until ? new Date(data.valid_until) : undefined,
        productCategories: data.product_categories,
        lastSeenAt: new Date(),
    };

    await firestore
        .collection('sources')
        .doc('leafly')
        .collection('dispensaries')
        .doc(dispensarySlug)
        .collection('offers')
        .doc(offerId)
        .set(offer, { merge: true });
}

/**
 * Create a URL-safe slug
 */
function createSlug(name: string): string {
    return (name || 'unknown')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

// ============== Competitor Watchlist ==============

/**
 * Add a competitor to the watchlist
 */
export async function addToWatchlist(entry: Omit<CompetitorWatchlistEntry, 'id' | 'createdAt'>): Promise<string> {
    const firestore = getAdminFirestore();
    const docRef = firestore.collection('competitorWatchlist').doc();

    const watchlistEntry: CompetitorWatchlistEntry = {
        id: docRef.id,
        ...entry,
        createdAt: new Date(),
    };

    await docRef.set(watchlistEntry);
    return docRef.id;
}

/**
 * Get all watchlist entries
 */
export async function getWatchlist(): Promise<CompetitorWatchlistEntry[]> {
    const firestore = getAdminFirestore();
    const snapshot = await firestore
        .collection('competitorWatchlist')
        .orderBy('name')
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            leaflyUrl: data.leaflyUrl,
            state: data.state,
            city: data.city,
            scanFrequency: data.scanFrequency || 'weekly',
            lastScannedAt: data.lastScannedAt?.toDate?.(),
            nextScanAt: data.nextScanAt?.toDate?.(),
            enabled: data.enabled !== false,
            createdAt: data.createdAt?.toDate?.() || new Date(),
        } as CompetitorWatchlistEntry;
    });
}

/**
 * Remove from watchlist
 */
export async function removeFromWatchlist(id: string): Promise<void> {
    const firestore = getAdminFirestore();
    await firestore.collection('competitorWatchlist').doc(id).delete();
}

// ============== Competitive Intel Queries ==============

/**
 * Get pricing bands for a category in a state
 */
export async function getPricingBands(state: string, category: string): Promise<{
    min: number;
    max: number;
    avg: number;
    count: number;
    dispensaries: string[];
}> {
    const firestore = getAdminFirestore();

    // Get all dispensaries in state
    const dispensariesSnap = await firestore
        .collection('sources')
        .doc('leafly')
        .collection('dispensaries')
        .where('state', '==', state.toUpperCase())
        .get();

    const prices: number[] = [];
    const dispensaryNames: Set<string> = new Set();

    for (const dispDoc of dispensariesSnap.docs) {
        const productsSnap = await firestore
            .collection('sources')
            .doc('leafly')
            .collection('dispensaries')
            .doc(dispDoc.id)
            .collection('products')
            .where('category', '==', category.toLowerCase())
            .where('inStock', '==', true)
            .get();

        for (const prodDoc of productsSnap.docs) {
            const product = prodDoc.data();
            if (product.price > 0) {
                prices.push(product.price);
                dispensaryNames.add(product.dispensaryName);
            }
        }
    }

    if (prices.length === 0) {
        return { min: 0, max: 0, avg: 0, count: 0, dispensaries: [] };
    }

    const sum = prices.reduce((a, b) => a + b, 0);
    return {
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: sum / prices.length,
        count: prices.length,
        dispensaries: Array.from(dispensaryNames).slice(0, 10),
    };
}

/**
 * Get active promotions in a state
 */
export async function getActivePromos(state: string): Promise<LeaflyOffer[]> {
    const firestore = getAdminFirestore();

    const dispensariesSnap = await firestore
        .collection('sources')
        .doc('leafly')
        .collection('dispensaries')
        .where('state', '==', state.toUpperCase())
        .get();

    const offers: LeaflyOffer[] = [];
    const now = new Date();

    for (const dispDoc of dispensariesSnap.docs) {
        const offersSnap = await firestore
            .collection('sources')
            .doc('leafly')
            .collection('dispensaries')
            .doc(dispDoc.id)
            .collection('offers')
            .get();

        for (const offerDoc of offersSnap.docs) {
            const offer = offerDoc.data() as LeaflyOffer;
            // Include if no expiry or not expired
            if (!offer.validUntil || new Date(offer.validUntil) > now) {
                offers.push(offer);
            }
        }
    }

    return offers.slice(0, 50);  // Limit results
}

// ============== Local Competition for Brands/Dispensaries ==============

export interface LocalCompetitionData {
    state: string;
    city?: string;
    competitors: {
        name: string;
        city: string;
        rating?: number;
        leaflyUrl: string;
    }[];
    pricingByCategory: {
        category: string;
        min: number;
        max: number;
        avg: number;
        yourPosition?: 'below' | 'at' | 'above';  // Relative to avg
    }[];
    activeDeals: number;
    topPromos: {
        dispensaryName: string;
        title: string;
        discountPercent?: number;
    }[];
    dataFreshness: Date | null;
}

/**
 * Get local competition summary for a brand or dispensary location
 * Used in brand/dispensary dashboards for competitive intel
 */
export async function getLocalCompetition(state: string, city?: string): Promise<LocalCompetitionData> {
    const firestore = getAdminFirestore();

    // Normalize state
    const normalizedState = state.toUpperCase().trim();

    // Get dispensaries in the state
    let dispensariesQuery = firestore
        .collection('sources')
        .doc('leafly')
        .collection('dispensaries')
        .where('state', '==', normalizedState);

    const dispensariesSnap = await dispensariesQuery.limit(50).get();

    // Filter by city if provided
    let competitors = dispensariesSnap.docs.map(doc => {
        const data = doc.data();
        return {
            name: data.name,
            city: data.city,
            rating: data.rating,
            leaflyUrl: data.leaflyUrl,
            lastScrapedAt: data.lastScrapedAt?.toDate?.(),
        };
    });

    if (city) {
        const normalizedCity = city.toLowerCase().trim();
        competitors = competitors.filter(c =>
            c.city?.toLowerCase().trim() === normalizedCity
        );
        // If no exact match, include nearby (same state)
        if (competitors.length === 0) {
            competitors = dispensariesSnap.docs.slice(0, 10).map(doc => {
                const data = doc.data();
                return {
                    name: data.name,
                    city: data.city,
                    rating: data.rating,
                    leaflyUrl: data.leaflyUrl,
                    lastScrapedAt: data.lastScrapedAt?.toDate?.(),
                };
            });
        }
    }

    // Get pricing by category (top 4 categories)
    const categories = ['flower', 'vapes', 'edibles', 'concentrates'];
    const pricingByCategory: LocalCompetitionData['pricingByCategory'] = [];

    for (const category of categories) {
        try {
            const bands = await getPricingBands(normalizedState, category);
            if (bands.count > 0) {
                pricingByCategory.push({
                    category,
                    min: bands.min,
                    max: bands.max,
                    avg: Math.round(bands.avg * 100) / 100,
                });
            }
        } catch (e) {
            // Skip if error
        }
    }

    // Get active promos
    const promos = await getActivePromos(normalizedState);

    // Find latest scrape date
    const latestScrape = competitors.reduce((latest, c) => {
        if (c.lastScrapedAt && (!latest || c.lastScrapedAt > latest)) {
            return c.lastScrapedAt;
        }
        return latest;
    }, null as Date | null);

    return {
        state: normalizedState,
        city,
        competitors: competitors.slice(0, 10).map(c => ({
            name: c.name,
            city: c.city,
            rating: c.rating,
            leaflyUrl: c.leaflyUrl,
        })),
        pricingByCategory,
        activeDeals: promos.length,
        topPromos: promos.slice(0, 5).map(p => ({
            dispensaryName: p.dispensaryName,
            title: p.title,
            discountPercent: p.discountPercent,
        })),
        dataFreshness: latestScrape,
    };
}

/**
 * Get competitive intel summary for agent use (Smokey/Ezal)
 * Returns a text summary suitable for LLM consumption
 */
export async function getCompetitiveIntelForAgent(state: string, city?: string): Promise<string> {
    try {
        const data = await getLocalCompetition(state, city);

        let summary = `## Competitive Intelligence for ${city ? `${city}, ` : ''}${state}\n\n`;

        if (data.competitors.length > 0) {
            summary += `### Nearby Competitors (${data.competitors.length})\n`;
            data.competitors.slice(0, 5).forEach(c => {
                summary += `- ${c.name} (${c.city})${c.rating ? ` - ${c.rating}★` : ''}\n`;
            });
            summary += '\n';
        }

        if (data.pricingByCategory.length > 0) {
            summary += `### Market Pricing Ranges\n`;
            data.pricingByCategory.forEach(p => {
                summary += `- **${p.category}**: $${p.min.toFixed(0)} - $${p.max.toFixed(0)} (avg $${p.avg.toFixed(0)})\n`;
            });
            summary += '\n';
        }

        if (data.topPromos.length > 0) {
            summary += `### Active Promotions (${data.activeDeals} total)\n`;
            data.topPromos.forEach(p => {
                summary += `- ${p.dispensaryName}: ${p.title}${p.discountPercent ? ` (${p.discountPercent}% off)` : ''}\n`;
            });
            summary += '\n';
        }

        if (data.dataFreshness) {
            summary += `\n*Data last updated: ${data.dataFreshness.toLocaleDateString()}*\n`;
        } else {
            summary += `\n*No local data available yet. Run a state scan to populate.*\n`;
        }

        return summary;
    } catch (e: any) {
        return `Unable to fetch competitive intel: ${e.message}`;
    }
}
