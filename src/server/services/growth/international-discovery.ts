/**
 * International Market Discovery Service
 * Uses RTRVR browser automation to scrape dispensary/product data
 * Falls back to manual data for initial seeding
 */

import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { InternationalMarket } from '@/lib/config/international-markets';
import { executeAgentTask } from '@/server/services/rtrvr/agent';
import { FieldValue } from 'firebase-admin/firestore';

export interface InternationalDispensary {
    id?: string;
    name: string;
    address: string;
    phone?: string;
    rating?: number;
    reviewCount?: number;
    openingHours?: string;
    website?: string;
    googleMapsUrl?: string;
    lat?: number;
    lng?: number;
    /** Data source: 'google_maps' (RTRVR), 'manual', or 'enriched' */
    source: 'google_maps' | 'manual' | 'enriched';
    categories?: string[]; // e.g., ['dispensary', 'wellness']
    verified?: boolean;
}

export interface InternationalPageData {
    marketId: string;
    country: string;
    city: string;
    dispensaries: InternationalDispensary[];
    metadata: {
        title: string;
        description: string;
        keywords: string[];
    };
    scrapedAt: Date;
    currency: string;
    language: string;
    published: boolean;
}

/**
 * Scrape Google Maps for cannabis dispensaries using RTRVR
 */
export async function scrapeGoogleMapsDispensaries(
    market: InternationalMarket
): Promise<InternationalDispensary[]> {
    try {
        logger.info('[IntlDiscovery] Scraping Google Maps', { market: market.id });

        const searchQuery = market.searchTerms[0] || `cannabis dispensary ${market.cityName}`;

        // Use RTRVR agent to search Google Maps and extract business listings
        const response = await executeAgentTask({
            input: `Search Google Maps for "${searchQuery}".
                   Extract all visible cannabis dispensary/shop listings with:
                   - Business name
                   - Full address
                   - Phone number (if visible)
                   - Star rating (1-5)
                   - Number of reviews
                   - Opening hours
                   - Website link
                   Return as structured JSON list.`,
            urls: [
                `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`,
            ],
            schema: {
                type: 'object',
                properties: {
                    businesses: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                address: { type: 'string' },
                                phone: { type: 'string' },
                                rating: { type: 'number' },
                                reviewCount: { type: 'number' },
                                openingHours: { type: 'string' },
                                website: { type: 'string' },
                                googleMapsUrl: { type: 'string' },
                            },
                            required: ['name', 'address'],
                        },
                    },
                },
                required: ['businesses'],
            } as any,
        });

        if (!response.success || !response.data?.result) {
            logger.warn('[IntlDiscovery] RTRVR returned no data', { market: market.id });
            return [];
        }

        const result = response.data.result as any;
        const businesses = result.result?.businesses || result.businesses || [];

        // Transform RTRVR output to our format
        const dispensaries: InternationalDispensary[] = businesses.map(
            (b: any, index: number) => ({
                id: `${market.id}_${index}`,
                name: b.name || 'Unknown',
                address: b.address || '',
                phone: b.phone,
                rating: b.rating ? parseFloat(b.rating) : undefined,
                reviewCount: b.reviewCount ? parseInt(b.reviewCount) : undefined,
                openingHours: b.openingHours,
                website: b.website,
                googleMapsUrl: b.googleMapsUrl,
                source: 'google_maps' as const,
                categories: ['dispensary'],
            })
        );

        logger.info('[IntlDiscovery] Scraped dispensaries', {
            market: market.id,
            count: dispensaries.length,
        });

        return dispensaries;
    } catch (error) {
        logger.error('[IntlDiscovery] Scraping failed', { market: market.id, error });
        return [];
    }
}

/**
 * Enrich dispensary data by visiting their website
 * Extract: menu items, prices, product categories
 */
export async function enrichDispensaryData(
    dispensary: InternationalDispensary,
    market: InternationalMarket
): Promise<InternationalDispensary> {
    // Skip enrichment if no website
    if (!dispensary.website) {
        return dispensary;
    }

    try {
        logger.info('[IntlDiscovery] Enriching dispensary', {
            name: dispensary.name,
            website: dispensary.website,
        });

        // Use RTRVR to visit website and extract menu/pricing info
        const response = await executeAgentTask({
            input: `Visit the website and extract:
                   - Product categories available (e.g., flower, edibles, concentrates)
                   - Price range (min-max price)
                   - Business description
                   - Any special deals or promotions`,
            urls: [dispensary.website],
            schema: {
                type: 'object',
                properties: {
                    categories: { type: 'array', items: { type: 'string' } },
                    priceRange: { type: 'object', properties: { min: { type: 'number' }, max: { type: 'number' } } },
                    description: { type: 'string' },
                    promotions: { type: 'array', items: { type: 'string' } },
                },
            } as any,
        });

        if (response.success && response.data) {
            const result = (response.data as any).result;
            if (result?.categories) {
                dispensary.categories = result.categories || dispensary.categories;
            }
        }

        return { ...dispensary, source: 'enriched' as const };
    } catch (error) {
        logger.warn('[IntlDiscovery] Enrichment failed', { name: dispensary.name, error });
        // Return original dispensary if enrichment fails (non-fatal)
        return dispensary;
    }
}

/**
 * Generate SEO metadata for international page using Claude
 */
export async function generatePageMetadata(
    market: InternationalMarket,
    dispensaryCount: number
): Promise<{ title: string; description: string; keywords: string[] }> {
    // For now, return template data
    // In future, use callClaude() to generate unique content per market
    return {
        title: `Cannabis Dispensaries in ${market.cityName}, ${market.countryName} | BakedBot`,
        description: `Explore cannabis dispensaries, products, and prices in ${market.cityName}. Find verified shops, read reviews, and discover local cannabis options.`,
        keywords: [
            `cannabis ${market.city}`,
            `dispensary ${market.cityName}`,
            `weed shop ${market.cityName}`,
            `marijuana ${market.countryName}`,
            `cannabis tourism`,
        ],
    };
}

/**
 * Save international page data to Firestore
 */
export async function saveInternationalPageData(
    pageData: InternationalPageData
): Promise<boolean> {
    try {
        const db = getAdminFirestore();
        const doc = `international_pages/${pageData.marketId}`;

        await db.doc(doc).set(
            {
                ...pageData,
                scrapedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        logger.info('[IntlDiscovery] Saved page data', { marketId: pageData.marketId });
        return true;
    } catch (error) {
        logger.error('[IntlDiscovery] Failed to save page data', { error });
        return false;
    }
}

/**
 * Log discovery run to Firestore
 */
export async function logDiscoveryRun(
    marketId: string,
    result: { dispensariesFound: number; success: boolean; error?: string }
): Promise<void> {
    try {
        const db = getAdminFirestore();
        await db.collection('international_discovery_log').add({
            marketId,
            ...result,
            timestamp: FieldValue.serverTimestamp(),
        });
    } catch (error) {
        logger.error('[IntlDiscovery] Failed to log run', { error });
    }
}

/**
 * Get recently scraped dispensaries for a market (from Firestore)
 */
export async function getInternationalPageData(
    marketId: string
): Promise<InternationalPageData | null> {
    try {
        const db = getAdminFirestore();
        const doc = await db.doc(`international_pages/${marketId}`).get();

        if (!doc.exists) {
            return null;
        }

        const data = doc.data() as InternationalPageData;
        return data;
    } catch (error) {
        logger.error('[IntlDiscovery] Failed to fetch page data', { marketId, error });
        return null;
    }
}
