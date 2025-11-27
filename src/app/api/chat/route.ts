// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { analyzeQuery, generateChatResponse } from '@/ai/chat-query-handler';
import type { CannMenusProduct, ChatbotProduct } from '@/types/cannmenus';
import { getConversationContext, addMessageToSession, createChatSession } from '@/lib/chat/session-manager';

/**
 * POST /api/chat
 * Body: { query: string, userId?: string, sessionId?: string, brandId?: string, state?: string }
 * Returns a conversational message and optional product suggestions.
 */
export async function POST(req: NextRequest) {
    try {
        const { query, userId, sessionId, brandId = '10982', state = 'Illinois' } = await req.json();
        if (!query) {
            return NextResponse.json({ ok: false, error: 'Missing query' }, { status: 400 });
        }

        // 1️⃣ Get conversation context if session exists
        let conversationContext: any[] = [];
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

        // 3️⃣ Build the CannMenus product search URL using the extracted filters
        const base = process.env.CANNMENUS_API_BASE;
        const apiKey = process.env.CANNMENUS_API_KEY;
        const fortyTonsBrandId = process.env.CANNMENUS_40TONS_BRAND_ID;
        const baysideRetailerId = process.env.NEXT_PUBLIC_BAYSIDE_RETAILER_ID;

        if (!base || !apiKey || !fortyTonsBrandId || !baysideRetailerId) {
            return NextResponse.json({ ok: false, error: 'CannMenus environment not configured' }, { status: 500 });
        }

        const url = new URL('/api/cannmenus/product-search', process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000');
        // Forward the refined search query
        url.searchParams.set('search', analysis.searchQuery);
        // Apply optional filters
        if (analysis.filters.category) url.searchParams.set('category', analysis.filters.category);
        if (analysis.filters.priceMin) url.searchParams.set('price_min', analysis.filters.priceMin.toString());
        if (analysis.filters.priceMax) url.searchParams.set('price_max', analysis.filters.priceMax.toString());
        // Retailer and brand defaults for demo
        url.searchParams.set('retailers', baysideRetailerId);
        url.searchParams.set('brands', fortyTonsBrandId);

        // 4️⃣ Fetch products from CannMenus
        const productResp = await fetch(url.toString(), {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'BakedBot/1.0',
                'X-Token': apiKey.trim().replace(/^['\"]|['\"]$/g, ''),
            },
        });
        const productData = await productResp.json();
        const rawProducts: CannMenusProduct[] = productData?.data?.products || productData?.data || [];

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
        console.error('Chat API error', err);
        return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
    }
}
