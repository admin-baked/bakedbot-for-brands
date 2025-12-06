import { NextRequest, NextResponse } from 'next/server';
import { analyzeQuery, generateChatResponse, type ConversationMessage } from '@/ai/chat-query-handler';
import type { CannMenusProduct, ChatbotProduct } from '@/types/cannmenus';
import { getConversationContext, addMessageToSession, createChatSession } from '@/lib/chat/session-manager';
import { CannMenusService, type SearchParams } from '@/server/services/cannmenus';
import { logger } from '@/lib/logger';
import { withProtection } from '@/server/middleware/with-protection';
import { chatRequestSchema, type ChatRequest } from '../schemas';

/**
 * POST /api/chat
 * Body: { query: string, userId?: string, sessionId?: string, brandId?: string, state?: string }
 * Returns a conversational message and optional product suggestions.
 */
export const POST = withProtection(
    async (req: NextRequest, data?: ChatRequest) => {
        try {
            // Data is already validated by middleware
            const { query, userId, sessionId, brandId = '10982', state = 'Illinois' } = data!;

            // 1️⃣ Get conversation context if session exists
            let conversationContext: ConversationMessage[] = [];
            let currentSessionId = sessionId;

            if (userId) {
                if (!currentSessionId) {
                    // Create new session
                    currentSessionId = await createChatSession(userId);
                } else {
                    // Get existing conversation context
                    conversationContext = await getConversationContext(userId, currentSessionId);
                }
            }

            // 2️⃣ Analyze the natural language query with context
            const analysis = await analyzeQuery(query, conversationContext);

            // 3️⃣ Use CannMenusService to fetch products directly
            const cannMenusService = new CannMenusService();
            const searchParams: SearchParams = {
                search: analysis.searchQuery,
                retailers: process.env.NEXT_PUBLIC_BAYSIDE_RETAILER_ID,
                brands: process.env.CANNMENUS_40TONS_BRAND_ID,
            };

            if (analysis.filters.category) searchParams.category = analysis.filters.category;
            if (analysis.filters.priceMin) searchParams.price_min = analysis.filters.priceMin;
            if (analysis.filters.priceMax) searchParams.price_max = analysis.filters.priceMax;

            const productData = await cannMenusService.searchProducts(searchParams);
            const rawProducts: CannMenusProduct[] = productData.products || [];

        // 4️⃣ Transform to ChatbotProduct shape (only a subset needed for UI)
        const chatProducts: ChatbotProduct[] = rawProducts.map((p) => ({
            id: p.cann_sku_id,
            name: p.product_name,
            category: p.category,
            price: p.latest_price,
            imageUrl: p.image_url,
            description: p.product_name, // placeholder – CannMenus does not return description here
            thcPercent: p.percentage_thc ?? null,
            cbdPercent: p.percentage_cbd ?? null,
            displayWeight: p.display_weight,
            url: p.url,
        }));

        // 5️⃣ Generate a friendly chat response using Gemini
        const chatResponse = await generateChatResponse(query, analysis.intent, chatProducts.length);

        // 6️⃣ Store messages in session if userId provided
        if (userId && currentSessionId) {
            await addMessageToSession(userId, currentSessionId, {
                role: 'user',
                content: query,
                productReferences: chatProducts.slice(0, 5).map(p => p.id),
            });

            await addMessageToSession(userId, currentSessionId, {
                role: 'assistant',
                content: chatResponse.message,
            });
        }

            return NextResponse.json({
                ok: true,
                message: chatResponse.message,
                products: chatResponse.shouldShowProducts ? chatProducts : [],
                sessionId: currentSessionId, // Return session ID for client
            });
        } catch (err) {
            logger.error('Chat API error', err instanceof Error ? err : new Error(String(err)));
            return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
        }
    },
    {
        schema: chatRequestSchema,
        csrf: true,
        appCheck: true
    }
);
