// src/ai/chat-query-handler.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getSmokeyConfig } from '@/config/super-admin-smokey-config';

// Schema for extracting search parameters from natural language queries
const QueryAnalysisSchema = z.object({
    searchType: z.enum(['semantic', 'keyword', 'filtered', 'competitive']).describe('The type of search or action to perform based on the query'),
    filters: z.object({
        priceMin: z.number().optional().describe('Minimum price filter extracted from query'),
        priceMax: z.number().optional().describe('Maximum price filter extracted from query'),
        category: z.string().optional().describe('Product category (e.g., "Edibles", "Flower", "Vape", "Pre-Rolls")'),
        effects: z.array(z.string()).optional().describe('Desired effects (e.g., "relaxing", "uplifting", "energizing")'),
        strainType: z.enum(['sativa', 'indica', 'hybrid']).optional().describe('Strain type if mentioned'),
    }),
    competitiveParams: z.object({
        action: z.enum(['track_competitor', 'get_insights', 'check_price_gaps', 'unknown']).optional(),
        targetName: z.string().optional().describe('Name of the competitor to track or analyze'),
        targetLocation: z.string().optional().describe('City or state of the competitor'),
    }).optional().describe('Parameters for competitive intelligence actions'),
    searchQuery: z.string().describe('The refined search query to use for product search'),
    intent: z.string().describe('A brief description of what the user is looking for'),
});

export type QueryAnalysis = z.infer<typeof QueryAnalysisSchema>;

// Prompt for analyzing user queries
const analyzeQueryPrompt = ai.definePrompt({
    name: 'analyzeQueryPrompt',
    input: {
        schema: z.object({
            query: z.string(),
            context: z.string().optional()
        })
    },
    output: { schema: QueryAnalysisSchema },
    prompt: `You are an AI assistant that analyzes cannabis product search queries and competitive intelligence requests.

{{#if context}}
Previous conversation context:
{{{context}}}

Use this context to better understand the current query and maintain conversation continuity.
{{/if}}

Your task is to extract search parameters or action intents from the user's natural language query.

User Query: {{{query}}}

Extract the following information:
1. **searchType**: Determine if this is a:
   - "semantic": Complex query about effects, feelings, or experiences (e.g., "something to help me relax")
   - "keyword": Simple product name or brand search (e.g., "Blue Dream")
   - "filtered": Query with specific filters like price or category (e.g., "edibles under $20")
   - "competitive": Requests to track competitors, check prices, or get market insights (e.g., "Track Green Dragon", "Who has cheaper gummies?")

2. **filters** (for product search): Extract any mentioned:
   - Price range, Category, Effects, Strain type

3. **competitiveParams** (for "competitive" type):
   - **action**:
     - "track_competitor": Add a new competitor (e.g., "Start tracking Star Buds in Denver")
     - "get_insights": General news/changes (e.g., "What's new with competitors?", "Any price drops?")
     - "check_price_gaps": Specific price comparisons (e.g., "Am I overpriced on Wyld?", "Price check vs Lightshade")
   - **targetName**: The competitor name mentioned
   - **targetLocation**: The city/state mentioned

4. **searchQuery**: Create a refined search query (for product search) or a summary of the action (for competitive)

5. **intent**: Briefly describe what the user wants in natural language

Examples:
- "Show me uplifting sativa gummies under $25" → searchType: filtered, filters: {priceMax: 25, ...}
- "Track Green Dragon in Denver" → searchType: competitive, competitiveParams: {action: "track_competitor", targetName: "Green Dragon", targetLocation: "Denver"}
- "Are my prices higher than Lightshade?" → searchType: competitive, competitiveParams: {action: "check_price_gaps", targetName: "Lightshade"}
- "What's happening in the market?" → searchType: competitive, competitiveParams: {action: "get_insights"}
`,
    model: 'googleai/gemini-2.5-flash',
});

// Schema for generating conversational responses
const ChatResponseSchema = z.object({
    message: z.string().describe('A friendly, conversational response to the user'),
    shouldShowProducts: z.boolean().describe('Whether to show product recommendations'),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

/**
 * Conversation message type for context
 */
export interface ConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
}

// Prompt for generating chat responses
const generateChatResponsePrompt = ai.definePrompt({
    name: 'generateChatResponsePrompt',
    input: {
        schema: z.object({
            query: z.string(),
            intent: z.string(),
            productCount: z.number(),
            hasProducts: z.boolean(),
            personaName: z.string(),
            personaSystemPrompt: z.string(),
        }),
    },
    output: { schema: ChatResponseSchema },
    prompt: `{{{personaSystemPrompt}}}

Your name is {{{personaName}}}.

The user asked: "{{{query}}}"
Their intent is: {{{intent}}}

{{#if hasProducts}}
You found {{{productCount}}} product(s) that match their request.

Generate a friendly, conversational response that:
1. Acknowledges their request
2. Briefly mentions what you found
3. Encourages them to explore the products

Keep it concise (1-2 sentences max). Be warm and helpful.
Set shouldShowProducts to true.
{{else}}
You didn't find any products matching their request.

Generate a friendly response that:
1. Apologizes for not finding matches
IMPORTANT: Do NOT make medical claims. Use phrases like "users often report" or "known for" instead of claiming effects.
`,
    model: 'googleai/gemini-2.5-flash',
});

/**
 * Analyzes a user's natural language query to extract search parameters
 * @param query - The user's search query
 * @param conversationContext - Optional previous messages for context
 */
export async function analyzeQuery(
    query: string,
    conversationContext?: ConversationMessage[]
): Promise<QueryAnalysis> {
    // Format conversation context for the prompt
    const contextString = conversationContext && conversationContext.length > 0
        ? conversationContext.map(msg => `${msg.role}: ${msg.content}`).join('\n')
        : undefined;

    const result = await analyzeQueryPrompt({
        query,
        context: contextString
    });
    return result.output!;
}

/**
 * Generates a conversational response based on query results
 * @param isSuperAdmin - If true, uses Baked HQ persona instead of Smokey
 */
export async function generateChatResponse(
    query: string,
    intent: string,
    productCount: number,
    isSuperAdmin: boolean = false
): Promise<ChatResponse> {
    const config = getSmokeyConfig(isSuperAdmin);
    const { output } = await generateChatResponsePrompt({
        query,
        intent,
        productCount,
        hasProducts: productCount > 0,
        personaName: config.name,
        personaSystemPrompt: config.systemPrompt,
    });
    return output!;
}
