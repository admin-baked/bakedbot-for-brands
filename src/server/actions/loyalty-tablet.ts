'use server';

/**
 * Loyalty Tablet Server Actions
 *
 * Handles email/phone capture from the in-store loyalty tablet at Thrive Syracuse.
 * Extended with mood-based Smokey recommendations and visit/review sequence tracking.
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';
import { fetchMenuProducts } from '@/server/agents/adapters/consumer-adapter';
import {
    getTabletMoodById,
    type MoodRecommendationsResult,
    type TabletBundle,
    type TabletMoodId,
    type TabletProduct,
} from '@/lib/checkin/loyalty-tablet-shared';
import { getSafeProductImageUrl, normalizeCategoryName } from '@/lib/utils/product-image';
import { searchMenuProducts } from '@/server/services/smokey-menu-search';
import { captureVisitorCheckin } from './visitor-checkin';

// ============================================================
// Types
// ============================================================

export interface TabletLeadResult {
    success: boolean;
    isNewLead: boolean;
    customerId?: string;
    loyaltyPoints?: number;
    visitId?: string;
    error?: string;
}

// ============================================================
// Server Actions
// ============================================================

const captureSchema = z.object({
    orgId: z.string().min(1),
    firstName: z.string().min(1).max(100),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    emailConsent: z.boolean(),
    smsConsent: z.boolean(),
    mood: z.string().optional(),
    cartProductIds: z.array(z.string()).optional(),
    bundleAdded: z.boolean().optional(),
});

type MoodRecommendationConfig = {
    searchQuery: string;
    preferredCategories: string[];
    reason: string;
    bundleName: string;
    bundleTagline: string;
};

type RawMenuProduct = {
    id?: string;
    productId?: string;
    externalId?: string;
    sku_id?: string;
    cann_sku_id?: string;
    name?: string;
    product_name?: string;
    productName?: string;
    category?: string;
    category_name?: string;
    productType?: string;
    price?: number | string;
    retailPrice?: number | string;
    latest_price?: number | string;
    current_price?: number | string;
    brandName?: string;
    brand?: string;
    brand_name?: string;
    imageUrl?: string;
    image_url?: string;
    primary_image?: string;
    stock?: number;
    quantity_available?: number;
    qty?: number;
    in_stock?: boolean;
    inStock?: boolean;
    description?: string;
    strainType?: string;
    strain_type?: string;
};

const MOOD_RECOMMENDATION_CONFIGS: Record<TabletMoodId, MoodRecommendationConfig> = {
    relaxed: {
        searchQuery: 'relax calm unwind soothing indica cbd',
        preferredCategories: ['Flower', 'Pre-Rolls', 'Edibles', 'Vapes'],
        reason: 'Picked for a calmer, more easygoing session.',
        bundleName: 'Slow It Down',
        bundleTagline: 'A mellow pair for a relaxed visit.',
    },
    energized: {
        searchQuery: 'energy focus creative uplifting sativa daytime',
        preferredCategories: ['Flower', 'Pre-Rolls', 'Vapes'],
        reason: 'Picked for a brighter, more upbeat daytime vibe.',
        bundleName: 'Day Starter',
        bundleTagline: 'A quick combo for energy and lift.',
    },
    sleep: {
        searchQuery: 'sleep sleepy nighttime rest indica soothing',
        preferredCategories: ['Flower', 'Edibles', 'Vapes', 'Tinctures'],
        reason: 'Picked for a softer nighttime wind-down.',
        bundleName: 'Lights Out',
        bundleTagline: 'A heavier evening pair for a slower landing.',
    },
    anxious: {
        searchQuery: 'calm gentle cbd low thc soothing stress',
        preferredCategories: ['Tinctures', 'Edibles', 'Flower', 'Topicals'],
        reason: 'Picked to keep the vibe gentler and more grounded.',
        bundleName: 'Keep It Gentle',
        bundleTagline: 'A calmer pair for a softer entry point.',
    },
    social: {
        searchQuery: 'social happy uplifting euphoric hybrid creative fun',
        preferredCategories: ['Flower', 'Pre-Rolls', 'Vapes'],
        reason: 'Picked for a more social, upbeat session.',
        bundleName: 'Pass The Good Vibes',
        bundleTagline: 'A lively pair built for a friendly hang.',
    },
    pain: {
        searchQuery: 'comfort body cbd topical soothing recovery',
        preferredCategories: ['Topicals', 'Tinctures', 'Flower', 'Edibles'],
        reason: 'Picked for a more body-forward, comfort-focused session.',
        bundleName: 'Ease Into It',
        bundleTagline: 'A supportive pair for a slower, steadier reset.',
    },
    new: {
        searchQuery: 'beginner low dose cbd gentle balanced approachable',
        preferredCategories: ['Flower', 'Pre-Rolls', 'Tinctures', 'Capsules'],
        reason: 'Picked to stay approachable for a newer shopper.',
        bundleName: 'Start Smart',
        bundleTagline: 'A lighter pair for first-timers and low-pressure browsing.',
    },
};

function getProductId(product: RawMenuProduct, index: number): string {
    return String(
        product.id ??
        product.productId ??
        product.externalId ??
        product.sku_id ??
        product.cann_sku_id ??
        `tablet-product-${index}`
    );
}

function getProductName(product: RawMenuProduct): string {
    const rawName = product.name ?? product.product_name ?? product.productName;
    return typeof rawName === 'string' && rawName.trim() !== '' ? rawName.trim() : 'Menu Product';
}

function getProductCategory(product: RawMenuProduct): string {
    const rawCategory = product.category ?? product.category_name ?? product.productType;
    return normalizeCategoryName(typeof rawCategory === 'string' ? rawCategory : undefined);
}

function getProductPrice(product: RawMenuProduct): number {
    const value = Number(product.price ?? product.retailPrice ?? product.latest_price ?? product.current_price ?? 0);
    return Number.isFinite(value) ? value : 0;
}

function getProductBrandName(product: RawMenuProduct): string | undefined {
    const rawBrand = product.brandName ?? product.brand ?? product.brand_name;
    if (typeof rawBrand !== 'string') {
        return undefined;
    }

    const trimmed = rawBrand.trim();
    return trimmed !== '' ? trimmed : undefined;
}

function getProductImageUrl(product: RawMenuProduct): string | undefined {
    const rawImage = product.imageUrl ?? product.image_url ?? product.primary_image;
    if (typeof rawImage !== 'string' || rawImage.trim() === '') {
        return undefined;
    }

    return getSafeProductImageUrl(rawImage);
}

function getProductStock(product: RawMenuProduct): number | null {
    const rawStock = product.stock ?? product.quantity_available ?? product.qty;
    if (typeof rawStock === 'number' && Number.isFinite(rawStock)) {
        return rawStock;
    }

    if (product.in_stock === false || product.inStock === false) {
        return 0;
    }

    return null;
}

function isLikelyInStock(product: RawMenuProduct): boolean {
    const stock = getProductStock(product);
    return stock === null || stock > 0;
}

function dedupeProducts(products: RawMenuProduct[]): RawMenuProduct[] {
    const seen = new Set<string>();

    return products.filter((product, index) => {
        const id = getProductId(product, index);
        if (seen.has(id)) {
            return false;
        }

        seen.add(id);
        return true;
    });
}

function buildFallbackPool(products: RawMenuProduct[], config: MoodRecommendationConfig): RawMenuProduct[] {
    const uniqueProducts = dedupeProducts(products);
    const rankedMatches = dedupeProducts(
        searchMenuProducts(config.searchQuery, uniqueProducts, { limit: 8 }) as RawMenuProduct[]
    );
    const stockAwarePool = uniqueProducts.filter(isLikelyInStock);
    const baselinePool = stockAwarePool.length > 0 ? stockAwarePool : uniqueProducts;
    const searchTokens = Array.from(new Set(
        config.searchQuery.toLowerCase().split(/\s+/).filter((token) => token.length > 2)
    ));

    const sortedFallbacks = baselinePool
        .map((product) => {
            const category = getProductCategory(product);
            const name = getProductName(product).toLowerCase();
            const haystack = [
                name,
                category.toLowerCase(),
                getProductBrandName(product)?.toLowerCase() ?? '',
                typeof product.description === 'string' ? product.description.toLowerCase() : '',
                typeof product.strainType === 'string' ? product.strainType.toLowerCase() : '',
                typeof product.strain_type === 'string' ? product.strain_type.toLowerCase() : '',
            ].join(' ');
            const score = (config.preferredCategories.includes(category) ? 3 : 0) +
                searchTokens.filter((token) => haystack.includes(token)).length;

            return {
                product,
                name,
                price: getProductPrice(product),
                score,
            };
        })
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }

            if (left.price !== right.price) {
                return left.price - right.price;
            }

            return left.name.localeCompare(right.name);
        })
        .map((entry) => entry.product);

    return dedupeProducts([...rankedMatches, ...sortedFallbacks]);
}

function buildProductReason(config: MoodRecommendationConfig, category: string): string {
    return `${config.reason} It keeps the ${category.toLowerCase()} mix grounded in Thrive's live menu.`;
}

function toTabletProduct(product: RawMenuProduct, config: MoodRecommendationConfig, index: number): TabletProduct {
    const category = getProductCategory(product);

    return {
        productId: getProductId(product, index),
        name: getProductName(product),
        price: getProductPrice(product),
        category,
        brandName: getProductBrandName(product),
        imageUrl: getProductImageUrl(product),
        reason: buildProductReason(config, category),
    };
}

function buildBundle(pool: RawMenuProduct[], config: MoodRecommendationConfig): TabletBundle | null {
    const primary = pool[0];
    if (!primary) {
        return null;
    }

    const secondary = pool.find((product, index) => (
        index > 0 &&
        getProductId(product, index) !== getProductId(primary, 0) &&
        getProductCategory(product) !== getProductCategory(primary)
    )) ?? pool.find((product, index) => index > 0);

    if (!secondary) {
        return null;
    }

    const products = [primary, secondary].map((product, index) => toTabletProduct(product, config, index));

    return {
        name: config.bundleName,
        tagline: config.bundleTagline,
        products,
        totalPrice: Number(products.reduce((total, product) => total + product.price, 0).toFixed(2)),
    };
}

/**
 * Get mood-based product recommendations from Smokey.
 * Fetches live Thrive Syracuse inventory, then uses the existing Smokey menu
 * search heuristics for fast, deterministic picks that do not block on an LLM.
 */
