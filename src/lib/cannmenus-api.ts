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
    state?: string
): Promise<RetailerLocation[]> {
    try {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        if (state) {
            params.append('states', state);
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

        // Sort by distance if available
        return retailers
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
export async function getRetailerProducts(
    retailerId: string,
    options?: {
        category?: string;
        search?: string;
        brands?: string[];
    }
): Promise<CannMenusProduct[]> {
    try {
        const params = new URLSearchParams({
            retailers: retailerId,
        });

        if (options?.category) {
            params.append('category', options.category);
        }

        if (options?.search) {
            params.append('search', options.search);
        }

        if (options?.brands && options.brands.length > 0) {
            params.append('brands', options.brands.join(','));
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
            throw new Error(`CannMenus API error: ${response.statusText}`);
        }

        const data = await response.json();

        // Flatten the products from retailer data
        const products: CannMenusProduct[] = [];
        if (data.data) {
            data.data.forEach((item: any) => {
                if (item.products && Array.isArray(item.products)) {
                    products.push(...item.products);
                }
            });
        }

        // Deduplicate by cann_sku_id
        const uniqueProducts = Array.from(
            new Map(products.map(p => [p.cann_sku_id, p])).values()
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
export async function geocodeZipCode(zipCode: string): Promise<{ lat: number; lng: number } | null> {
    try {
        // Using a free geocoding service (you can replace with Google Maps API if you have a key)
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=US&format=json&limit=1`,
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
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
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
export async function getProducts(brandId: string, state: string): Promise<any[]> {
    try {
        const params = new URLSearchParams({
            brands: brandId,
            states: state,
            limit: '100'
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
