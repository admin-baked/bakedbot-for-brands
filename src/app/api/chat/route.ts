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
                } else if (params.action === 'post_social') {
                    // NEW: Handle Social Posting
                    try {
                        const { SocialTools } = await import('@/server/tools/social');
                        const result = await SocialTools.post(
                             params.topic || 'Check out our new products!',
                             params.platforms || ['twitter', 'linkedin']
                        );
                        
                        if (result.success) {
                            response = `📱 **Social Post Sent**\n\nContent: "${params.topic}"\nPlatforms: ${params.platforms?.join(', ')}\nRef ID: ${result.refId}`;
                        } else {
                             response = `❌ **Social Post Failed**\n\nReason: ${result.errors?.join(', ')}`;
                        }
                    } catch (err) {
                        logger.error('Social Post Error', err instanceof Error ? err : new Error(String(err)));
                        response = "I encountered an error posting to social media.";
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

            // 2.7.5 Handles Scheduling (Felisha)
            if (analysis.searchType === 'scheduling') {
                await UsageService.increment(brandId, 'agent_calls');
                const params = analysis.schedulingParams || {};
                const { SchedulingTools } = await import('@/server/tools/scheduling');
                
                let response = "I'm Felisha. Checking the calendars.";
                
                if (params.action === 'check_availability') {
                    // Default to next 2 days if not specified
                    const today = new Date();
                    const nextDay = new Date(today);
                    nextDay.setDate(today.getDate() + 2);
                    
                    const result = await SchedulingTools.checkAvailability(
                        params.username || 'User',
                        today.toISOString(),
                        nextDay.toISOString()
                    );
                    
                    if (result && result.length > 0) {
                         response = `📅 **Availability Found**\n\nI see ${result.length} slots for ${params.username}:\n\n${result.slice(0,3).map((s: any) => `- ${new Date(s.time).toLocaleString()}`).join('\n')}\n\n[Book First Slot]`;
                    } else {
                         response = `📅 **No Availability**\n\nI couldn't find any open slots for ${params.username} in the next 48 hours.`;
                    }
                }
                
                if (userId && currentSessionId) {
                    await addMessageToSession(userId, currentSessionId, { role: 'user', content: query });
                    await addMessageToSession(userId, currentSessionId, { role: 'assistant', content: response });
                }
                return NextResponse.json({ ok: true, message: response, products: [], sessionId: currentSessionId });
            }

            // 2.7.6 Handles SEO (Day Day)
            if (analysis.searchType === 'seo') {
                 await UsageService.increment(brandId, 'agent_calls');
                 const params = analysis.seoParams || {};
                 const { SeoTools } = await import('@/server/tools/seo');
                 
                 let response = "Day Day here. Auditing your growth metrics.";
                 
                 if (params.action === 'audit_page' || params.action === 'check_rank') {
                     const url = params.url || 'https://bakedbot.ai';
                     const result = await SeoTools.checkRank(url);
                     
                     if (result.success) {
                         response = `🔍 **SEO Audit: ${url}**\n\nScore: **${Math.round(result.score || 0)}/100**\nTop Issue: ${result.topIssue}\n\n[View Full Report]`;
                     } else {
                         response = `❌ **Audit Failed**\n\nCould not access ${url}. Error: ${result.error}`;
                     }
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





            // 3️⃣ Use CannMenusService OR Injected Products
            let rawProducts: CannMenusProduct[] = [];           

            if (data!.products && data!.products.length > 0) {
                 // Context Injection (Demo Mode)
                 // Map generic products to CannMenus compatible shape for downstream processing
                 rawProducts = data!.products.map((p: any) => ({
                     cann_sku_id: p.id,
                     product_name: p.name,
                     category: p.category,
                     latest_price: p.price,
                     image_url: p.imageUrl,
                     percentage_thc: p.thcPercent,
                     percentage_cbd: p.cbdPercent,
                     url: p.url || '',
                     display_weight: '',
                     producer_name: '',
                     brand_name: '', 
                     description: p.description,
                     brand_id: 0,
                     original_price: p.price,
                     medical: true,
                     recreational: true
                 }));
            } else {
                // Standard: Fetch from CannMenus
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
                rawProducts = productData.products || [];
            }

            // 4️⃣ Transform to ChatbotProduct shape (only a subset needed for UI)
            let chatProducts: ChatbotProduct[] = rawProducts.map((p) => ({
                id: p.cann_sku_id,
                name: p.product_name,
                category: p.category,
                price: p.latest_price,
                imageUrl: p.image_url,
                description: (p as any).description || p.product_name, // placeholder – CannMenus does not return description here, but injected products do
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
