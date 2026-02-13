import { runAgentCore } from '@/server/agents/agent-runner';
import type { ChatbotProduct } from '@/types/cannmenus';
import { logger } from '@/lib/logger';

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
    }
) {
    const { userId, sessionId, brandId, products: contextProducts } = context;
    const jobId = `chat-${sessionId || Date.now()}`;

    // 1. Trigger streak update (gamification) - background fire-and-forget
    import('@/app/actions/gamification').then(({ updateStreakAction }) => {
        updateStreakAction().catch(e => logger.warn('[ConsumerAdapter] Streak update failed', {
            error: e instanceof Error ? e.message : String(e),
        }));
    });

    // 2. Run Agent Runner
    // We force 'smokey' as the persona for consumer chat by default
    const agentResult = await runAgentCore(
        query,
        'smokey',
        {
            modelLevel: 'standard', // Use standard model for consumers
            source: 'consumer_chat',
            context: {
                products: contextProducts // Pass current view context to agent
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
                        // Map to ChatbotProduct
                        const toolsProducts = resultData.products.slice(0, 5).map((p: any) => ({
                            id: p.id || p.cann_sku_id || `temp-${Math.random()}`, // Fallback ID
                            name: p.name,
                            category: p.category,
                            price: p.price,
                            imageUrl: p.image_url || '',
                            thcPercent: p.thc || p.thcPercent,
                            description: p.description || p.name,
                            url: p.url || ''
                        }));
                        products = toolsProducts;
                    }
                } catch (e) {
                    logger.warn('[ConsumerAdapter] Failed to parse searchMenu results', {
                        error: e instanceof Error ? e.message : String(e),
                    });
                }
            }

            // B. Checkout Trigger (triggerCheckout)
            if (call.name === 'triggerCheckout' && call.status === 'success') {
                try {
                    const resultData = typeof call.result === 'string' ? JSON.parse(call.result) : call.result;
                    const productIds = resultData.productIds || [];

                    // If we have products in the current context or extracted from search, use them
                    let checkoutProducts = products.filter(p => productIds.includes(p.id));

                    // If we didn't extract any new products this turn, maybe they were in context?
                    if (checkoutProducts.length === 0 && contextProducts) {
                        checkoutProducts = contextProducts.filter((p: any) => productIds.includes(p.id || p.cann_sku_id));
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
