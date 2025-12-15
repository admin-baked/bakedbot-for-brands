// src/server/services/geo-discovery.ts
/**
 * Geo-Smart Product Discovery Service
 * Provides location-aware product discovery using CannMenus data
 */

'use server';

import {
    searchNearbyRetailers,
    getRetailerProducts,
    geocodeZipCode,
    RetailerLocation
} from '@/lib/cannmenus-api';
import { CannMenusProduct } from '@/types/cannmenus';
import {
    LocalProduct,
    DiscoveryOptions,
    DiscoveryResult,
    RetailerSummary,
    GeoZone,
    ZipCodeCache,
} from '@/types/foot-traffic';
import { createServerClient } from '@/firebase/server-client';

// Default search radius in miles
const DEFAULT_RADIUS_MILES = 10;
const MAX_RADIUS_MILES = 50;
const DEFAULT_PRODUCT_LIMIT = 50;

/**
 * Calculate a foot traffic score for a product based on various factors
 * Score ranges from 0-100
 */
function calculateFootTrafficScore(
    product: CannMenusProduct,
    distance: number,
    competitorCount: number,
    isOnSale: boolean
): number {
    let score = 50; // Base score

    // Distance factor (closer = higher score)
    if (distance <= 1) score += 25;
    else if (distance <= 3) score += 20;
    else if (distance <= 5) score += 15;
    else if (distance <= 10) score += 10;
    else if (distance <= 20) score += 5;

    // Availability factor (more retailers = higher score)
    score += Math.min(competitorCount * 3, 15);

    // On sale bonus
    if (isOnSale) score += 10;

    // Cap at 100
    return Math.min(score, 100);
}

/**
 * Transform CannMenus product to LocalProduct format
 */
function transformToLocalProduct(
    product: CannMenusProduct,
    availability: {
        retailerId: string;
        retailerName: string;
        distance: number;
        address: string;
        city: string;
        state: string;
    }[]
): LocalProduct {
    const nearestDistance = Math.min(...availability.map(a => a.distance));
    const isOnSale = product.original_price > product.latest_price;

    return {
        id: product.cann_sku_id,
        name: product.product_name,
        brandName: product.brand_name || 'Unknown Brand',
        brandId: product.brand_id,
        category: product.category,
        imageUrl: product.image_url,
        description: product.description || '',
        size: product.display_weight,
        price: product.latest_price,
        originalPrice: product.original_price !== product.latest_price ? product.original_price : null,
        isOnSale,
        thcPercent: product.percentage_thc,
        cbdPercent: product.percentage_cbd,
        availability: availability.map(a => ({
            ...a,
            inStock: true, // CannMenus doesn't provide stock status directly
            lastUpdated: new Date(),
        })),
        nearestDistance,
        retailerCount: availability.length,
        footTrafficScore: calculateFootTrafficScore(
            product,
            nearestDistance,
            availability.length,
            isOnSale
        ),
    };
}

/**
 * Discover products available near a location
 */

/**
 * Discover products available near a location
 */
