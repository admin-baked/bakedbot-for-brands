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
                    // Get existing conversation context and convert Firestore Timestamps to Dates
                    const firestoreMessages = await getConversationContext(userId, currentSessionId);
                    conversationContext = firestoreMessages.map(msg => ({
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp as any)
                    }));
                }
            }

            // 2️⃣ Analyze the natural language query with context
            const analysis = await analyzeQuery(query, conversationContext);

            // 2.5️⃣ Handle Competitive Intelligence Requests (Ezal)
            if (analysis.searchType === 'competitive') {
                const { EzalAgent } = await import('@/server/services/ezal');
                const params = analysis.competitiveParams || {};
                let ezalResponse = "I couldn't process that competitive request.";

                try {
                    if (params.action === 'track_competitor' && params.targetName) {
                        const locationParts = (params.targetLocation || '').split(',');
                        const city = locationParts[0]?.trim() || 'Unknown';
                        const state = locationParts[1]?.trim() || '';

                        const result = await EzalAgent.trackCompetitor(
                            brandId,
                            {
                                name: params.targetName,
                                city: city,
                                state: state,
                                zip: '',
                                menuUrl: `https://google.com/search?q=${encodeURIComponent(params.targetName + ' menu')}`
                            }
                        );
                        ezalResponse = `✅ **Now Tracking: ${params.targetName}**\n\n${result.message}\n(Note: Please update the menu URL in the dashboard)`;
                    } else if (params.action === 'get_insights') {
                        const result = await EzalAgent.getInsights(brandId);
                        if (result.count === 0) {
                            ezalResponse = "No recent competitive insights found.";
                        } else {
                            ezalResponse = `**Recent Market Insights**\n\n${result.insights.slice(0, 5).map(i => `- ${i.type.replace('_', ' ')}: ${i.brand} (${i.severity})`).join('\n')}`;
                        }
                    } else if (params.action === 'check_price_gaps') {
                        const result = await EzalAgent.findPriceGaps(brandId);
                        if (result.count === 0) {
                            ezalResponse = "No significant price gaps detected right now.";
                        } else {
                            ezalResponse = `**Price Gap Analysis**\n\nFound ${result.count} potential opportunities:\n${result.gaps.slice(0, 3).map((g: any) => `- ${g.product}: We are ${g.gap} higher`).join('\n')}`;
                        }
                    } else {
                        ezalResponse = "I understand you want competitive intel, but I'm not sure which action to take. Try 'Track [Competitor]' or 'Show insights'.";
                    }
                } catch (error) {
                    logger.error('Ezal Agent Error', { error });
                    ezalResponse = "I encountered an error trying to access competitive data. Please check the system logs.";
                }

                // Save to session and return early
                if (userId && currentSessionId) {
                    await addMessageToSession(userId, currentSessionId, { role: 'user', content: query });
                    await addMessageToSession(userId, currentSessionId, { role: 'assistant', content: ezalResponse });
                }

                return NextResponse.json({
                    ok: true,
                    message: ezalResponse,
                    products: [],
                    sessionId: currentSessionId,
                });
            }

            // 3️⃣ Use CannMenusService to fetch products directly
            const cannMenusService = new CannMenusService();

            // Enhance search query with specific filters that CannMenus might not support as direct params yet
            let enhancedSearch = analysis.searchQuery;
            if (analysis.filters.effects && analysis.filters.effects.length > 0) {
                enhancedSearch += ` ${analysis.filters.effects.join(' ')}`;
            }
            if (analysis.filters.strainType) {
                enhancedSearch += ` ${analysis.filters.strainType}`;
            }

            const searchParams: SearchParams = {
                search: enhancedSearch.trim(),
                retailers: process.env.NEXT_PUBLIC_BAYSIDE_RETAILER_ID, // TODO: Use dynamic retailer from context/session
                brands: process.env.CANNMENUS_40TONS_BRAND_ID, // TODO: Use dynamic brand from headers/context
            };

            if (analysis.filters.category) searchParams.category = analysis.filters.category;
            if (analysis.filters.priceMin) searchParams.price_min = analysis.filters.priceMin;
            if (analysis.filters.priceMax) searchParams.price_max = analysis.filters.priceMax;

            const productData = await cannMenusService.searchProducts(searchParams);
            const rawProducts: CannMenusProduct[] = productData.products || [];

            // 4️⃣ Transform to ChatbotProduct shape (only a subset needed for UI)
            let chatProducts: ChatbotProduct[] = rawProducts.map((p) => ({
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

            // 4.5️⃣ Enrich with Chemotype Data (Task 203)
            const { enrichProductsWithChemotypes, rankByChemotype } = await import('@/ai/chemotype-ranking');
            chatProducts = enrichProductsWithChemotypes(chatProducts);

            // Optimize ranking based on inferred intent
            chatProducts = rankByChemotype(chatProducts, analysis.intent);

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
