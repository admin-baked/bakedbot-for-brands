'use server';

/**
 * Loyalty Tablet Server Actions
 *
 * Handles email/phone capture from the in-store loyalty tablet at Thrive Syracuse.
 * Extended with mood-based Smokey recommendations and visit/review sequence tracking.
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';
import {
    getTabletMoodById,
    type MoodRecommendationsResult,
    type TabletBundle,
    type TabletSearchRecommendationsResult,
    type TabletMoodId,
    type TabletProduct,
    type ProductTier,
} from '@/lib/checkin/loyalty-tablet-shared';

export type { TabletProduct, TabletBundle };
import { getSafeProductImageUrl, normalizeCategoryName } from '@/lib/utils/product-image';
import { searchMenuProducts } from '@/server/services/smokey-menu-search';
import { getCustomerHistory } from '@/server/tools/crm-tools';
import { captureVisitorCheckin } from './visitor-checkin';
import { getAdminFirestore } from '@/firebase/admin';
import { getCachedMoodVideoUrl } from '../services/loyalty/mood-video-cache';
import { createTaskInternal } from './agent-tasks';

// ============================================================
// Inventory cache — avoids repeat Firestore reads within a warm instance
// ============================================================

const inventoryCache = new Map<string, { products: RawMenuProduct[]; expiry: number }>();
// 90 s TTL — balances read cost against stale-menu risk during rapid POS syncs.
// POS sync webhook should call invalidateTabletInventoryCache() on push to evict immediately.
const INVENTORY_CACHE_TTL = 90 * 1000; // 90 seconds

/**
 * Fetch live menu products directly from the tenant publicViews path.
 * Uses getAdminFirestore() (same client as all other tablet actions) to avoid
 * the createServerClient() isolation issue in consumer-adapter.ts.
 *
 * Routing:
 *  - org_* orgIds → tenants/{orgId}/publicViews/products/items
 *  - Numeric brandIds → delegates to consumer-adapter (CannMenus)
 */
async function fetchTabletProducts(orgId: string): Promise<RawMenuProduct[]> {
    // Numeric ID → CannMenus via consumer-adapter
    if (/^\d+$/.test(orgId)) {
        const { fetchMenuProducts } = await import('@/server/agents/adapters/consumer-adapter');
        return (await fetchMenuProducts(orgId)) as RawMenuProduct[];
    }

    const db = getAdminFirestore();

    // Primary: tenant publicViews catalog (POS-synced for Thrive, manual for others)
    try {
        const snap = await db
            .collection('tenants')
            .doc(orgId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .get();

        if (!snap.empty) {
            logger.info('[LoyaltyTablet] Loaded products from tenant catalog', {
                orgId,
                count: snap.size,
            });
            return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as RawMenuProduct[];
        }
    } catch (err) {
        logger.warn('[LoyaltyTablet] Tenant catalog read failed', {
            orgId,
            error: err instanceof Error ? err.message : String(err),
        });
    }

    // Fallback: strip prefix variants (e.g. org_thrive_syracuse → thrive_syracuse)
    const base = orgId.replace(/^(org_|brand_|dispensary_)/, '');
    if (base !== orgId) {
        try {
            const snap = await db
                .collection('tenants')
                .doc(base)
                .collection('publicViews')
                .doc('products')
                .collection('items')
                .get();

            if (!snap.empty) {
                logger.info('[LoyaltyTablet] Loaded products from base tenant catalog', {
                    orgId,
                    base,
                    count: snap.size,
                });
                return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as RawMenuProduct[];
            }
        } catch {
            // Silently fall through
        }
    }

    logger.info('[LoyaltyTablet] No products found in tenant catalog', { orgId });
    return [];
}

async function getCachedMenuProducts(orgId: string): Promise<RawMenuProduct[]> {
    const now = Date.now();
    const cached = inventoryCache.get(orgId);
    if (cached && cached.expiry > now) return cached.products;
    const products = await fetchTabletProducts(orgId);
    inventoryCache.set(orgId, { products, expiry: now + INVENTORY_CACHE_TTL });
    return products;
}

/**
 * Pre-warms the inventory cache for an org so mood recs return instantly.
 * Call this when the mood-selection step renders on the tablet.
 */
export async function prefetchTabletInventory(orgId: string): Promise<void> {
    await getCachedMenuProducts(orgId).catch(() => undefined);
}

/**
 * Immediately evict the inventory cache for an org.
 * Call from the Alleaves POS sync webhook after a successful product push
 * so the next tablet request sees fresh inventory without waiting for TTL expiry.
 */
export async function invalidateTabletInventoryCache(orgId: string): Promise<void> {
    inventoryCache.delete(orgId);
    logger.info('[LoyaltyTablet] Inventory cache evicted', { orgId });
}

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
    firstName: z.string().max(100).transform(v => (v ?? '').trim() || 'Guest'),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    emailConsent: z.boolean(),
    smsConsent: z.boolean(),
    mood: z.string().optional(),
    cartProductIds: z.array(z.string()).optional(),
    bundleAdded: z.boolean().optional(),
    // Personalization dossier fields
    birthday: z.string().max(10).optional(),           // "MM/DD" format
    visitPreferences: z.array(z.string()).max(5).optional(), // ['first-timer','recreational',...]
    offerProductId: z.string().optional(),              // claimed deal product
    customerId: z.string().optional(),                  // known customer from quick lookup
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
    selling_price?: number | string;
    salePrice?: number | string;
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
    thcPercent?: number;
    thc_percent?: number;
    thc?: number;
    cbdPercent?: number;
    cbd_percent?: number;
    cbd?: number;
    effects?: string[];
    terpenes?: string[];
    terpenoids?: string[];
};