export async function discoverNearbyProducts(
    options: DiscoveryOptions
): Promise<DiscoveryResult> {
    const {
        lat,
        lng,
        radiusMiles = DEFAULT_RADIUS_MILES,
        category,
        brand,
        inStockOnly = true,
        limit = DEFAULT_PRODUCT_LIMIT,
        sortBy = 'distance',
        cityName,
        state,
        searchQuery
    } = options;

    const searchRadius = Math.min(radiusMiles, MAX_RADIUS_MILES);

    // Step 1: Find nearby retailers
    // Pass city and state if available to fallback to name search
    const retailers = await searchNearbyRetailers(lat, lng, 20, state, cityName);

    if (retailers.length === 0) {
        return {
            products: [],
            retailers: [],
            totalProducts: 0,
            searchRadius,
            center: { lat, lng },
        };
    }

    // Filter retailers within radius
    // Note: If using city fallback, distance might be undefined or based on city center
    // We should be lenient if distance is missing but city matches
    const nearbyRetailers = retailers.filter(r =>
        (r.distance !== undefined && r.distance <= searchRadius) ||
        (cityName && r.city?.toLowerCase() === cityName.toLowerCase())
    );

    if (nearbyRetailers.length === 0) {
        return {
            products: [],
            retailers: [],
            totalProducts: 0,
            searchRadius,
            center: { lat, lng },
        };
    }

    // Step 2: Fetch products from each retailer
    const productMap = new Map<string, { product: CannMenusProduct; availability: any[] }>();

    for (const retailer of nearbyRetailers) {
        const products = await getRetailerProducts(retailer.id, {
            category,
            search: brand,
            state: retailer.state, // Pass state for v1 API
        });

        for (const product of products) {

            const existing = productMap.get(product.cann_sku_id);
            const availabilityEntry = {
                retailerId: retailer.id,
                retailerName: retailer.name,
                distance: retailer.distance || 0,
                address: retailer.address,
                city: retailer.city,
                state: retailer.state,
            };

            if (existing) {
                existing.availability.push(availabilityEntry);
            } else {
                productMap.set(product.cann_sku_id, {
                    product,
                    availability: [availabilityEntry],
                });
            }
        }
    }

    // Step 3: Transform to LocalProduct format
    let localProducts: LocalProduct[] = Array.from(productMap.values()).map(
        ({ product, availability }) => transformToLocalProduct(product, availability)
    );

    // Step 4: Apply filters
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        localProducts = localProducts.filter(p => {
            const matchName = p.name.toLowerCase().includes(q);
            const matchBrand = p.brandName?.toLowerCase().includes(q);
            const matchDesc = p.description?.toLowerCase().includes(q);
            return matchName || matchBrand || matchDesc;
        });
    }

    if (options.minPrice !== undefined) {
        localProducts = localProducts.filter(p => p.price >= options.minPrice!);
    }
    if (options.maxPrice !== undefined) {
        localProducts = localProducts.filter(p => p.price <= options.maxPrice!);
    }

    // Step 5: Sort products
    switch (sortBy) {
        case 'distance':
            localProducts.sort((a, b) => a.nearestDistance - b.nearestDistance);
            break;
        case 'price':
            localProducts.sort((a, b) => a.price - b.price);
            break;
        case 'score':
            localProducts.sort((a, b) => b.footTrafficScore - a.footTrafficScore);
            break;
    }

    // Step 6: Limit results
    const totalProducts = localProducts.length;
    localProducts = localProducts.slice(0, limit);

    // Step 7: Transform retailers to summary format
    const retailerSummaries: RetailerSummary[] = nearbyRetailers.map(r => ({
        id: r.id,
        name: r.name,
        address: r.address,
        city: r.city,
        state: r.state,
        postalCode: r.postalCode,
        distance: r.distance,
        phone: r.phone,
        website: r.menuUrl,
        lat: r.latitude,
        lng: r.longitude,
    }));

    return {
        products: localProducts,
        retailers: retailerSummaries,
        totalProducts,
        searchRadius,
        center: { lat, lng },
    };
}

/**
 * Get retailers by ZIP code
 */
export async function getRetailersByZipCode(
    zipCode: string,
    limit: number = 10
): Promise<RetailerSummary[]> {
    // Geocode the ZIP code
    const coords = await getZipCodeCoordinates(zipCode); // Use getZipCodeCoordinates to benefit from caching

    if (!coords) {
        console.error(`[GeoDiscovery] Failed to geocode ZIP: ${zipCode}`);
        return [];
    }

    // Search for nearby retailers
    // Pass city and state for fallback
    const retailers = await searchNearbyRetailers(
        coords.lat,
        coords.lng,
        limit,
        coords.state,
        coords.city
    );

    return retailers.map(r => ({
        id: r.id,
        name: r.name,
        address: r.address,
        city: r.city,
        state: r.state,
        postalCode: r.postalCode,
        distance: r.distance,
        phone: r.phone,
        website: r.menuUrl,
        lat: r.latitude,
        lng: r.longitude,
    }));
}

/**
 * Cache ZIP code geocoding results
 */
export async function cacheZipCodeGeocode(zipCode: string): Promise<ZipCodeCache | null> {
    const coords = await geocodeZipCode(zipCode);

    if (!coords) {
        return null;
    }

    const { firestore } = await createServerClient();

    const cache: ZipCodeCache = {
        zipCode,
        lat: coords.lat,
        lng: coords.lng,
        city: coords.city || '',
        state: coords.state || '',
        cachedAt: new Date(),
    };

    await firestore.collection('zip_code_cache').doc(zipCode).set(cache);

    return cache;
}

