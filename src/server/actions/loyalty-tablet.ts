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
    type TabletSearchRecommendationsResult,
    type TabletMoodId,
    type TabletProduct,
} from '@/lib/checkin/loyalty-tablet-shared';
import { getSafeProductImageUrl, normalizeCategoryName } from '@/lib/utils/product-image';
import { searchMenuProducts } from '@/server/services/smokey-menu-search';
import { getCustomerHistory } from '@/server/tools/crm-tools';
import { captureVisitorCheckin } from './visitor-checkin';
import { getAdminFirestore } from '@/firebase/admin';

// ============================================================
// Types
// ============================================================

export interface TabletLeadResult {
    success: boolean;
    isNewLead: boolean;
    customerId?: string;
    loyaltyPoints?: number;
    visitId?: string;
    queuePosition?: number; // how many check-ins are ahead of this one today
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

type RecommendationSet = {
    products: TabletProduct[];
    bundle?: TabletBundle;
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

const GENERIC_SEARCH_CATEGORIES = ['Flower', 'Pre-Rolls', 'Edibles', 'Vapes', 'Tinctures'];

function getProductId(product: RawMenuProduct): string {
    const explicit =
        product.id ??
        product.productId ??
        product.externalId ??
        product.sku_id ??
        product.cann_sku_id;
    if (explicit != null) return String(explicit);
    // Fallback: use normalised name so the same product dedupes across array boundaries
    const name = getProductName(product).toLowerCase().trim();
    return `tablet-name:${name}`;
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

    return products.filter((product) => {
        const id = getProductId(product);
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

function toTabletProduct(product: RawMenuProduct, config: MoodRecommendationConfig): TabletProduct {
    const category = getProductCategory(product);

    return {
        productId: getProductId(product),
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

    const primaryId = getProductId(primary);
    const secondary = pool.find((product, index) => (
        index > 0 &&
        getProductId(product) !== primaryId &&
        getProductCategory(product) !== getProductCategory(primary)
    )) ?? pool.find((_product, index) => index > 0);

    if (!secondary) {
        return null;
    }

    const products = [primary, secondary].map((product) => toTabletProduct(product, config));

    return {
        name: config.bundleName,
        tagline: config.bundleTagline,
        products,
        totalPrice: Number(products.reduce((total, product) => total + product.price, 0).toFixed(2)),
    };
}

function buildRecommendationSet(pool: RawMenuProduct[], config: MoodRecommendationConfig): RecommendationSet {
    const products = pool.slice(0, 3).map((product) => toTabletProduct(product, config));
    const bundle = buildBundle(pool, config) ?? undefined;

    return {
        products,
        ...(bundle ? { bundle } : {}),
    };
}

function createQueryRecommendationConfig(query: string, moodLabel?: string | null): MoodRecommendationConfig {
    const trimmedQuery = query.trim();
    const quotedQuery = trimmedQuery ? `"${trimmedQuery}"` : 'this request';
    const moodSuffix = moodLabel ? ` while staying aligned with ${moodLabel}` : '';

    return {
        searchQuery: trimmedQuery,
        preferredCategories: GENERIC_SEARCH_CATEGORIES,
        reason: `Picked for ${quotedQuery}${moodSuffix}.`,
        bundleName: moodLabel ? 'Smokey Counter Pair' : 'Staff Pick Pair',
        bundleTagline: moodLabel
            ? `A fast pair for ${moodLabel.toLowerCase()} shoppers and budtenders.`
            : "Two easy talking points pulled from Thrive's live menu.",
    };
}

function buildSearchSummary(query: string, productCount: number, moodLabel?: string | null): string {
    const trimmedQuery = query.trim();
    const requestLabel = trimmedQuery ? `"${trimmedQuery}"` : 'that request';
    const moodSuffix = moodLabel ? ` while keeping the ${moodLabel.toLowerCase()} vibe in mind` : '';
    const productLabel = productCount === 1 ? 'product' : 'products';

    return `I found ${productCount} ${productLabel} for ${requestLabel}${moodSuffix}.`;
}

function buildSearchPool(
    products: RawMenuProduct[],
    query: string,
    moodConfig?: MoodRecommendationConfig
): RawMenuProduct[] {
    const uniqueProducts = dedupeProducts(products);
    const searchMatches = dedupeProducts(
        searchMenuProducts(query, uniqueProducts, { limit: 8 }) as RawMenuProduct[]
    );

    if (!moodConfig || searchMatches.length >= 3) {
        return searchMatches;
    }

    const moodPool = buildFallbackPool(uniqueProducts, moodConfig);
    return dedupeProducts([...searchMatches, ...moodPool]);
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
        const recommendationSet = buildRecommendationSet(pool, config);

        if (!recommendationSet.products.length) {
            return { success: false, error: 'No products available' };
        }

        logger.info('[LoyaltyTablet] Mood recommendations generated', {
            orgId,
            moodId,
            productCount: recommendationSet.products.length,
            bundleProductCount: recommendationSet.bundle?.products.length ?? 0,
            inventoryCount: products.length,
            strategy: 'deterministic_menu_search',
        });

        return {
            success: true,
            ...recommendationSet,
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
 * Search the live menu using a freeform customer or budtender request.
 * Reuses the same deterministic menu-search heuristics as the mood flow so the
 * tablet voice/text assistant stays grounded in the live inventory.
 */
export async function searchTabletRecommendations(
    orgId: string,
    query: string,
    moodId?: string | null,
    customerId?: string | null,
): Promise<TabletSearchRecommendationsResult> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) {
        return {
            success: false,
            error: 'Tell Smokey a little more so I can narrow the menu down.',
        };
    }

    try {
        // Fetch products + optional purchase history in parallel
        const [products, history] = await Promise.all([
            fetchMenuProducts(orgId) as Promise<RawMenuProduct[]>,
            customerId
                ? getCustomerHistory(customerId, orgId, 3).catch(() => null)
                : Promise.resolve(null),
        ]);

        if (!products.length) {
            return { success: false, error: 'No products available' };
        }

        // Enrich the search query with purchase history so the search pool
        // can surface products matching past preferences.
        const enrichedQuery = history?.summary
            ? `${trimmedQuery} (history: ${history.summary.slice(0, 300)})`
            : trimmedQuery;

        const mood = getTabletMoodById(moodId);
        const moodConfig = mood ? MOOD_RECOMMENDATION_CONFIGS[mood.id] : undefined;
        const pool = buildSearchPool(products, enrichedQuery, moodConfig);
        if (!pool.length) {
            logger.info('[LoyaltyTablet] Freeform search had no matches', {
                orgId,
                moodId: mood?.id ?? null,
                query: trimmedQuery,
                hasHistory: Boolean(history),
                inventoryCount: products.length,
                strategy: 'deterministic_menu_search_voice',
            });

            return {
                success: false,
                query: trimmedQuery,
                error: `I could not find a strong live-menu match for "${trimmedQuery}" yet.`,
            };
        }

        const config = createQueryRecommendationConfig(trimmedQuery, mood?.label ?? null);
        const recommendationSet = buildRecommendationSet(pool, config);

        logger.info('[LoyaltyTablet] Freeform search recommendations generated', {
            orgId,
            moodId: mood?.id ?? null,
            query: trimmedQuery,
            hasHistory: Boolean(history),
            productCount: recommendationSet.products.length,
            bundleProductCount: recommendationSet.bundle?.products.length ?? 0,
            inventoryCount: products.length,
            strategy: 'deterministic_menu_search_voice',
        });

        return {
            success: true,
            query: trimmedQuery,
            summary: buildSearchSummary(trimmedQuery, recommendationSet.products.length, mood?.label ?? null),
            ...recommendationSet,
        };
    } catch (error) {
        logger.error('[LoyaltyTablet] searchTabletRecommendations failed', {
            error,
            orgId,
            moodId: moodId ?? null,
            query: trimmedQuery,
            hasCustomerId: Boolean(customerId),
        });

        return {
            success: false,
            query: trimmedQuery,
            error: error instanceof Error ? error.message : 'Failed to search the live menu',
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

        let queuePosition: number | undefined;
        if (result.success && result.visitId) {
            try {
                const db = getAdminFirestore();
                const todayMidnight = new Date();
                todayMidnight.setHours(0, 0, 0, 0);
                const snap = await db.collection('checkin_visits')
                    .where('orgId', '==', orgId)
                    .where('visitedAt', '>=', todayMidnight)
                    .count()
                    .get();
                // Position = total today - 1 (exclude self) — customers ahead
                queuePosition = Math.max(0, (snap.data().count ?? 1) - 1);
            } catch {
                // Non-critical — omit rather than fail the checkin
            }
        }

        return {
            success: result.success,
            isNewLead: result.isNewLead,
            customerId: result.customerId,
            loyaltyPoints: result.loyaltyPoints,
            visitId: result.visitId,
            queuePosition,
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

// ============================================================
// Quick returning-customer lookup by last 4 digits of phone
// ============================================================

export interface QuickLookupResult {
    found: boolean;
    /** Multiple matches — ask customer to confirm which they are */
    matches: Array<{
        customerId: string;
        firstName: string;
        phoneLast4: string;
        loyaltyPoints: number;
    }>;
}

/**
 * Speed-lane check-in: customer enters last 4 digits of phone.
 * Returns matched customers so the tablet can greet by name and skip to mood.
 */
export async function quickLookupByPhoneLast4(
    orgId: string,
    phoneLast4: string,
): Promise<QuickLookupResult> {
    const cleaned = phoneLast4.replace(/\D/g, '');
    if (cleaned.length !== 4) return { found: false, matches: [] };

    try {
        const db = getAdminFirestore();
        const snap = await db
            .collection('customers')
            .where('orgId', '==', orgId)
            .where('phoneLast4', '==', cleaned)
            .limit(5)
            .get();

        if (snap.empty) return { found: false, matches: [] };

        const matches = snap.docs.map((doc) => {
            const d = doc.data();
            return {
                customerId: doc.id,
                firstName: (d.firstName as string) || 'Friend',
                phoneLast4: cleaned,
                loyaltyPoints: (d.loyaltyPoints as number) || 0,
            };
        });

        return { found: true, matches };
    } catch (error) {
        logger.error('[LoyaltyTablet] quickLookupByPhoneLast4 failed', { orgId, error });
        return { found: false, matches: [] };
    }
}
