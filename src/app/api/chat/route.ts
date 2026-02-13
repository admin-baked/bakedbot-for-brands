import { NextRequest, NextResponse } from 'next/server';
import type { ChatbotProduct } from '@/types/cannmenus';
import type { ConversationMessage } from '@/ai/chat-query-handler';
import { getConversationContext, addMessageToSession, createChatSession } from '@/lib/chat/session-manager';
import { UsageService } from '@/server/services/usage';
import { logger } from '@/lib/logger';
import { withProtection } from '@/server/middleware/with-protection';
import { chatRequestSchema, type ChatRequest } from '../schemas';
import { hasGroundTruth } from '@/server/grounding';
import { validateInput, getRiskLevel } from '@/server/security';
import { getChatbotUpsells } from '@/server/services/upsell-engine';

// Force dynamic rendering - prevents build-time evaluation of Genkit imports
export const dynamic = 'force-dynamic';

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

            // 0️⃣ SECURITY: Validate input for prompt injection attempts
            const inputValidation = validateInput(query, { maxLength: 1000, allowedRole: 'customer' });
            if (inputValidation.blocked) {
                logger.warn('[Chat] Blocked prompt injection attempt', {
                    reason: inputValidation.blockReason,
                    riskScore: inputValidation.riskScore,
                    flags: inputValidation.flags.map(f => f.type),
                });
                return NextResponse.json({
                    ok: false,
                    error: "I couldn't process that request. Please try rephrasing your question.",
                }, { status: 400 });
            }

            // Log high-risk (but not blocked) queries for monitoring
            if (inputValidation.riskScore >= 30) {
                logger.info('[Chat] High-risk query detected', {
                    riskLevel: getRiskLevel(inputValidation.riskScore),
                    riskScore: inputValidation.riskScore,
                    userId,
                });
            }

            // Use sanitized query for processing
            const sanitizedQuery = inputValidation.sanitized;

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


            // 2️⃣ Execute Consumer Agent (Smokey & Squad) via Adapter
            const { runConsumerAgent } = await import('@/server/agents/adapters/consumer-adapter');

            // Pass the current view products as context
            const contextProducts = data!.products || [];

            const agentResponse = await runConsumerAgent(sanitizedQuery, {
                userId,
                sessionId: currentSessionId!,
                brandId,
                state,
                products: contextProducts
            });

            const safeMessage = agentResponse.message;
            const chatProducts = agentResponse.products;

            // 3️⃣ Store messages in session if userId provided
            if (userId && currentSessionId) {
                await addMessageToSession(userId, currentSessionId, {
                    role: 'user',
                    content: query,
                    productReferences: chatProducts.slice(0, 5).map(p => p.id),
                });

                await addMessageToSession(userId, currentSessionId, {
                    role: 'assistant',
                    content: safeMessage,
                });
            }

            // 4️⃣ Get upsell suggestions for the top recommended product
            // We keep this logic here for now to ensure the UI gets the 'upsells' field it expects
            let upsellProducts: ChatbotProduct[] = [];
            if (chatProducts.length > 0) {
                try {
                    // Check if pilot customer logic applies (for upsells specifically)
                    const normalizedBrandId = brandId.startsWith('brand_') ? brandId : `brand_${brandId}`;
                    const isPilotCustomer = hasGroundTruth(brandId) || hasGroundTruth(normalizedBrandId.replace('brand_', ''));

                    if (isPilotCustomer) {
                        const topProductId = chatProducts[0].id;
                        const upsellResult = await getChatbotUpsells(topProductId, brandId, { maxResults: 1 });
                        upsellProducts = upsellResult.suggestions.map(s => ({
                            id: s.product.id,
                            name: s.product.name,
                            category: s.product.category,
                            price: s.product.price,
                            imageUrl: s.product.imageUrl,
                            description: s.product.description || s.product.name,
                            thcPercent: s.product.thcPercent ?? null,
                            cbdPercent: s.product.cbdPercent ?? null,
                            displayWeight: '',
                            url: '',
                            upsellReason: s.reason,
                            upsellSavings: s.savingsText,
                        }));
                    }
                } catch (upsellError) {
                    logger.warn('[Chat] Upsell fetch failed (non-critical)', { error: upsellError });
                }
            }

            return NextResponse.json({
                ok: true,
                message: safeMessage,
                products: chatProducts,
                upsells: upsellProducts,
                sessionId: currentSessionId,
                clientAction: agentResponse.clientAction,
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
