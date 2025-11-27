// src/ai/chat-query-handler.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Schema for extracting search parameters from natural language queries
const QueryAnalysisSchema = z.object({
    searchType: z.enum(['semantic', 'keyword', 'filtered']).describe('The type of search to perform based on the query'),
    filters: z.object({
        priceMin: z.number().optional().describe('Minimum price filter extracted from query'),
        priceMax: z.number().optional().describe('Maximum price filter extracted from query'),
        category: z.string().optional().describe('Product category (e.g., "Edibles", "Flower", "Vape", "Pre-Rolls")'),
        effects: z.array(z.string()).optional().describe('Desired effects (e.g., "relaxing", "uplifting", "energizing")'),
        strainType: z.enum(['sativa', 'indica', 'hybrid']).optional().describe('Strain type if mentioned'),
    }),
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
    prompt: `You are an AI assistant that analyzes cannabis product search queries.

{{#if context}}
Previous conversation context:
{{{context}}}

Use this context to better understand the current query and maintain conversation continuity.
{{/if}}

Your task is to extract search parameters from the user's natural language query.

User Query: {{{query}}}

Extract the following information:
1. **searchType**: Determine if this is a:
   - "semantic": Complex query about effects, feelings, or experiences (e.g., "something to help me relax")
   - "keyword": Simple product name or brand search (e.g., "Blue Dream")
   - "filtered": Query with specific filters like price or category (e.g., "edibles under $20")

2. **filters**: Extract any mentioned:
   - Price range (priceMin, priceMax)
   - Category (Edibles, Flower, Vape, Pre-Rolls, Concentrates, etc.)
   - Effects (relaxing, uplifting, energizing, creative, sleepy, etc.)
   - Strain type (sativa, indica, hybrid)

3. **searchQuery**: Create a refined search query that captures the essence of what they're looking for

4. **intent**: Briefly describe what the user wants

Examples:
- "Show me uplifting sativa gummies under $25" → searchType: filtered, filters: {priceMax: 25, category: "Edibles", effects: ["uplifting"], strainType: "sativa"}
- "something to help me sleep" → searchType: semantic, filters: {effects: ["relaxing", "sleepy"]}, searchQuery: "relaxing sleep aid"
- "Blue Dream flower" → searchType: keyword, searchQuery: "Blue Dream", filters: {category: "Flower"}
`,
    model: 'googleai/gemini-2.5-flash',
});

// Schema for generating conversational responses
const ChatResponseSchema = z.object({
    message: z.string().describe('A friendly, conversational response to the user'),
    shouldShowProducts: z.boolean().describe('Whether to show product recommendations'),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// Prompt for generating chat responses
const generateChatResponsePrompt = ai.definePrompt({
    name: 'generateChatResponsePrompt',
    input: {
        schema: z.object({
            query: z.string(),
            intent: z.string(),
            productCount: z.number(),
            hasProducts: z.boolean(),
        }),
    },
    output: { schema: ChatResponseSchema },
    prompt: `You are Smokey, a friendly and knowledgeable AI budtender assistant.

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
2. Suggests they try a different search or ask for help
3. Offers to assist them further

Keep it concise and encouraging.
Set shouldShowProducts to false.
{{/if}}

    query: string,
    intent: string,
    productCount: number
): Promise<ChatResponse> {
    const { output } = await generateChatResponsePrompt({
        query,
        intent,
        productCount,
        hasProducts: productCount > 0,
    });
    return output!;
}
