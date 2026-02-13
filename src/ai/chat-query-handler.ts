// src/ai/chat-query-handler.ts
// Note: Removed 'use server' to allow imports from API routes (Turbopack compatibility)
// These functions are already called from server-side contexts (API routes, Server Actions)
// so they don't need the 'use server' directive

import { ai } from './genkit';
import { z } from 'zod';
import { getSmokeyConfig } from '@/config/super-admin-smokey-config';

// Schema for extracting search parameters from natural language queries
export const QueryAnalysisSchema = z.object({
    searchType: z.enum(['semantic', 'keyword', 'filtered', 'competitive', 'marketing', 'compliance', 'analytics', 'scheduling', 'seo', 'checkout']).describe('The type of search or action to perform based on the query'),
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
    }).optional().describe('Parameters for competitive intelligence actions (Ezal)'),
    marketingParams: z.object({
        action: z.enum(['create_campaign', 'draft_email', 'segment_users', 'create_video', 'post_social', 'unknown']).optional(),
        topic: z.string().optional().describe('Topic of the campaign, email, or video'),
        audience: z.string().optional().describe('Target audience'),
        platforms: z.array(z.string()).optional().describe('Social platforms for posting (e.g., twitter, linkedin)'),
    }).optional().describe('Parameters for marketing actions (Craig)'),
    complianceParams: z.object({
        action: z.enum(['check_product', 'audit_page', 'check_regulation']).optional(),
        target: z.string().optional().describe('Product or page to check'),
        state: z.string().optional().describe('Jurisdiction state'),
    }).optional().describe('Parameters for compliance actions (Deebo)'),
    analyticsParams: z.object({
        action: z.enum(['forecast_sales', 'analyze_cohort', 'get_report']).optional(),
        metric: z.string().optional().describe('Metric to analyze (e.g., sales, retention)'),
        timeframe: z.string().optional().describe('Timeframe for analysis'),
    }).optional().describe('Parameters for analytics actions (Pops)'),
    schedulingParams: z.object({
        action: z.enum(['check_availability', 'book_meeting']).optional(),
        username: z.string().optional().describe('Person to meet with'),
        date: z.string().optional().describe('Date or time reference'),
    }).optional().describe('Parameters for scheduling actions (Felisha)'),
    seoParams: z.object({
        action: z.enum(['audit_page', 'check_rank']).optional(),
        url: z.string().optional().describe('URL to audit'),
    }).optional().describe('Parameters for SEO actions (Day Day)'),
    checkoutParams: z.object({
        action: z.enum(['create_order', 'view_cart']).optional(),
        productName: z.string().optional().describe('Product to add/checkout'),
        quantity: z.number().optional().describe('Quantity to add'),
    }).optional().describe('Parameters for checkout actions (Smokey Quick Checkout)'),
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
    prompt: `You are an AI assistant that analyzes cannabis product search queries and specialized agent requests.

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
   - "checkout": Requests to buy, purchase, add to cart, or checkout (e.g., "I'll take the gummies", "add two to cart", "checkout now") [Smokey Quick Checkout]
   - "competitive": Requests to track competitors, check prices, or get market insights (e.g., "Track Green Dragon", "Who has cheaper gummies?") [Ezal Agent]
   - "marketing": Requests to create campaigns, emails, SMS, VIDEOS, or SOCIAL POSTS (e.g., "Draft a 4/20 email", "Tweet about our sale") [Craig Agent]
   - "compliance": Requests to check laws, audit labels, or verify regulations (e.g., "Is 100mg THC legal in CA?", "Check this label") [Deebo Agent]
   - "analytics": Requests for sales data, forecasts, or cohorts (e.g., "Forecast next month's sales", "What is my CLV?") [Pops Agent]
   - "scheduling": Requests to book meetings or check availability (e.g., "Is Jack free tomorrow?", "Book a sync with Felisha") [Felisha Agent]
   - "seo": Requests to audit pages or check rank (e.g., "Audit our homepage", "Check SEO score for brand page") [Day Day Agent]

2. **filters** (for product search): Extract any mentioned Price range, Category, Effects, Strain type.

3. **competitiveParams** (Ezal):
   - action: track_competitor, get_insights, check_price_gaps
   - targetName, targetLocation

4. **marketingParams** (Craig):
   - action: create_campaign, draft_email, segment_users, create_video, post_social
   - topic, audience, platforms (array)

5. **complianceParams** (Deebo):
   - action: check_product, audit_page, check_regulation
   - target, state

6. **analyticsParams** (Pops):
   - action: forecast_sales, analyze_cohort, get_report
   - metric, timeframe

7. **schedulingParams** (Felisha):
   - action: check_availability, book_meeting
   - username, date

8. **seoParams** (Day Day):
   - action: audit_page, check_rank
   - url

9. **checkoutParams** (Smokey Quick Checkout):
   - action: create_order, view_cart
   - productName: extract name if mentioned
   - quantity: extract quantity if mentioned (default 1)

10. **searchQuery**: Create a refined search query or summary.

11. **intent**: Briefly describe user intent.

Examples:
- "Show me uplifting sativa gummies under $25" → searchType: filtered, filters: {priceMax: 25, ...}
- "I'll take two of the blue dream" → searchType: checkout, checkoutParams: {action: "create_order", productName: "blue dream", quantity: 2}
- "Checkout now" → searchType: checkout, checkoutParams: {action: "view_cart"}
- "Track Green Dragon in Denver" → searchType: competitive, competitiveParams: {action: "track_competitor", ...}
- "Draft an email about our new concentrates drop" → searchType: marketing, marketingParams: {action: "draft_email", topic: "new concentrates drop"}
- "Post to Twitter about our happy hour" → searchType: marketing, marketingParams: {action: "post_social", topic: "happy hour", platforms: ["twitter"]}
- "Is it legal to sell delta-8 in NY?" → searchType: compliance, complianceParams: {action: "check_regulation", state: "NY"}
- "Predict sales for next month" → searchType: analytics, analyticsParams: {action: "forecast_sales", timeframe: "next month"}
- "When is Jack free?" -> searchType: scheduling, schedulingParams: {action: "check_availability", username: "Jack"}
- "Audit https://bakedbot.ai" -> searchType: seo, seoParams: {action: "audit_page", url: "https://bakedbot.ai"}
`,
    model: 'googleai/gemini-3-flash-preview',
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
    model: 'googleai/gemini-3-flash-preview',
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