export async function getMoodRecommendations(
    orgId: string,
    moodId: string,
): Promise<MoodRecommendationsResult> {
    try {
        const mood = getTabletMoodById(moodId);
        if (!mood) {
            return { success: false, error: 'Unknown mood' };
        }

        const products = (await fetchMenuProducts(orgId)) as RawMenuProduct[];
        if (!products.length) {
            return { success: false, error: 'No products available' };
        }

        const config = MOOD_RECOMMENDATION_CONFIGS[mood.id];
        const pool = buildFallbackPool(products, config);
        const featuredProducts = pool.slice(0, 3).map((product, index) => toTabletProduct(product, config, index));

        if (!featuredProducts.length) {
            return { success: false, error: 'No products available' };
        }

        const bundle = buildBundle(pool, config);

        logger.info('[LoyaltyTablet] Mood recommendations generated', {
            orgId,
            moodId,
            productCount: featuredProducts.length,
            bundleProductCount: bundle?.products.length ?? 0,
            inventoryCount: products.length,
            strategy: 'deterministic_menu_search',
        });

        return {
            success: true,
            products: featuredProducts,
            bundle: bundle ?? undefined,
        };
    } catch (error) {
        logger.error('[LoyaltyTablet] getMoodRecommendations failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get recommendations',
        };
    }
}