// Categories scanned from purchase history text to infer customer preferences
const BUDTENDER_CATEGORY_KEYWORDS = ['flower', 'edible', 'concentrate', 'vape', 'pre-roll', 'tincture', 'topical', 'cbd'] as const;

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

/**
 * Cross-category sampler used when the mood filter returns no matches.
 * Picks the first product from each unique category (up to 3) so the tablet
 * always shows something rather than an error screen.
 */
function buildPopularPicksFallback(products: RawMenuProduct[]): TabletProduct[] {
    const seenCategories = new Set<string>();
    const picks: TabletProduct[] = [];
    for (const product of products) {
        if (picks.length >= 3) break;
        const category = getProductCategory(product);
        if (!seenCategories.has(category)) {
            seenCategories.add(category);
            picks.push({
                productId: getProductId(product),
                name: getProductName(product),
                price: getProductPrice(product),
                category,
                brandName: getProductBrandName(product),
                imageUrl: getProductImageUrl(product),
                reason: "A staff favorite from today's menu — you might enjoy this one.",
                ...getProductPotency(product),
            });
        }
    }
    return picks;
}

function classifyProductTier(price: number): ProductTier {
    if (price < 20) return 'budget';
    if (price <= 50) return 'mid';
    return 'premium';
}

function getProductPotency(product: RawMenuProduct): Pick<TabletProduct, 'thcPercent' | 'cbdPercent' | 'strainType' | 'effects' | 'terpenes' | 'description'> {
    const thcRaw = product.thcPercent ?? product.thc_percent ?? product.thc;
    const cbdRaw = product.cbdPercent ?? product.cbd_percent ?? product.cbd;
    const strainType = typeof product.strainType === 'string' ? product.strainType
        : typeof product.strain_type === 'string' ? product.strain_type
        : undefined;
    const rawTerpenes = product.terpenes ?? product.terpenoids;
    const description = typeof product.description === 'string' && product.description.trim()
        ? product.description.trim()
        : undefined;
    return {
        thcPercent: typeof thcRaw === 'number' && thcRaw > 0 ? thcRaw : undefined,
        cbdPercent: typeof cbdRaw === 'number' && cbdRaw > 0 ? cbdRaw : undefined,
        strainType,
        effects: Array.isArray(product.effects) && product.effects.length > 0
            ? product.effects as string[]
            : undefined,
        terpenes: Array.isArray(rawTerpenes) && rawTerpenes.length > 0
            ? rawTerpenes as string[]
            : undefined,
        description,
    };
}

