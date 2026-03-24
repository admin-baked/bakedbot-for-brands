import { runAgentCore } from '@/server/agents/agent-runner';
import type { ChatbotProduct } from '@/types/cannmenus';
import { logger } from '@/lib/logger';
import { getSafeProductImageUrl, normalizeCategoryName } from '@/lib/utils/product-image';

/**
 * Fetch live menu products for a brand context.
 *
 * Routing:
 *  - Numeric brandId (e.g. "7923") → CannMenus retailer ID (embed on CannMenus-hosted pages)
 *  - Org-style brandId (e.g. "org_thrive_syracuse") → Firestore (Alleaves-synced or manual upload)
 *
 * CannMenus is NOT used for Thrive/Ecstatic — they use Alleaves POS data always.
 */
export async function fetchMenuProducts(brandId: string): Promise<any[]> {
    if (!brandId || brandId === '10982') return []; // default placeholder — no real org

    // CannMenus embed: numeric retailer ID
    if (/^\d+$/.test(brandId)) {
        try {
            const { CannMenusService } = await import('@/server/services/cannmenus');
            const cms = new CannMenusService();
            const result = await cms.searchProducts({ retailers: brandId, limit: 50 });
            return result.products || [];
        } catch (e) {
            logger.warn('[ConsumerAdapter] CannMenus fetch failed', {
                brandId,
                error: e instanceof Error ? e.message : String(e),
            });
            return [];
        }
    }

    // Internal org: Firestore (Alleaves POS sync for Thrive, manual upload for Ecstatic, etc.)
    try {
        const { createServerClient } = await import('@/firebase/server-client');
        const { firestore } = await createServerClient();
        const { makeProductRepo } = await import('@/server/repos/productRepo');
        const productRepo = makeProductRepo(firestore);

        let products = await productRepo.getAllByLocation(brandId).catch(() => [] as any[]);
        if (!products.length) {
            products = await productRepo.getAllByBrand(brandId).catch(() => [] as any[]);
        }
        return products;
    } catch (e) {
        logger.warn('[ConsumerAdapter] Firestore product fetch failed', {
            brandId,
            error: e instanceof Error ? e.message : String(e),
        });
        return [];
    }
}

/**
 * Adapter to bridge the Consumer Chat API (/api/chat) with the central Agent Runner.
 * 
 * Responsibilities:
 * 1. Invokes the agent runner with the 'smokey' persona (or others).
 * 2. Translates Agent Runner output (text + tool calls) into the Client Response format.
 *    - Extracts 'products' from 'searchMenu' and 'rankProductsForSegment' tool results.
 *    - Detects 'triggerCheckout' tool calls and sets clientAction.
 * 3. Handles guest/anonymous users gracefully.
 * 4. Triggers gamification updates (streaks).
 */