/**
 * Capture lead from loyalty tablet (in-store kiosk).
 * Creates/updates email_leads + customer profile.
 * Stores mood, cart selections, and schedules review sequence.
 */
export async function captureTabletLead(params: {
    orgId: string;
    firstName: string;
    email?: string;
    phone?: string;
    emailConsent: boolean;
    smsConsent: boolean;
    mood?: string;
    cartProductIds?: string[];
    bundleAdded?: boolean;
}): Promise<TabletLeadResult> {
    try {
        const validated = captureSchema.parse(params);
        const { orgId, firstName, email, phone, emailConsent, smsConsent, mood, cartProductIds, bundleAdded } = validated;

        if (!phone) {
            return { success: false, isNewLead: false, error: 'Phone required' };
        }

        const result = await captureVisitorCheckin({
            orgId,
            firstName,
            email: email || undefined,
            phone,
            emailConsent,
            smsConsent,
            source: 'loyalty_tablet_checkin',
            ageVerifiedMethod: 'staff_visual_check',
            mood,
            cartProductIds,
            bundleAdded,
        });

        return {
            success: result.success,
            isNewLead: result.isNewLead,
            customerId: result.customerId,
            loyaltyPoints: result.loyaltyPoints,
            visitId: result.visitId,
            error: result.error,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, isNewLead: false, error: error.errors[0].message };
        }

        logger.error('[LoyaltyTablet] Capture failed', { error });
        return {
            success: false,
            isNewLead: false,
            error: error instanceof Error ? error.message : 'Failed to capture lead',
        };
    }
}
