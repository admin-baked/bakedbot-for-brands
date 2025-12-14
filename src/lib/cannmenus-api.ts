// src/lib/cannmenus-api.ts
/**
 * Enhanced CannMenus API client for headless menu system
 * Provides retailer search, product availability, and pricing data
 */

import { CannMenusProduct } from '@/types/cannmenus';

import { logger } from '@/lib/logger';
import { CANNMENUS_CONFIG } from '@/lib/config';

const CANNMENUS_BASE_URL = CANNMENUS_CONFIG.API_BASE;
const CANNMENUS_API_KEY = CANNMENUS_CONFIG.API_KEY;

export type RetailerLocation = {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    phone?: string;
    hours?: string;
    distance?: number; // in miles
    latitude?: number;
    longitude?: number;
    menuUrl?: string;
    imageUrl?: string;
};

export type ProductAvailability = {
    productId: string;
    retailerId: string;
    price: number;
    salePrice?: number;
    inStock: boolean;
    lastUpdated: string;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Search for nearby retailers/dispensaries
 */
export async function searchNearbyRetailers(
    latitude: number,
    longitude: number,
    limit: number = 3,
    state?: string,
    cityName?: string
): Promise<RetailerLocation[]> {
    try {
        const params = new URLSearchParams({
            limit: limit.toString(),
            lat: latitude.toString(),
            lng: longitude.toString(),
            sort: 'distance',
        });

        if (state) {
            params.append('states', state);
        }

        // If we have a city name, search by name as a fallback for broken geo-search
        if (cityName) {
            params.append('name', cityName);
        }

        const response = await fetch(
            `${CANNMENUS_BASE_URL}/v1/retailers?${params}`,
            {
                headers: {
                    'X-Token': CANNMENUS_API_KEY!,
                    'Accept': 'application/json',
                    'User-Agent': 'BakedBot/1.0',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`CannMenus API error: ${response.statusText}`);
        }

        const data = await response.json();

        // Transform and calculate distances
        const retailers: RetailerLocation[] = (data.data || []).map((retailer: any) => ({
            id: retailer.id?.toString() || retailer.retailer_id?.toString(),
            name: retailer.dispensary_name || retailer.name,
            address: retailer.physical_address || retailer.street_address || '',
            city: retailer.city,
            state: retailer.state,
            postalCode: retailer.zip_code || retailer.postal_code || '',
            phone: retailer.contact_phone || retailer.phone,
            hours: retailer.hours, // v1 might not have hours in this endpoint
            latitude: retailer.latitude || retailer.geo?.lat,
            longitude: retailer.longitude || retailer.geo?.lng,
            menuUrl: retailer.website_url || retailer.menu_url,
            imageUrl: retailer.image_url, // v1 might not have image_url
            distance: (retailer.latitude || retailer.geo?.lat) && (retailer.longitude || retailer.geo?.lng)
                ? calculateDistance(latitude, longitude, retailer.latitude || retailer.geo?.lat, retailer.longitude || retailer.geo?.lng)
                : undefined,
        }));

        // Filter by state if provided (client-side backup)
        let filtered = retailers;
        if (state) {
            filtered = filtered.filter(r =>
                (r.state && r.state.toLowerCase() === state.toLowerCase()) ||
                (r.state && r.state.toLowerCase() === (state === 'CA' ? 'california' : state.toLowerCase())) // Handle basic mapping
            );
        }

        // Filter by city if provided (exact match preferred)
        if (cityName) {
            const cityMatch = filtered.filter(r => r.city && r.city.toLowerCase() === cityName.toLowerCase());
            if (cityMatch.length > 0) {
                // If we found exact city matches, prioritize them
                // But keep others if they are close
            }
        }

        // Sort by distance if available
        return filtered
            .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
            .slice(0, limit);
    } catch (error) {
        logger.error('Error fetching nearby retailers:', error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}


/**
 * Get products available at a specific retailer
 */
/**
 * Get products available at a specific retailer
 */
export async function getRetailerProducts(
    retailerId: string,
    options?: {
        category?: string;
        search?: string;
        brands?: string[];
        state?: string; // v1 API requires state
    }
): Promise<CannMenusProduct[]> {
    try {
        const params = new URLSearchParams();

        // v1 requires ONE of: states, brands, etc. For retailer filtering, we use retailer_ids AND states.
        // We fundamentally need the state. If not provided, we might fail or default to 'California' (risky).
        if (options?.state) {
            params.append('states', options.state);
        } else {
            // Fallback or error? For now, let's try 'California' as fallback if not provided, 
            // but ideally the caller passes it.
            console.warn('[CannMenus] State is required for v1/products but not provided. Defaulting to California.');
            params.append('states', 'California');
        }

        // Use retailer_ids for v1
        params.append('retailer_ids', retailerId);

        if (options?.category) {
            params.append('category', options.category);
        }

        if (options?.search) {
            params.append('search', options.search);
        }

        if (options?.brands && options.brands.length > 0) {
            params.append('brands', options.brands.join(','));
        }

        // Default limit
        params.append('limit', '50');

        const response = await fetch(
            `${CANNMENUS_BASE_URL}/v1/products?${params}`,
            {
                headers: {
                    'X-Token': CANNMENUS_API_KEY!,
                    'Accept': 'application/json',
                    'User-Agent': 'BakedBot/1.0',
                },
            }
        );

        if (!response.ok) {
            // Log the error body for debugging if it fails again
            try {
                const text = await response.text();
                console.error(`[CannMenus] API Error Body: ${text}`);
            } catch (e) { }
            throw new Error(`CannMenus API error: ${response.statusText}`);
        }

        const data = await response.json();

        // v1 response has 'data' array directly
        const products: CannMenusProduct[] = [];
        const items = data.data || []; // v1 usually puts items in data

        // Transform v1 items to CannMenusProduct structure if needed
        // v1 item keys: id, brand_id, retailer_id, name, ...
        // We need to map them to CannMenusProduct (cann_sku_id, etc.)
        items.forEach((item: any) => {
            products.push({
                cann_sku_id: item.id?.toString() || item.sku || '',
                product_name: item.name || item.product_name || 'Unknown Product',
                brand_name: item.brand_name || item.brand?.name || 'Unknown Brand',
                category: item.category || 'Uncategorized',
                sub_category: item.sub_category || '',
                image_url: item.image_url || item.image || '',
                latest_price: item.price ? Number(item.price) : 0,
                percentage_thc: item.thc || '',
                percentage_cbd: item.cbd || '',
                product_type: item.type || '',
                brand_id: item.brand_id?.toString() || '',
                url: item.menu_url || '',
                display_weight: item.weight || '',

                original_price: item.price ? Number(item.price) : 0,
                medical: true,
                recreational: true
            } as CannMenusProduct);

        });

        // Deduplicate by cann_sku_id
        const uniqueProducts = Array.from(
            new Map(products.filter(p => p.cann_sku_id).map(p => [p.cann_sku_id, p])).values()
        );

        return uniqueProducts;
    } catch (error) {
        logger.error('Error fetching retailer products:', error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}


/**
 * Get product availability across multiple retailers
 */
export async function getProductAvailability(
    productId: string,
    retailerIds: string[]
): Promise<ProductAvailability[]> {
    try {
        const params = new URLSearchParams({
            retailers: retailerIds.join(','),
            sku_id: productId,
        });

        const response = await fetch(
            `${CANNMENUS_BASE_URL}/v2/products?${params}`,
            {
                headers: {
                    'X-Token': CANNMENUS_API_KEY!,
                    'Accept': 'application/json',
                    'User-Agent': 'BakedBot/1.0',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`CannMenus API error: ${response.statusText}`);
        }

        const data = await response.json();

        const availability: ProductAvailability[] = [];

        if (data.data) {
            data.data.forEach((retailerData: any) => {
                if (retailerData.products && Array.isArray(retailerData.products)) {
                    retailerData.products.forEach((product: CannMenusProduct) => {
                        availability.push({
                            productId: product.cann_sku_id,
                            retailerId: retailerData.retailer_id,
                            price: product.latest_price,
                            salePrice: product.original_price !== product.latest_price
                                ? product.latest_price
                                : undefined,
                            inStock: true, // CannMenus doesn't provide stock status directly
                            lastUpdated: new Date().toISOString(),
                        });
                    });
                }
            });
        }

        return availability;
    } catch (error) {
        logger.error('Error fetching product availability:', error instanceof Error ? error : new Error(String(error)));
        return [];

    }
}


/**
 * Convert ZIP code to coordinates using a simple geocoding service
 */
export async function geocodeZipCode(zipCode: string): Promise<{ lat: number; lng: number; city?: string; state?: string } | null> {
    try {
        // Using a free geocoding service (you can replace with Google Maps API if you have a key)
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=US&format=json&limit=1&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'BakedBot-Headless-Menu',
                },
            }
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        if (data && data.length > 0) {
            const result = data[0];
            const address = result.address || {};
            return {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                city: address.city || address.town || address.village || address.hamlet,
                state: address.state
            };
        }

        return null;
    } catch (error) {
        logger.error('Error geocoding ZIP code:', error instanceof Error ? error : new Error(String(error)));
        return null;
    }
}

/**
 * Search products by brand and state
 */
export async function getProducts(brandId: string, state?: string): Promise<any[]> {
    try {
        const params = new URLSearchParams({
            brands: brandId,
            limit: '100'
        });

        if (state) {
            params.append('states', state);
        }

        const response = await fetch(
            `${CANNMENUS_BASE_URL}/v2/products?${params}`,
            {
                headers: {
                    'X-Token': CANNMENUS_API_KEY!,
                    'Accept': 'application/json',
                    'User-Agent': 'BakedBot/1.0',
                },
            }
        );

        if (!response.ok) {
            logger.error(`CannMenus API error: ${response.statusText}`);
            return [];
        }

        const data = await response.json();

        // Flatten products from all retailers
        const products: any[] = [];
        if (data.data) {
            data.data.forEach((item: any) => {
                if (item.products && Array.isArray(item.products)) {
                    item.products.forEach((p: CannMenusProduct) => {
                        products.push({
                            id: p.cann_sku_id,
                            name: p.product_name,
                            brand: p.brand_name,
                            category: p.category,
                            price: p.latest_price,
                            image: p.image_url,
                            description: p.description,
                            effects: p.effects || []
                        });
                    });
                }
            });
        }

        // Deduplicate by product ID
        const uniqueProducts = Array.from(
            new Map(products.map(p => [p.id, p])).values()
        );

        return uniqueProducts;
    } catch (error) {
        logger.error('Error fetching products:', error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}