/**
 * Get cached ZIP code geocoding or fetch fresh
 */
export async function getZipCodeCoordinates(
    zipCode: string
): Promise<{ lat: number; lng: number; city: string; state: string } | null> {
    const { firestore } = await createServerClient();

    // Check cache first
    const cached = await firestore.collection('zip_code_cache').doc(zipCode).get();

    if (cached.exists) {
        const data = cached.data() as ZipCodeCache;
        // Cache valid for 30 days
        const cacheAge = Date.now() - (data.cachedAt as any).toMillis();
        // Check if cache is fresh AND has valid city/state AND valid coordinates
        const hasValidCoords = typeof data.lat === 'number' && typeof data.lng === 'number' && !isNaN(data.lat) && !isNaN(data.lng);
        const hasValidLocation = data.city && data.state && data.city.trim() !== '' && data.state.trim() !== '';

        if (cacheAge < 30 * 24 * 60 * 60 * 1000 && hasValidCoords && hasValidLocation) {
            return {
                lat: data.lat,
                lng: data.lng,
                city: data.city,
                state: data.state
            };
        }


    }

    // Fetch and cache
    // HARDCODED FIX: Manual override for known problem ZIPs
    if (zipCode === '90002') {
        return {
            lat: 33.9490,
            lng: -118.2460,
            city: 'Los Angeles', // Force correct city name
            state: 'CA'
        };
    }

    const result = await cacheZipCodeGeocode(zipCode);
    return result ? {
        lat: result.lat,
        lng: result.lng,
        city: result.city,
        state: result.state
    } : null;
}


// =============================================================================
// GEO ZONE MANAGEMENT
// =============================================================================

/**
 * Get all geo zones
 */
export async function getGeoZones(): Promise<GeoZone[]> {
    const { firestore } = await createServerClient();

    const snapshot = await firestore
        .collection('foot_traffic')
        .doc('config')
        .collection('geo_zones')
        .orderBy('priority', 'desc')
        .get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as GeoZone[];
}

/**
 * Get a single geo zone by ID
 */
export async function getGeoZone(zoneId: string): Promise<GeoZone | null> {
    const { firestore } = await createServerClient();

    const doc = await firestore
        .collection('foot_traffic')
        .doc('config')
        .collection('geo_zones')
        .doc(zoneId)
        .get();

    if (!doc.exists) {
        return null;
    }

    const data = doc.data()!;
    return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
    } as GeoZone;
}

/**
 * Create a new geo zone
 */
export async function createGeoZone(
    zone: Omit<GeoZone, 'id' | 'createdAt' | 'updatedAt'>
): Promise<GeoZone> {
    const { firestore } = await createServerClient();

    const now = new Date();
    const docRef = firestore
        .collection('foot_traffic')
        .doc('config')
        .collection('geo_zones')
        .doc();

    const newZone: GeoZone = {
        ...zone,
        id: docRef.id,
        createdAt: now,
        updatedAt: now,
    };

    await docRef.set(newZone);

    return newZone;
}

/**
 * Update a geo zone
 */
export async function updateGeoZone(
    zoneId: string,
    updates: Partial<Omit<GeoZone, 'id' | 'createdAt'>>
): Promise<GeoZone | null> {
    const { firestore } = await createServerClient();

    const docRef = firestore
        .collection('foot_traffic')
        .doc('config')
        .collection('geo_zones')
        .doc(zoneId);

    const existing = await docRef.get();
    if (!existing.exists) {
        return null;
    }

    await docRef.update({
        ...updates,
        updatedAt: new Date(),
    });

    return getGeoZone(zoneId);
}

/**
 * Delete a geo zone
 */
export async function deleteGeoZone(zoneId: string): Promise<boolean> {
    const { firestore } = await createServerClient();

    await firestore
        .collection('foot_traffic')
        .doc('config')
        .collection('geo_zones')
        .doc(zoneId)
        .delete();

    return true;
}

/**
 * Find which geo zone(s) a ZIP code belongs to
 */
export async function findZonesForZipCode(zipCode: string): Promise<GeoZone[]> {
    const zones = await getGeoZones();
    return zones.filter(zone => zone.enabled && zone.zipCodes.includes(zipCode));
}