export async function runConsumerAgent(
    query: string,
    context: {
        userId?: string;
        sessionId?: string;
        brandId: string;
        state: string; // User's location state
        products?: any[]; // Products currently in view (from frontend context)
        conversationHistory?: Array<{ role: string; content: string }>; // Prior turns for multi-turn memory
        pendingProductId?: string; // Product currently being discussed — used to resolve triggerCheckout
    }
) {
    const { sessionId, brandId, products: contextProducts, conversationHistory, pendingProductId } = context;
    const jobId = `chat-${sessionId || Date.now()}`;

    const normalizeToolProduct = (product: any): ChatbotProduct => ({
        id: String(product.id || product.cann_sku_id || product.sku_id || product.externalId || product.name),
        name: product.name || product.product_name || 'Unknown Product',
        category: normalizeCategoryName(product.category),
        price: Number(product.price ?? product.latest_price ?? 0),
        imageUrl: getSafeProductImageUrl(product.imageUrl || product.image_url || product.primary_image),
        thcPercent: product.thcPercent ?? product.thc ?? product.percentage_thc ?? null,
        cbdPercent: product.cbdPercent ?? product.cbd ?? product.percentage_cbd ?? null,
        description: product.description || product.name || product.product_name,
        url: product.url || '',
        reasoning: product.reasoning,
    });

    const findContextProduct = (productId: string) => {
        if (!contextProducts) return null;

        return contextProducts.find((product: any) => {
            const ids = [
                product.id,
                product.cann_sku_id,
                product.sku_id,
                product.externalId,
            ]
                .filter(Boolean)
                .map(String);

            return ids.includes(String(productId));
        }) || null;
    };

    // 1. Trigger streak update (gamification) - background fire-and-forget
    import('@/app/actions/gamification').then(({ updateStreakAction }) => {
        updateStreakAction().catch(e => logger.warn('[ConsumerAdapter] Streak update failed', {
            error: e instanceof Error ? e.message : String(e),
        }));
    });

    // 1b. Pre-fetch live menu products for this brand context.
    // defaultSmokeyTools.searchMenu calls requireUser() which returns null for anonymous users,
    // so products are never found. We pre-fetch here and inject them into the query context
    // so Claude has the full product list regardless of auth state.
    const menuProducts = await fetchMenuProducts(brandId);
    const allContextProducts = menuProducts.length > 0 ? menuProducts : (contextProducts || []);

    // Build product context prefix for the query
    const productListText = allContextProducts.length > 0
        ? `[MENU CONTEXT — ${allContextProducts.length} products on this menu]\n` +
          allContextProducts.slice(0, 25).map((p: any) =>
              `- ${p.name || p.product_name} | ${normalizeCategoryName(p.category)} | $${Number(p.price ?? p.latest_price ?? 0).toFixed(2)} | ID:${String(p.id || p.cann_sku_id || p.sku_id || p.name)}`
          ).join('\n') + '\n'
        : '';

    // If a product was being discussed, remind the agent so triggerCheckout can resolve it
    const pendingProductContext = pendingProductId
        ? `[PENDING CART] Customer was just shown product ID: "${pendingProductId}". ` +
          `If they confirm (yes/sure/add it/checkout/proceed), call triggerCheckout with productIds: ["${pendingProductId}"].\n`
        : '';

    const augmentedQuery = (productListText || pendingProductContext)
        ? `${productListText}${pendingProductContext}\nCustomer: ${query}`
        : query;

    // 2. Run Agent Runner
    // We force 'smokey' as the persona for consumer chat by default
    const agentResult = await runAgentCore(
        augmentedQuery,
        'smokey',
        {
            modelLevel: 'standard', // Use standard model for consumers
            source: 'consumer_chat',
            context: {
                products: allContextProducts, // Pass pre-fetched menu products as context
                conversationHistory,          // Pass prior turns for multi-turn memory
            }
        },
        null, // Injected user - we let runner resolve it or use anonymous context
        jobId
    );

    // 3. Synthesize Client Response
    let message = agentResult.content;
    let products: ChatbotProduct[] = [];
    let clientAction: any = undefined;

    // 4. Extract Products/Actions from Tool Calls
    if (agentResult.toolCalls && agentResult.toolCalls.length > 0) {
        for (const call of agentResult.toolCalls) {

            // A. Product Search Results (searchMenu)
            if (call.name === 'searchMenu' && call.status === 'success') {
                try {
                    let resultData: any;
                    try {
                        resultData = typeof call.result === 'string' ? JSON.parse(call.result) : call.result;
                    } catch (e) {
                        // Plain text result?
                        continue;
                    }

                    if (resultData && resultData.products && Array.isArray(resultData.products)) {
                        const toolsProducts = resultData.products
                            .slice(0, 5)
                            .map((p: any) => normalizeToolProduct(p));
                        products = toolsProducts;
                    }
                } catch (e) {
                    logger.warn('[ConsumerAdapter] Failed to parse searchMenu results', {
                        error: e instanceof Error ? e.message : String(e),
                    });
                }
            }

            // B. Ranked Product Results (rankProductsForSegment)
            if (call.name === 'rankProductsForSegment' && call.status === 'success') {
                try {
                    const resultData = typeof call.result === 'string' ? JSON.parse(call.result) : call.result;
                    if (Array.isArray(resultData) && resultData.length > 0) {
                        const rankedProducts = resultData
                            .map((productId: string) => findContextProduct(String(productId)))
                            .filter(Boolean)
                            .slice(0, 5)
                            .map((product: any) => ({
                                ...normalizeToolProduct(product),
                                reasoning: product.reasoning || 'Picked for your stated preferences.',
                            }));

                        if (rankedProducts.length > 0) {
                            products = rankedProducts;
                        }
                    }
                } catch (e) {
                    logger.warn('[ConsumerAdapter] Failed to parse rankProductsForSegment results', {
                        error: e instanceof Error ? e.message : String(e),
                    });
                }
            }

            // C. Checkout Trigger (triggerCheckout)
            if (call.name === 'triggerCheckout' && call.status === 'success') {
                try {
                    const resultData = typeof call.result === 'string' ? JSON.parse(call.result) : call.result;
                    const productIds: string[] = resultData.productIds || [];

                    // Merge pendingProductId into productIds if the agent didn't include it
                    // (handles "yes" confirmation where agent echoes the pending ID)
                    const resolveIds = pendingProductId && !productIds.includes(pendingProductId)
                        ? [...productIds, pendingProductId]
                        : productIds;

                    // Resolve products from this turn's search results first
                    let checkoutProducts = products.filter(p => resolveIds.includes(p.id));

                    // Fallback: check pre-fetched menu products and context products
                    if (checkoutProducts.length === 0) {
                        checkoutProducts = allContextProducts
                            .filter((p: any) => {
                                const ids = [p.id, p.cann_sku_id, p.sku_id].filter(Boolean).map(String);
                                return resolveIds.some(id => ids.includes(id));
                            })
                            .map((p: any) => normalizeToolProduct(p));
                    }

                    clientAction = {
                        type: 'checkout',
                        products: checkoutProducts
                    };

                    // Append a helpful message if the agent didn't already say "Opening cart"
                    if (!message.toLowerCase().includes('cart')) {
                        message += "\n\nI've opened your cart for you.";
                    }

                } catch (e) {
                    logger.warn('[ConsumerAdapter] Failed to process triggerCheckout', {
                        error: e instanceof Error ? e.message : String(e),
                    });
                }
            }
        }
    }

    return {
        message,
        products,
        clientAction
    };
}