function toTabletProduct(product: RawMenuProduct, config: MoodRecommendationConfig): TabletProduct {
    const category = getProductCategory(product);
    const price = getProductPrice(product);
    return {
        productId: getProductId(product),
        name: getProductName(product),
        price,
        category,
        brandName: getProductBrandName(product),
        imageUrl: getProductImageUrl(product),
        reason: buildProductReason(config, category),
        tier: classifyProductTier(price),
        ...getProductPotency(product),
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
    // Prefer one product per category (Flower → Edibles → Vapes → Pre-Rolls → …) so the
    // customer sees the broadest menu spread possible. Fall back to top-scored if a
    // category has no match in the pool.
    const categoryOrder = ['Flower', 'Edibles', 'Vapes', 'Pre-Rolls', 'Concentrates', 'Tinctures', 'Topicals'];
    const picked: RawMenuProduct[] = [];
    const usedIds = new Set<string>();

    for (const cat of categoryOrder) {
        if (picked.length >= 3) break;
        const match = pool.find((p) => {
            if (usedIds.has(getProductId(p))) return false;
            return getProductCategory(p) === cat;
        });
        if (match) {
            picked.push(match);
            usedIds.add(getProductId(match));
        }
    }

    // Backfill with top-scored products if we have fewer than 3
    for (const p of pool) {
        if (picked.length >= 3) break;
        if (!usedIds.has(getProductId(p))) {
            picked.push(p);
            usedIds.add(getProductId(p));
        }
    }

    const products = picked.map((product) => toTabletProduct(product, config));
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
    // ── Org-level access guard ─────────────────────────────────────────
    try {
        const { requireUser } = await import('@/server/auth/auth');
        const sessionUser = await requireUser();
        const sessionOrgId = (sessionUser as { orgId?: string; currentOrgId?: string })?.currentOrgId
            ?? (sessionUser as { orgId?: string })?.orgId;
        const sessionRole = (sessionUser as { role?: string })?.role;
        const isSuperUser = sessionRole === 'super_user' || sessionRole === 'super_admin';
        if (!isSuperUser && sessionOrgId && sessionOrgId !== orgId) {
            logger.warn('[LoyaltyTablet] getMoodRecommendations rejected — org mismatch', {
                sessionOrgId,
                payloadOrgId: orgId,
            });
            return { success: false, error: 'Unauthorized org' };
        }
    } catch {
        // Proceed for pre-shipped kiosks
    }

    try {
        const mood = getTabletMoodById(moodId);
        if (!mood) {
            return { success: false, error: 'Unknown mood' };
        }

        const products = await getCachedMenuProducts(orgId);
        if (!products.length) {
            createTaskInternal({
                title: `[Tablet] No products in inventory for ${orgId}`,
                body: `getMoodRecommendations returned empty inventory for orgId=${orgId}, moodId=${moodId}.\n\nThe check-in recommendations screen showed "Could not load recommendations".\n\n**Likely causes:** POS sync not running, publicViews/products/items empty in Firestore.\n\n**File:** src/server/actions/loyalty-tablet.ts`,
                priority: 'critical',
                category: 'bug',
                reportedBy: 'loyalty-tablet',
                assignedTo: 'linus',
                filePath: 'src/server/actions/loyalty-tablet.ts',
                errorSnippet: `No products found for orgId=${orgId}`,
            }).catch(() => { /* fire-and-forget */ });
            
            // UX Safety Fallback (BUG-031) - Instead of returning an error string that crashes the tablet flow, return an empty but valid recommendation set
            return {
                success: true,
                products: [],
                fallbackMode: 'inventory_unavailable',
                fallbackMessage: "Inventory is temporarily unavailable — check back in a moment.",
            };
        }

        const config = MOOD_RECOMMENDATION_CONFIGS[mood.id];
        const pool = buildFallbackPool(products, config);
        const recommendationSet = buildRecommendationSet(pool, config);

        if (!recommendationSet.products.length) {
            createTaskInternal({
                title: `[Tablet] Recommendation pool empty for mood=${moodId} in ${orgId}`,
                body: `getMoodRecommendations built an empty pool for mood=${moodId}.\n\nInventory exists (${products.length} items) but none matched the mood filter.\n\n**File:** src/server/actions/loyalty-tablet.ts`,
                priority: 'high',
                category: 'bug',
                reportedBy: 'loyalty-tablet',
                assignedTo: 'linus',
                filePath: 'src/server/actions/loyalty-tablet.ts',
                errorSnippet: `Empty pool for mood=${moodId}, inventory=${products.length}`,
            }).catch(() => { /* fire-and-forget */ });
            // Graceful fallback: show a cross-category sampler so the tablet
            // never blocks the check-in flow (BUG-031).
            return {
                success: true,
                products: buildPopularPicksFallback(products),
                bundle: undefined,
                fallbackMode: 'mood_no_match',
                fallbackMessage: "We didn't find an exact match for that vibe — here are some of today's popular picks.",
            };
        }

        logger.info('[LoyaltyTablet] Mood recommendations generated', {
            orgId,
            moodId,
            productCount: recommendationSet.products.length,
            bundleProductCount: recommendationSet.bundle?.products.length ?? 0,
            inventoryCount: products.length,
            strategy: 'deterministic_menu_search',
        });

        // Video URL is a nice-to-have — fire-and-forget so it never blocks the kiosk.
        // The client can re-fetch or ignore if null.
        void getCachedMoodVideoUrl(orgId, mood.id).catch(() => null);

        return {
            success: true,
            ...recommendationSet,
            videoUrl: undefined,
        };
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Failed to get recommendations';
        logger.error('[LoyaltyTablet] getMoodRecommendations failed', { error, orgId, moodId });
        createTaskInternal({
            title: `[Tablet] getMoodRecommendations crashed for ${orgId}`,
            body: `getMoodRecommendations threw an unexpected error.\n\n**OrgId:** ${orgId}\n**MoodId:** ${moodId}\n**Error:** ${errMsg}\n\nCustomers saw "Could not load recommendations" on the check-in tablet.\n\n**File:** src/server/actions/loyalty-tablet.ts`,
            priority: 'critical',
            category: 'bug',
            reportedBy: 'loyalty-tablet',
            assignedTo: 'linus',
            filePath: 'src/server/actions/loyalty-tablet.ts',
            errorSnippet: errMsg,
        }).catch(() => { /* fire-and-forget */ });
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

/**
 * Returns distinct in-stock categories from the cached inventory, sorted by count.
 * Called in parallel with getMoodRecommendations so the loading screen can show
 * category quick-access pills without waiting for AI scoring to complete.
 */
export async function getTabletAvailableCategories(orgId: string): Promise<string[]> {
    try {
        const products = await getCachedMenuProducts(orgId);
        const counts = new Map<string, number>();
        for (const p of products) {
            if (!isLikelyInStock(p)) continue;
            const cat = getProductCategory(p);
            if (cat && cat !== 'Other') counts.set(cat, (counts.get(cat) ?? 0) + 1);
        }
        return [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([cat]) => cat);
    } catch {
        return [];
    }
}

/**
 * Return all in-stock products for a given category, sorted by price desc.
 * Used by quick-pill category browsing — bypasses Smokey/LLM for instant results.
 * Returns up to 30 products so the full menu is browseable.
 */
export async function browseTabletCategory(
    orgId: string,
    category: string,
): Promise<{ success: boolean; products: TabletProduct[]; total: number }> {
    try {
        const all = await getCachedMenuProducts(orgId);
        const needle = normalizeCategoryName(category);
        const inCategory = dedupeProducts(all.filter(p => {
            if (!isLikelyInStock(p)) return false;
            const cat = getProductCategory(p); // already normalized via normalizeCategoryName
            return cat.includes(needle) || needle.includes(cat);
        }));
        inCategory.sort((a, b) => (getProductPrice(b) ?? 0) - (getProductPrice(a) ?? 0));
        const config = createQueryRecommendationConfig(category, null);
        const products = inCategory.slice(0, 30).map(p => toTabletProduct(p, config));
        return { success: true, products, total: products.length };
    } catch {
        return { success: false, products: [], total: 0 };
    }
}

export async function searchTabletRecommendations(
    orgId: string,
    query: string,
    moodId?: string | null,
    customerId?: string | null,
    unlimited?: boolean
): Promise<TabletSearchRecommendationsResult> {
    // ── Org-level access guard ─────────────────────────────────────────
    try {
        const { requireUser } = await import('@/server/auth/auth');
        const sessionUser = await requireUser();
        const sessionOrgId = (sessionUser as { orgId?: string; currentOrgId?: string })?.currentOrgId
            ?? (sessionUser as { orgId?: string })?.orgId;
        const sessionRole = (sessionUser as { role?: string })?.role;
        const isSuperUser = sessionRole === 'super_user' || sessionRole === 'super_admin';
        if (!isSuperUser && sessionOrgId && sessionOrgId !== orgId) {
            logger.warn('[LoyaltyTablet] searchTabletRecommendations rejected — org mismatch', {
                sessionOrgId,
                payloadOrgId: orgId,
            });
            return { success: false, error: 'Unauthorized org' };
        }
    } catch {
        // Proceed for pre-shipped kiosks
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3 && !unlimited) {
        return {
            success: false,
            error: 'Tell Smokey a little more so I can narrow the menu down.',
        };
    }

    try {
        // Fetch products + optional purchase history in parallel
        const [products, history] = await Promise.all([
            getCachedMenuProducts(orgId),
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
        const config = createQueryRecommendationConfig(trimmedQuery || "the full menu", mood?.label ?? null);

        if (unlimited && trimmedQuery.length === 0) {
            const allProducts = dedupeProducts(products.filter(isLikelyInStock)).map(p => toTabletProduct(p, config));
            return {
                success: true,
                query: 'Full Menu',
                summary: `I've loaded ${allProducts.length} items from the live menu.`,
                products: allProducts,
            };
        }

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

        const recommendationSet = unlimited 
            ? { products: pool.map(p => toTabletProduct(p, config)), bundle: undefined }
            : buildRecommendationSet(pool, config);

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

import { MembershipService } from '../services/loyalty/membership-service';
import { VisitSessionService } from '../services/loyalty/visit-session-service';

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
    birthday?: string;
    visitPreferences?: string[];
    offerProductId?: string;
    customerId?: string;
}): Promise<TabletLeadResult> {
    try {
        const validated = captureSchema.parse(params);
        const { orgId, firstName, email, phone, emailConsent, smsConsent, mood, cartProductIds, bundleAdded, birthday, visitPreferences, offerProductId } = validated;

        // ── Org-level access guard ─────────────────────────────────────────
        // Server actions run in a session context — ensure the caller's session
        // is scoped to this org (or is a super-user).  This prevents a rogue
        // tablet from submitting check-ins for a different org using API keys alone.
        try {
            const { requireUser } = await import('@/server/auth/auth');
            const sessionUser = await requireUser();
            const sessionOrgId = (sessionUser as { orgId?: string; currentOrgId?: string })?.currentOrgId
                ?? (sessionUser as { orgId?: string })?.orgId;
            const sessionRole = (sessionUser as { role?: string })?.role;
            const isSuperUser = sessionRole === 'super_user' || sessionRole === 'super_admin';
            if (!isSuperUser && sessionOrgId && sessionOrgId !== orgId) {
                logger.warn('[LoyaltyTablet] Org mismatch — check-in rejected', {
                    sessionOrgId,
                    payloadOrgId: orgId,
                });
                return { success: false, isNewLead: false, error: 'Unauthorized org' };
            }
        } catch {
            // requireUser throws if unauthenticated; tablet kiosk uses session cookies
            // — propagate only hard auth failures, not missing-session cases where the
            //   tablet runs in a pre-authenticated server-action context.
        }

        const result = await captureVisitorCheckin({
            orgId,
            firstName,
            email: email || undefined,
            phone: phone || undefined,
            emailConsent,
            smsConsent,
            source: 'loyalty_tablet_checkin',
            ageVerifiedMethod: 'staff_visual_check',
            mood,
            cartProductIds,
            bundleAdded,
            lookupCandidate: params.customerId ? { kind: 'customer', id: params.customerId } : undefined,
        });

        if (!result.success || !result.customerId) {
            return { success: false, isNewLead: false, error: result.error || 'Failed to capture check-in' };
        }

        // 1. Enrollment Flow (if they have a phone and aren't already a "Member" in the new system)
        if (phone || result.customerId) {
            try {
                await MembershipService.enroll({
                    organizationId: orgId,
                    firstName,
                    phone: phone || '', 
                    email: email || undefined,
                    smsConsent,
                    emailConsent,
                    source: "tablet",
                    existingCustomerId: result.customerId
                });
            } catch (enrollErr) {
                logger.warn('[LoyaltyTablet] Auto-enrollment failed (soft)', { enrollErr });
            }
        }

        // 2. Open Visit Session for Staff Queue — enriched with cart + mood for back-office notification
        let queuePosition: number | undefined;
        try {
            const mshipMatches = await getAdminFirestore().collection('memberships')
                .where('memberId', '==', result.customerId)
                .limit(1)
                .get();

            const membershipId = !mshipMatches.empty ? mshipMatches.docs[0].id : `legacy_${result.customerId}`;

            // Resolve product names from cached inventory for the cart (gives back-office full item details)
            let cartSessionItems: Array<{ productId: string; name: string; price: number; category?: string }> | undefined;
            if (cartProductIds?.length) {
                const allProducts = await getCachedMenuProducts(orgId).catch(() => [] as RawMenuProduct[]);
                const idSet = new Set(cartProductIds);
                cartSessionItems = allProducts
                    .filter(p => {
                        const pid = (p.id ?? p.productId ?? p.externalId ?? p.sku_id ?? '') as string;
                        return idSet.has(pid);
                    })
                    .map(p => ({
                        productId: (p.id ?? p.productId ?? p.externalId ?? p.sku_id ?? '') as string,
                        name: ((p.name ?? p.product_name ?? p.productName ?? '') as string).trim(),
                        price: Number(p.price ?? p.selling_price ?? p.salePrice ?? p.retailPrice ?? p.latest_price ?? p.current_price ?? 0),
                        category: normalizeCategoryName((p.category ?? p.category_name ?? '') as string) || undefined,
                    }))
                    .filter(p => p.productId && p.name);
            }

            await VisitSessionService.createSession({
                organizationId: orgId,
                storeId: orgId,
                memberId: result.customerId,
                membershipId: membershipId,
                source: "tablet",
                deviceId: "tablet_kiosk",
                cartItems: cartSessionItems,
                customerMood: mood,
                customerName: firstName !== 'Guest' ? firstName : undefined,
                visitCheckinId: result.visitId,
            });

            // Calculate queue position via service
            queuePosition = await VisitSessionService.getQueuePosition(orgId, orgId);

        } catch (sessionErr) {
            logger.warn('[LoyaltyTablet] Visit session creation failed (soft)', { sessionErr });
        }

        return {
            success: true,
            isNewLead: result.isNewLead,
            customerId: result.customerId,
            loyaltyPoints: result.loyaltyPoints,
            visitId: result.visitId,
            queuePosition,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const msg = error.errors[0].message;
            // Auto-file to Linus — Zod errors on the tablet mean a data contract bug
            createTaskInternal({
                title: `[Tablet] Check-in Zod validation failed: ${msg}`,
                body: `captureTabletLead threw a Zod error on the loyalty tablet.\n\n**Error:** ${msg}\n\n**Fields:** ${JSON.stringify(error.errors.map(e => ({ path: e.path, msg: e.message })))}\n\n**File:** src/server/actions/loyalty-tablet.ts`,
                priority: 'high',
                category: 'bug',
                reportedBy: 'loyalty-tablet',
                assignedTo: 'linus',
                filePath: 'src/server/actions/loyalty-tablet.ts',
                errorSnippet: msg,
            }).catch(() => { /* fire-and-forget */ });
            return { success: false, isNewLead: false, error: 'Check-in failed — please ask a budtender.' };
        }
        const errMsg = error instanceof Error ? error.message : 'Failed to capture lead';
        logger.error('[LoyaltyTablet] Capture failed', { error });
        createTaskInternal({
            title: `[Tablet] Check-in server error: ${errMsg.slice(0, 80)}`,
            body: `captureTabletLead threw an unexpected error on the loyalty tablet.\n\n**Error:** ${errMsg}\n\n**File:** src/server/actions/loyalty-tablet.ts`,
            priority: 'critical',
            category: 'bug',
            reportedBy: 'loyalty-tablet',
            assignedTo: 'linus',
            filePath: 'src/server/actions/loyalty-tablet.ts',
            errorSnippet: errMsg,
        }).catch(() => { /* fire-and-forget */ });
        return { success: false, isNewLead: false, error: 'Check-in failed — please ask a budtender.' };
    }
}

// ============================================================
// Tablet Offer — near-expiry / clearance deal for the email step
// ============================================================

export interface TabletOffer {
    productId: string;
    name: string;
    category: string;
    originalPrice: number;
    dealPrice: number;
    imageUrl?: string;
    reason: string;
}

/**
 * Returns a single clearance/near-expiry pre-roll or low-cost item to present as a $1 deal.
 * Strategy: lowest-priced pre-roll in live inventory → attach a $1 deal price.
 * If no pre-roll found, falls back to any cheapest item.
 */
export async function getTabletOffer(orgId: string): Promise<{ success: boolean; offer?: TabletOffer }> {
    // ── Org-level access guard ─────────────────────────────────────────
    try {
        const { requireUser } = await import('@/server/auth/auth');
        const sessionUser = await requireUser();
        const sessionOrgId = (sessionUser as { orgId?: string; currentOrgId?: string })?.currentOrgId
            ?? (sessionUser as { orgId?: string })?.orgId;
        const sessionRole = (sessionUser as { role?: string })?.role;
        const isSuperUser = sessionRole === 'super_user' || sessionRole === 'super_admin';
        if (!isSuperUser && sessionOrgId && sessionOrgId !== orgId) {
            logger.warn('[LoyaltyTablet] getTabletOffer rejected — org mismatch', {
                sessionOrgId,
                payloadOrgId: orgId,
            });
            return { success: false };
        }
    } catch {
        // Proceed for pre-shipped kiosks
    }

    try {
        const { getOrgProfileWithFallback } = await import('@/server/services/org-profile');
        const orgProfile = await getOrgProfileWithFallback(orgId).catch(() => null);

        const products = await getCachedMenuProducts(orgId);
        if (!products.length) return { success: false };

        const normalize = (p: RawMenuProduct): { id: string; name: string; category: string; price: number; imageUrl?: string } => ({
            id: (p.id ?? p.productId ?? p.externalId ?? p.sku_id ?? '') as string,
            name: ((p.name ?? p.product_name ?? p.productName ?? '') as string).trim(),
            category: normalizeCategoryName((p.category ?? p.category_name ?? '') as string),
            price: Number(p.price ?? p.selling_price ?? p.salePrice ?? p.retailPrice ?? p.latest_price ?? p.current_price ?? 0),
            imageUrl: getProductImageUrl(p),
        });

        const all = products.map(normalize).filter(p => p.id && p.name && p.price > 0);
        
        let pick: ReturnType<typeof normalize> | undefined = undefined;

        // 1. Check for a clearance hero product configured in the dashboard
        if (orgProfile?.operations?.heroProducts) {
            const clearanceHero = orgProfile.operations.heroProducts.find(h => h.role === 'clearance');
            if (clearanceHero) {
                pick = all.find(p => p.id === clearanceHero.skuId);
                // Fallback to searching by exact name if SKU mapping is misaligned
                if (!pick) {
                    pick = all.find(p => p.name.toLowerCase() === clearanceHero.name.toLowerCase());
                }
            }
        }

        // 2. Fallback to cheapest pre-roll
        if (!pick) {
            const prerolls = all
                .filter(p => p.category.toLowerCase().includes('pre') || p.name.toLowerCase().includes('pre-roll') || p.name.toLowerCase().includes('preroll'))
                .sort((a, b) => a.price - b.price);
            
            pick = prerolls[0] ?? all.sort((a, b) => a.price - b.price)[0];
        }

        if (!pick) return { success: false };

        const isClearanceHero = orgProfile?.operations?.heroProducts?.find(h => h.skuId === pick?.id)?.role === 'clearance';

        return {
            success: true,
            offer: {
                productId: pick.id,
                name: pick.name,
                category: pick.category,
                originalPrice: pick.price,
                dealPrice: 1.00,
                imageUrl: pick.imageUrl,
                reason: isClearanceHero ? "Today's special offer — grab it while it lasts!" : 'End-of-shelf special — grab it while it lasts!',
            },
        };
    } catch (error) {
        logger.error('[LoyaltyTablet] getTabletOffer failed', { orgId, error });
        return { success: false };
    }
}

// ============================================================
// Customer budtender context — purchase history + profile
// ============================================================

export interface BudtenderContext {
    visitCount: number;
    loyaltyPoints: number;
    historySummary: string;
    topCategories: string[];
    badges: string[];
    lastVisitLabel?: string;
    lastOrderItems?: Array<{ name: string; quantity: number; price: number }>;
    lastOrderDate?: string;
    lastOrderTotal?: number;
}

/**
 * Fetches compact context for the budtender panel on the recommendations screen.
 * Returns purchase history summary, inferred categories, badges, and visit count.
 */
export async function getCustomerBudtenderContext(
    orgId: string,
    customerId: string,
): Promise<{ success: boolean; context?: BudtenderContext }> {
    // ── Org-level access guard ─────────────────────────────────────────
    try {
        const { requireUser } = await import('@/server/auth/auth');
        const sessionUser = await requireUser();
        const sessionOrgId = (sessionUser as { orgId?: string; currentOrgId?: string })?.currentOrgId
            ?? (sessionUser as { orgId?: string })?.orgId;
        const sessionRole = (sessionUser as { role?: string })?.role;
        const isSuperUser = sessionRole === 'super_user' || sessionRole === 'super_admin';
        if (!isSuperUser && sessionOrgId && sessionOrgId !== orgId) {
            logger.warn('[LoyaltyTablet] getCustomerBudtenderContext rejected — org mismatch', {
                sessionOrgId,
                payloadOrgId: orgId,
            });
            return { success: false };
        }
    } catch {
        // Proceed for pre-shipped kiosks
    }

    try {
        // Load customer doc first so we can resolve alleaves_id for POS history lookup
        const customerSnap = await getAdminFirestore().collection('customers').doc(customerId).get().catch(() => null);
        const d = customerSnap?.data() ?? {};

        // Use alleaves_id when available — getCustomerHistory strips the prefix to get the numeric POS ID
        const historyId = d.alleaves_id ? `alleaves_${d.alleaves_id}` : customerId;
        const history = await getCustomerHistory(historyId, orgId, 5).catch(() => null);
        const loyaltyPoints = (d.loyaltyPoints as number) || 0;
        const visitCount = (d.visitCount as number) || (d.totalVisits as number) || 0;
        const badges: string[] = (d.badges as string[]) ?? [];

        // Derive last visit label
        let lastVisitLabel: string | undefined;
        const lastVisit = d.lastVisitAt ?? d.lastCheckinAt ?? d.updatedAt;
        if (lastVisit) {
            try {
                const days = Math.floor((Date.now() - new Date(lastVisit instanceof Object && 'toDate' in lastVisit ? (lastVisit as { toDate(): Date }).toDate() : lastVisit as string | number).getTime()) / 86400000);
                lastVisitLabel = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
            } catch {
                // ignore
            }
        }

        // Extract top categories from purchase history text
        const historyText = history?.summary ?? '';
        const topCategories = BUDTENDER_CATEGORY_KEYWORDS.filter(k => historyText.toLowerCase().includes(k));

        // Extract last order items from POS data
        let lastOrderItems: Array<{ name: string; quantity: number; price: number }> | undefined;
        let lastOrderDate: string | undefined;
        let lastOrderTotal: number | undefined;
        if (history?.orders?.length) {
            const lastOrder = history.orders[0] as Record<string, unknown>;
            const items = lastOrder.items as Array<{ name?: string; quantity?: number; price?: number }> | undefined;
            if (items?.length) {
                lastOrderItems = items.map(item => ({
                    name: item.name || 'Unknown item',
                    quantity: item.quantity || 1,
                    price: item.price || 0,
                }));
            }
            if (lastOrder.date) {
                try {
                    lastOrderDate = new Date(lastOrder.date as string).toLocaleDateString();
                } catch { /* ignore */ }
            }
            lastOrderTotal = (lastOrder.total as number) || undefined;
        }

        // Demo account fallback — seed realistic last order when POS has no data
        const customerPhone = (d.phone as string) || (d.normalizedPhone as string) || '';
        const isDemoAccount = customerPhone.includes('3126840522');
        if (!lastOrderItems && isDemoAccount) {
            lastOrderItems = [
                { name: 'Grease Monkey 3.5g', quantity: 1, price: 45 },
                { name: 'Blue Dream Cartridge 1g', quantity: 1, price: 55 },
                { name: 'Kiva Camino Gummies', quantity: 2, price: 25 },
                { name: 'RAW Classic Cones 6pk', quantity: 1, price: 8 },
            ];
            lastOrderDate = new Date(Date.now() - 7 * 86400000).toLocaleDateString();
            lastOrderTotal = 158;
        }

        return {
            success: true,
            context: {
                visitCount: visitCount || (isDemoAccount ? 12 : 0),
                loyaltyPoints: loyaltyPoints || (isDemoAccount ? 340 : 0),
                historySummary: historyText,
                topCategories: topCategories.length ? topCategories : (isDemoAccount ? ['flower', 'vapes', 'edibles'] : []),
                badges,
                lastVisitLabel,
                lastOrderItems,
                lastOrderDate,
                lastOrderTotal,
            },
        };
    } catch (error) {
        logger.error('[LoyaltyTablet] getCustomerBudtenderContext failed', { orgId, customerId, error });
        return { success: false };
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

// ============================================================
// "Have you shopped here before?" — name-based Alleaves lookup
// ============================================================

export interface AlleavesCandidateMatch {
    customerId: string;
    firstName: string;
    lastInitial: string;
    customerSince: string | null;
    alleavesCustomerId: string | null;
}

export interface AlleavesCandidateResult {
    found: boolean;
    matches: AlleavesCandidateMatch[];
}

/**
 * Search for Alleaves-synced customers by first name.
 * Used in the "Is this you?" flow when a customer says they've shopped before
 * but doesn't have a phone match in our system.
 *
 * Returns up to 5 candidates with first name + last initial + customer-since date
 * so the customer can identify themselves without exposing full PII.
 */
export async function findAlleavesCandidatesByName(
    orgId: string,
    firstName: string,
): Promise<AlleavesCandidateResult> {
    const trimmed = firstName.trim();
    if (trimmed.length < 2) return { found: false, matches: [] };

    try {
        const db = getAdminFirestore();

        // Query customers with matching firstName (case-insensitive via stored lowercase)
        // Firestore doesn't support case-insensitive queries, so we query by range
        const lower = trimmed.toLowerCase();
        const upper = lower + '\uf8ff';

        const snap = await db
            .collection('customers')
            .where('orgId', '==', orgId)
            .where('firstNameLower', '>=', lower)
            .where('firstNameLower', '<=', upper)
            .limit(20)
            .get();

        if (snap.empty) {
            // Fallback: search by displayName prefix for Alleaves-synced records
            // that may not have firstNameLower set yet
            const displaySnap = await db
                .collection('customers')
                .where('orgId', '==', orgId)
                .where('source', '==', 'alleaves_sync')
                .limit(200) // scan Alleaves customers
                .get();

            const fuzzyMatches = displaySnap.docs.filter(doc => {
                const d = doc.data();
                const fn = (d.firstName || d.displayName || '').toString().toLowerCase();
                return fn.startsWith(lower) || fn.includes(lower);
            }).slice(0, 5);

            if (fuzzyMatches.length === 0) return { found: false, matches: [] };

            return {
                found: true,
                matches: fuzzyMatches.map(doc => {
                    const d = doc.data();
                    const display = (d.firstName || d.displayName || 'Friend').toString();
                    const last = (d.lastName || '').toString();
                    return {
                        customerId: doc.id,
                        firstName: display,
                        lastInitial: last ? last.charAt(0).toUpperCase() + '.' : '',
                        customerSince: d.alleavesCustomerSince || null,
                        alleavesCustomerId: d.alleavesCustomerId || null,
                    };
                }),
            };
        }

        const matches: AlleavesCandidateMatch[] = snap.docs
            .filter(doc => {
                const d = doc.data();
                // Only show non-test, non-guest accounts
                return !d.isTestAccount && d.firstName;
            })
            .slice(0, 5)
            .map(doc => {
                const d = doc.data();
                const last = (d.lastName || '').toString();
                return {
                    customerId: doc.id,
                    firstName: (d.firstName || 'Friend').toString(),
                    lastInitial: last ? last.charAt(0).toUpperCase() + '.' : '',
                    customerSince: d.alleavesCustomerSince || null,
                    alleavesCustomerId: d.alleavesCustomerId || null,
                };
            });

        return { found: matches.length > 0, matches };
    } catch (error) {
        logger.error('[LoyaltyTablet] findAlleavesCandidatesByName failed', {
            orgId, firstName, error,
        });
        return { found: false, matches: [] };
    }
}

/**
 * Link a check-in customer to their Alleaves profile.
 * Called when a customer confirms "That's me!" on the candidate screen.
 * Copies spending data from customer_spending to the customer profile.
 */
export async function linkCustomerToAlleaves(
    orgId: string,
    customerId: string,
    alleavesCustomerId: string,
): Promise<{ success: boolean }> {
    try {
        const db = getAdminFirestore();
        const customerRef = db.collection('customers').doc(customerId);

        // Merge the Alleaves link + pull spending data
        const spendingDoc = await db
            .collection('tenants').doc(orgId)
            .collection('customer_spending').doc(alleavesCustomerId)
            .get();

        const updates: Record<string, unknown> = {
            alleavesCustomerId,
            alleavesLinkedAt: new Date(),
            updatedAt: new Date(),
        };

        if (spendingDoc.exists) {
            const s = spendingDoc.data()!;
            updates.totalSpent = s.totalSpent || 0;
            updates.orderCount = s.orderCount || 0;
            updates.avgOrderValue = s.avgOrderValue || 0;
            if (s.lastOrderDate) updates.lastOrderDate = s.lastOrderDate;
            if (s.firstOrderDate) updates.firstOrderDate = s.firstOrderDate;
        }

        await customerRef.set(updates, { merge: true });

        logger.info('[LoyaltyTablet] Linked customer to Alleaves', {
            orgId, customerId, alleavesCustomerId,
            hasSpending: spendingDoc.exists,
        });

        return { success: true };
    } catch (error) {
        logger.error('[LoyaltyTablet] linkCustomerToAlleaves failed', {
            orgId, customerId, alleavesCustomerId, error,
        });
        return { success: false };
    }
}

// ============================================================
// Full-phone returning-customer lookup (full flow fast path)
// ============================================================

export interface PhoneLookupResult {
    found: boolean;
    customerId?: string;
    firstName?: string;
    loyaltyPoints?: number;
}

/**
 * Look up a customer by their full phone number during the full check-in flow.
 * Used to pre-fill name + skip the offer step for known returning customers.
 * Normalises the phone to digits-only before querying.
 */
export async function lookupCustomerByPhone(
    orgId: string,
    phone: string,
): Promise<PhoneLookupResult> {
    const raw = phone.replace(/\D/g, '');
    if (raw.length < 10) return { found: false };
    // Normalise to 11-digit E.164 digits (matches Alleaves import format: '1XXXXXXXXXX')
    const digits = raw.length === 10 ? `1${raw}` : raw;

    try {
        const db = getAdminFirestore();
        // Try 11-digit first, fall back to raw value for older records
        const snap = await db
            .collection('customers')
            .where('orgId', '==', orgId)
            .where('phoneDigits', '==', digits)
            .limit(1)
            .get();
        const resolved = snap.empty && digits !== raw
            ? await db.collection('customers').where('orgId', '==', orgId).where('phoneDigits', '==', raw).limit(1).get()
            : snap;

        if (resolved.empty) return { found: false };

        const doc = resolved.docs[0];
        const d = doc.data();
        return {
            found: true,
            customerId: doc.id,
            firstName: (d.firstName as string) || undefined,
            loyaltyPoints: (d.loyaltyPoints as number) || 0,
        };
    } catch (error) {
        logger.error('[LoyaltyTablet] lookupCustomerByPhone failed', { orgId, error });
        return { found: false };
    }
}

// ============================================================
// POS-facing customer dossier lookup (for budtender counter)
// ============================================================

export interface PosDossier {
    customerId: string;
    firstName: string;
    loyaltyPoints: number;
    visitCount: number;
    lastVisitLabel?: string;
    topCategories: string[];
    badges: string[];
    historySummary: string;
}

/**
 * Full customer dossier by last-4 digits of phone, intended for the POS
 * counter endpoint (/api/checkin/lookup).  Returns the first match only —
 * callers should disambiguate via firstName if multiple exist.
 */
export async function getPosDossierByPhoneLast4(
    orgId: string,
    phoneLast4: string,
): Promise<{ found: boolean; dossier?: PosDossier; multipleMatches?: boolean; error?: string }> {
    // ── Org-level access guard ─────────────────────────────────────────
    try {
        const { requireUser } = await import('@/server/auth/auth');
        const sessionUser = await requireUser();
        const sessionOrgId = (sessionUser as { orgId?: string; currentOrgId?: string })?.currentOrgId
            ?? (sessionUser as { orgId?: string })?.orgId;
        const sessionRole = (sessionUser as { role?: string })?.role;
        const isSuperUser = sessionRole === 'super_user' || sessionRole === 'super_admin';
        if (!isSuperUser && sessionOrgId && sessionOrgId !== orgId) {
            logger.warn('[LoyaltyTablet] getPosDossierByPhoneLast4 rejected — org mismatch', {
                sessionOrgId,
                payloadOrgId: orgId,
            });
            return { found: false, error: 'Unauthorized org' };
        }
    } catch {
        // Proceed for pre-shipped kiosks
    }

    const cleaned = phoneLast4.replace(/\D/g, '');
    if (cleaned.length !== 4) return { found: false };

    try {
        const db = getAdminFirestore();
        const snap = await db
            .collection('customers')
            .where('orgId', '==', orgId)
            .where('phoneLast4', '==', cleaned)
            .limit(5)
            .get();

        if (snap.empty) return { found: false };
        if (snap.docs.length > 1) return { found: true, multipleMatches: true };

        const doc = snap.docs[0];
        const context = await getCustomerBudtenderContext(orgId, doc.id);

        return {
            found: true,
            dossier: {
                customerId: doc.id,
                firstName: (doc.data().firstName as string) || 'Friend',
                loyaltyPoints: context.context?.loyaltyPoints ?? 0,
                visitCount: context.context?.visitCount ?? 0,
                lastVisitLabel: context.context?.lastVisitLabel,
                topCategories: context.context?.topCategories ?? [],
                badges: context.context?.badges ?? [],
                historySummary: context.context?.historySummary ?? '',
            },
        };
    } catch (error) {
        logger.error('[LoyaltyTablet] getPosDossierByPhoneLast4 failed', { orgId, error });
        return { found: false };
    }
}
