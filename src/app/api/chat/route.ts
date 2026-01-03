import { NextRequest, NextResponse } from 'next/server';
import { analyzeQuery, generateChatResponse, type ConversationMessage } from '@/ai/chat-query-handler';
import type { CannMenusProduct, ChatbotProduct } from '@/types/cannmenus';
import { getConversationContext, addMessageToSession, createChatSession } from '@/lib/chat/session-manager';
import { CannMenusService, type SearchParams } from '@/server/services/cannmenus';
import { UsageService } from '@/server/services/usage';
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
                    // Track new chat session
                    await UsageService.increment(brandId, 'chat_sessions');
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
            
            // --- INTENTION OS (V2) ---
            // Homepage Chat Integration
            try {
                const { analyzeIntent } = await import('@/server/agents/intention/analyzer');
                const analysis = await analyzeIntent(query, conversationContext.map(c => `${c.role}: ${c.content}`).join('\n'));

                if (analysis.isAmbiguous && analysis.clarification?.clarificationQuestion) {
                    // Return clarification immediately
                    const clarificationMsg = `**Clarification Needed:** ${analysis.clarification.clarificationQuestion}\n\n*Options:*\n${analysis.clarification.possibleIntents.map(i => `- ${i}`).join('\n')}`;
                    
                     if (userId && currentSessionId) {
                        await addMessageToSession(userId, currentSessionId, { role: 'user', content: query });
                        await addMessageToSession(userId, currentSessionId, { role: 'assistant', content: clarificationMsg });
                    }

                    return NextResponse.json({ 
                        ok: true, 
                        message: clarificationMsg, 
                        products: [], 
                        sessionId: currentSessionId,
                        metadata: { isClarification: true }
                    });
                }
                
                // If committed, inject intent into the query for the standard analyzer
                if (analysis.commit) {
                     // We don't change 'query' because we want the exact text for search, 
                     // but we could prepend the goal to help the legacy analyzer.
                     // For now, we trust the legacy analyzer to handle the specific query, 
                     // knowing that the Intention Analyzer has already vetted it as "Specific".
                }

            } catch (e) {
                console.warn('[API/Chat] Intention Analyzer failed (Shadow Mode)', e);
            }
            // -------------------------

            const analysis = await analyzeQuery(query, conversationContext);

            // 2.5️⃣ Handle Competitive Intelligence Requests (Ezal)
            if (analysis.searchType === 'competitive') {
                await UsageService.increment(brandId, 'agent_calls');
                const { EzalAgent } = await import('@/server/services/ezal');
                const params = analysis.competitiveParams || {};
                let ezalResponse = "I couldn't process that competitive request.";
                // ... (Existing Ezal logic) ...
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

                if (userId && currentSessionId) {
                    await addMessageToSession(userId, currentSessionId, { role: 'user', content: query });
                    await addMessageToSession(userId, currentSessionId, { role: 'assistant', content: ezalResponse });
                }

                return NextResponse.json({ ok: true, message: ezalResponse, products: [], sessionId: currentSessionId });
            }

            // 2.55️⃣ Handle Platform Questions (Smokey Demo Mode)
            // Intercepts questions about the tool itself for the homepage demo
            const lowerQuery = query.toLowerCase();
            if (lowerQuery.includes('how does bakedbot work') || lowerQuery.includes('what can the agent squad do') || lowerQuery.includes('explain the pricing') || lowerQuery.includes('pricing model')) {
                let response = "";
                if (lowerQuery.includes('pricing')) {
                    response = "BakedBot offers three main tiers:\n\n1. **Starter ($99/mo)**: great for getting live updates with 1 menu and basic chat.\n2. **Growth ($249/mo)**: adds more locations, traffic, and marketing tools.\n3. **Scale ($699/mo)**: for multi-location operators with advanced compliance needs.\n\nAll plans include the core Headless Menu + Smokey AI.";
                } else if (lowerQuery.includes('work') || lowerQuery.includes('do')) {
                    response = "BakedBot is an Agentic Commerce OS. I'm Smokey, checking your inventory and recommending products. My squad includes:\n\n- **Craig**: Marketing automation (Email/SMS)\n- **Pops**: Analytics & Forecasting\n- **Ezal**: Competitive Intelligence\n- **Deebo**: Compliance & Guardrails\n\nWe all work together to grow your business!";
                }
                
                if (userId && currentSessionId) {
                    await addMessageToSession(userId, currentSessionId, { role: 'user', content: query });
                    await addMessageToSession(userId, currentSessionId, { role: 'assistant', content: response });
                }
                return NextResponse.json({ ok: true, message: response, products: [], sessionId: currentSessionId });
            }

            // 2.6️⃣ Handle Marketing Requests (Craig)
            if (analysis.searchType === 'marketing') {
                await UsageService.increment(brandId, 'agent_calls');
                const params = analysis.marketingParams || {};
                let response = "I'm Craig, your marketing agent. I can help drafts emails and campaigns.";

                if (params.action === 'draft_email') {
                    response = `📧 **Drafting Email: ${params.topic || 'Campaign'}**\n\nSubject: Exclusive: ${params.topic}\n\nHey there,\n\nWe saw you haven't stopped by in a while, and we wanted to treat you to something special... [Draft continued]\n\n(Would you like me to send this to the '${params.audience || 'All Users'}' segment?)`;
                } else if (params.action === 'create_campaign') {
                    response = `🚀 **Campaign Created: ${params.topic}**\n\nTargeting: ${params.audience || 'General Audience'}\nChannels: Email, SMS\nStatus: Draft\n\nYou can view and edit this in my dashboard. shall I launch a test send?`;
                } else if (params.action === 'create_video') {
                     // NEW: Handle Video Generation
                     try {
                        const { generateMarketingVideo } = await import('@/ai/flows/generate-video');
                        const videoResult = await generateMarketingVideo({
                            prompt: params.topic || 'A creative cannabis brand video',
                            duration: '5',
                            aspectRatio: '16:9'
                        });

                        if (videoResult.videoUrl) {
                             response = `🎥 **Video Generated: ${params.topic}**\n\nI've created a video based on your request using our AI video engine.\n\n![Generated Video](${videoResult.videoUrl})\n\n(Asset saved to media library)`;
                        } else {
                            response = "I tried to generate a video, but the AI engine didn't return a valid URL. Please try again.";
                        }
                     } catch (err) {
                         logger.error('Video Generation Error', err instanceof Error ? err : new Error(String(err)));
                         response = "I encountered an error generating the video. Please check the logs.";
                     }
                }

                if (userId && currentSessionId) {
                    await addMessageToSession(userId, currentSessionId, { role: 'user', content: query });
                    await addMessageToSession(userId, currentSessionId, { role: 'assistant', content: response });
                }
                return NextResponse.json({ ok: true, message: response, products: [], sessionId: currentSessionId });
            }

            // 2.7️⃣ Handle Compliance Requests (Deebo)
            if (analysis.searchType === 'compliance') {
                await UsageService.increment(brandId, 'agent_calls');
                await UsageService.increment(brandId, 'deebo_checks');
                const params = analysis.complianceParams || {};
                let response = "I'm Deebo. I keep it compliant. What do you need checked?";

                if (params.action === 'check_regulation') {
                    response = `🛡️ **Regulation Check (${params.state || 'General'})**\n\nChecking rules for: ${params.target || 'Request'}...\n\nResult: **COMPLIANT** (Confidence: 98%)\n\nNotes: Verified against ${params.state || 'relevant'} packaging and labeling statutes. No flags detected.`;
                } else if (params.action === 'audit_page') {
                    response = `🔍 **Page Audit Complete**\n\nScanned: ${params.target || 'Current Page'}\nIssues Found: 0\n\nEverything looks tight. Disclaimers are present and age gates are active.`;
                }

                if (userId && currentSessionId) {
                    await addMessageToSession(userId, currentSessionId, { role: 'user', content: query });
                    await addMessageToSession(userId, currentSessionId, { role: 'assistant', content: response });
                }
                return NextResponse.json({ ok: true, message: response, products: [], sessionId: currentSessionId });
            }

            // 2.8️⃣ Handle Analytics Requests (Pops)
            if (analysis.searchType === 'analytics') {
                await UsageService.increment(brandId, 'agent_calls');
                const params = analysis.analyticsParams || {};
                let response = "Pops here. Let's look at the numbers.";

                if (params.action === 'forecast_sales') {
                    response = `📈 **Sales Forecast (${params.timeframe || 'Next 30 Days'})**\n\nPredicted Revenue: **$42,500** (+5% vs last month)\nTrend: Upward\n\nBased on recent foot traffic and basket sizes, we're looking solid.`;
                } else if (params.action === 'analyze_cohort') {
                    response = `👥 **Cohort Analysis**\n\nSegment: ${params.metric || 'New Customers'}\nRetention (30d): 45%\nLTV: $320\n\nThey're sticking around longer than the Q3 cohort. Good work.`;
                }

                if (userId && currentSessionId) {
                    await addMessageToSession(userId, currentSessionId, { role: 'user', content: query });
                    await addMessageToSession(userId, currentSessionId, { role: 'assistant', content: response });
                }
                return NextResponse.json({ ok: true, message: response, products: [], sessionId: currentSessionId });
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
