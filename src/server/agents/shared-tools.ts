/**
 * Shared Tool Definitions for All Agents
 *
 * This file contains common tool definitions that all agents can use.
 * Import these into agent files to ensure consistent Context OS and Letta integration.
 */

import { z } from 'zod';
import { browserToolDefs, BrowserTools } from '../tools/browser-tools';

// ============================================================================
// CONTEXT OS TOOL DEFINITIONS
// Enables agents to log decisions and query the decision graph
// ============================================================================

export const contextOsToolDefs = [
    {
        name: "contextLogDecision",
        description: "Log an important business decision with its reasoning. Use this for strategic choices, pricing changes, campaign launches, or compliance decisions.",
        schema: z.object({
            decision: z.string().describe("What was decided (e.g., 'Approved 20% discount for VIP customers')"),
            reasoning: z.string().describe("Why this decision was made (e.g., 'Competitive pressure from nearby dispensary')"),
            category: z.enum(['pricing', 'marketing', 'compliance', 'operations', 'strategy', 'other']).describe("Category of the decision")
        })
    },
    {
        name: "contextAskWhy",
        description: "Ask the Context Graph why a specific decision was made in the past. Use this to understand historical reasoning before making new decisions.",
        schema: z.object({
            question: z.string().describe("E.g., 'Why did we discount Sour Diesel last week?' or 'What was the reasoning for the compliance rejection?'")
        })
    },
    {
        name: "contextGetAgentHistory",
        description: "Get the recent decision history for a specific agent. Useful for understanding patterns or reviewing past actions.",
        schema: z.object({
            agentId: z.string().describe("The agent ID (e.g., 'craig', 'deebo', 'money_mike')"),
            limit: z.number().optional().describe("Maximum number of decisions to return (default: 5)")
        })
    }
];

// ============================================================================
// USER MANAGEMENT TOOL DEFINITIONS
// Tools for inviting and managing users
// ============================================================================

export const userManagementToolDefs = [
    {
        name: "inviteUser",
        description: "Create a user account and send an invitation email via Mailjet. Use this to invite new team members, brand admins, dispensary staff, or customers to the platform.",
        schema: z.object({
            email: z.string().email().describe("Email address of the user to invite"),
            role: z.enum([
                'super_user', 'super_admin',
                'brand_admin', 'brand_member', 'brand',
                'dispensary_admin', 'dispensary_staff', 'dispensary', 'budtender',
                'customer'
            ]).describe("User role (brand_admin, dispensary_staff, customer, etc.)"),
            businessName: z.string().optional().describe("Name of the brand or dispensary (required for business roles)"),
            firstName: z.string().optional().describe("User's first name (optional but recommended)"),
            lastName: z.string().optional().describe("User's last name (optional but recommended)"),
            sendEmail: z.boolean().optional().default(true).describe("Whether to send the invitation email via Mailjet (default: true)")
        })
    }
];

// ============================================================================
// LETTA MEMORY TOOL DEFINITIONS
// Standard Letta tools for all agents
// ============================================================================

export const lettaToolDefs = [
    {
        name: "lettaSaveFact",
        description: "Save a persistent fact or finding into long-term memory via Letta. Use this for important information that should be remembered forever.",
        schema: z.object({
            fact: z.string().describe("The fact or finding to store."),
            category: z.string().optional().describe("Optional category (e.g., 'Competitor', 'Pricing').")
        })
    },
    {
        name: "lettaAsk",
        description: "Ask the long-term memory a question to retrieve facts. Use this to recall info about brands, past research, etc.",
        schema: z.object({
            question: z.string().describe("The question to ask the memory system.")
        })
    },
    {
        name: "lettaSearchMemory",
        description: "Semantically search your long-term archival memory. Use this to recall specific details, facts, or past research findings.",
        schema: z.object({
            query: z.string().describe("The search query (e.g., 'competitor pricing strategy', 'user preference for email').")
        })
    },
    {
        name: "lettaUpdateCoreMemory",
        description: "Update your own Core Memory (Persona). Use this to permanently change how you behave or remember critical user preferences.",
        schema: z.object({
            section: z.enum(['persona', 'human']).describe("'persona' updates who YOU are. 'human' updates what you know about the USER."),
            content: z.string().describe("The new content for this section.")
        })
    },
    {
        name: "lettaMessageAgent",
        description: "Send a direct message to another agent. Use this to delegate tasks, ask questions, or share findings with your squad.",
        schema: z.object({
            toAgent: z.string().describe("The name of the target agent (e.g., 'Jack', 'Linus', 'Craig')."),
            message: z.string().describe("The content of the message.")
        })
    },
    {
        name: "lettaReadSharedBlock",
        description: "Read a specific Shared Memory Block. Use this to access 'Strategy', 'ComplianceRules', or 'WeeklyKPIs' shared by the Boardroom.",
        schema: z.object({
            blockLabel: z.string().describe("The label of the shared block (e.g., 'brand_context', 'compliance_policies').")
        })
    }
];

// ============================================================================
// COMBINED TOOL DEFINITIONS
// Use this for agents that should have all shared tools
// ============================================================================

export const sharedToolDefs = [...contextOsToolDefs, ...lettaToolDefs];

// ============================================================================
// TOOL INTERFACES
// TypeScript interfaces for agent tools
// ============================================================================

export interface ContextOsTools {
    contextLogDecision(decision: string, reasoning: string, category: string): Promise<string>;
    contextAskWhy(question: string): Promise<string>;
    contextGetAgentHistory(agentId: string, limit?: number): Promise<string>;
}

export interface LettaTools {
    lettaSaveFact(fact: string, category?: string): Promise<any>;
    lettaAsk(question: string): Promise<any>;
    lettaSearchMemory(query: string): Promise<any>;
    lettaUpdateCoreMemory(section: 'persona' | 'human', content: string): Promise<any>;
    lettaMessageAgent(toAgent: string, message: string): Promise<any>;
    lettaReadSharedBlock(blockLabel: string): Promise<string>;
}

export interface SharedTools extends ContextOsTools, LettaTools {}

// ============================================================================
// INTUITION OS TOOL DEFINITIONS
// System 1 (fast) heuristics and confidence routing
// ============================================================================

export const intuitionOsToolDefs = [
    {
        name: "intuitionEvaluateHeuristics",
        description: "Evaluate all applicable heuristics for the current context. Returns fast-path recommendations without full LLM reasoning.",
        schema: z.object({
            customerProfile: z.object({
                potencyTolerance: z.enum(['low', 'medium', 'high']).optional(),
                preferredEffects: z.array(z.string()).optional(),
                preferredCategories: z.array(z.string()).optional(),
            }).optional().describe("Customer preferences and profile data"),
            products: z.array(z.any()).optional().describe("List of products to filter/rank"),
            sessionContext: z.any().optional().describe("Additional session context")
        })
    },
    {
        name: "intuitionGetConfidence",
        description: "Calculate confidence score to determine if fast-path (heuristics) or slow-path (full LLM reasoning) should be used.",
        schema: z.object({
            interactionCount: z.number().describe("Number of past interactions with this customer"),
            heuristicsMatched: z.number().describe("Number of heuristics that matched"),
            totalHeuristics: z.number().describe("Total available heuristics"),
            isAnomalous: z.boolean().optional().describe("Whether this request seems anomalous")
        })
    },
    {
        name: "intuitionLogOutcome",
        description: "Log the outcome of a recommendation or action for feedback learning.",
        schema: z.object({
            heuristicId: z.string().optional().describe("ID of the heuristic that was applied"),
            action: z.string().describe("What action was taken"),
            outcome: z.enum(['positive', 'negative', 'neutral']).describe("Result of the action"),
            metadata: z.any().optional().describe("Additional outcome data")
        })
    }
];

export interface IntuitionOsTools {
    intuitionEvaluateHeuristics(customerProfile?: any, products?: any[], sessionContext?: any): Promise<any>;
    intuitionGetConfidence(interactionCount: number, heuristicsMatched: number, totalHeuristics: number, isAnomalous?: boolean): Promise<any>;
    intuitionLogOutcome(action: string, outcome: 'positive' | 'negative' | 'neutral', heuristicId?: string, metadata?: any): Promise<any>;
}

export interface UserManagementTools {
    inviteUser(email: string, role: string, businessName?: string, firstName?: string, lastName?: string, sendEmail?: boolean): Promise<any>;
}

// NOTE: allSharedToolDefs and AllSharedTools are defined at the bottom of the file
// after all tool definition blocks (including semanticSearchToolDefs).

// ============================================================================
// EXECUTIVE CONTEXT TOOL DEFINITIONS
// Calendar, email, and web search for Executive Boardroom agents.
// Implementations live in default-tools.ts (defaultExecutiveBoardTools).
// ============================================================================

export const executiveContextToolDefs = [
    {
        name: "getCalendarContext",
        description: "Fetch today's scheduled meetings from the BakedBot calendar and Google Calendar. Use proactively to prep for calls, identify scheduling gaps, and understand the day's agenda. Always call this when the user asks about their schedule, upcoming meetings, or what's on the agenda.",
        schema: z.object({})
    },
    {
        name: "getEmailDigest",
        description: "Fetch unread emails from the CEO's Gmail inbox. Use proactively to spot inbound opportunities, lead inquiries, partnership proposals, and urgent follow-ups. Always call this when scanning for opportunities or reviewing what's come in.",
        schema: z.object({
            sinceHours: z.number().optional().describe("Hours to look back (default: 8 hours = since this morning)")
        })
    },
    {
        name: "searchOpportunities",
        description: "Search the web for cannabis industry news, market opportunities, competitor moves, and trends relevant to your domain. Use this to surface actionable intelligence you can bring to the CEO proactively.",
        schema: z.object({
            query: z.string().describe("Search query (e.g., 'NY cannabis dispensary partnerships 2026', 'cannabis email marketing trends')")
        })
    }
];

export interface ExecutiveContextTools {
    getCalendarContext(): Promise<any>;
    getEmailDigest(sinceHours?: number): Promise<any>;
    searchOpportunities(query: string): Promise<any>;
}

// ============================================================================
// PROACTIVE SEARCH TOOL — shared by dispensary/brand/grower support agents
// (searchOpportunities only — no CEO email/calendar access)
// ============================================================================

export const proactiveSearchToolDef = {
    name: "searchOpportunities",
    description: "Search the web for cannabis industry trends, competitor moves, market opportunities, and relevant news to inform proactive recommendations. Use this to bring real intelligence to users without being asked.",
    schema: z.object({
        query: z.string().describe("Specific search query — e.g., 'cannabis dispensary retention strategies NY 2026', 'cannabis pricing trends Q1 2026'")
    })
};

export interface ProactiveSearchTool {
    searchOpportunities(query: string): Promise<any>;
}

// ============================================================================
// SEMANTIC SEARCH TOOL DEFINITIONS (LanceDB)
// Cross-catalog vector search across own + competitor products & insights
// Available to ALL agents and Super Users
// ============================================================================

export const semanticSearchToolDefs = [
    {
        name: "semanticSearchProducts",
        description: "Semantically search across both your own product catalog AND competitor catalogs using AI embeddings. Returns ranked results by relevance. Use this to find similar products, compare offerings, discover pricing gaps, or answer product-related questions. Pass competitorId='__self__' to search only your own catalog, or omit to search everything.",
        schema: z.object({
            query: z.string().describe("Natural language search query — e.g., 'indica flower under $50', 'high THC vape cartridges', 'edibles similar to Wyld gummies'"),
            competitorId: z.string().optional().describe("Filter to a specific competitor ID, or '__self__' for your own catalog only. Omit to search all catalogs."),
            category: z.string().optional().describe("Filter by product category: 'flower', 'vape', 'edible', 'concentrate', 'preroll', 'topical', 'tincture', 'accessory'"),
            inStockOnly: z.boolean().optional().describe("Only return in-stock products (default: false)"),
            limit: z.number().optional().describe("Max results to return (default: 10, max: 50)")
        })
    },
    {
        name: "semanticSearchInsights",
        description: "Search competitive intelligence insights using semantic similarity. Finds relevant price changes, new products, stock changes, and market movements. Use this to understand competitor activity, inform pricing strategy, or brief executives on market dynamics.",
        schema: z.object({
            query: z.string().describe("Natural language search — e.g., 'recent price drops on flower', 'competitor new product launches', 'high severity market changes'"),
            severity: z.string().optional().describe("Filter by severity: 'low', 'medium', 'high', 'critical'"),
            type: z.string().optional().describe("Filter by insight type: 'price_drop', 'price_increase', 'new_product', 'out_of_stock', 'back_in_stock'"),
            limit: z.number().optional().describe("Max results to return (default: 10)")
        })
    },
    {
        name: "getCompetitorPriceHistory",
        description: "Get the price history timeline for a specific competitor product. Shows price changes over time, promotional periods, and price trends. Use this for pricing strategy, trend analysis, or executive reports.",
        schema: z.object({
            productId: z.string().describe("The LanceDB product ID (format: 'competitorId__externalProductId')"),
            days: z.number().optional().describe("Number of days to look back (default: 30)"),
            limit: z.number().optional().describe("Max data points to return (default: 100)")
        })
    },
    {
        name: "getVectorStoreStats",
        description: "Get statistics about the competitive intelligence vector store — number of indexed products, price data points, and insights. Use this to verify data freshness and coverage.",
        schema: z.object({})
    }
];

export interface SemanticSearchTools {
    semanticSearchProducts(query: string, competitorId?: string, category?: string, inStockOnly?: boolean, limit?: number): Promise<any>;
    semanticSearchInsights(query: string, severity?: string, type?: string, limit?: number): Promise<any>;
    getCompetitorPriceHistory(productId: string, days?: number, limit?: number): Promise<any>;
    getVectorStoreStats(): Promise<any>;
}

// ============================================================================
// ALL SHARED TOOL DEFINITIONS (must be after all individual tool blocks)
// ============================================================================

export const allSharedToolDefs = [...contextOsToolDefs, ...lettaToolDefs, ...intuitionOsToolDefs, ...browserToolDefs, ...userManagementToolDefs, ...semanticSearchToolDefs];

// Extended interface with all tools
export interface AllSharedTools extends SharedTools, IntuitionOsTools, BrowserTools, UserManagementTools, SemanticSearchTools {}

// ============================================================================
// SEMANTIC SEARCH RUNTIME IMPLEMENTATIONS
// Factory that returns tool implementations for backend agents (harness path).
// The CEO dashboard uses commonSemanticSearchTools in default-tools.ts;
// backend agents need this factory to get the same capabilities.
// ============================================================================

export function makeSemanticSearchToolsImpl(tenantId: string) {
    return {
        async semanticSearchProducts(query: string, competitorId?: string, category?: string, inStockOnly?: boolean, limit?: number) {
            try {
                const { EzalAgent } = await import('@/server/services/ezal');
                const results = await EzalAgent.semanticSearch(tenantId, {
                    query,
                    competitorId,
                    category,
                    inStockOnly,
                    limit: Math.min(limit || 10, 50),
                });
                return { success: true, ...results };
            } catch (e: any) {
                return { success: false, error: `Semantic search failed: ${e.message}` };
            }
        },

        async semanticSearchInsights(query: string, severity?: string, type?: string, limit?: number) {
            try {
                const { EzalAgent } = await import('@/server/services/ezal');
                const results = await EzalAgent.searchIntel(tenantId, {
                    query,
                    severity,
                    type,
                    limit: limit || 10,
                });
                return { success: true, ...results };
            } catch (e: any) {
                return { success: false, error: `Insight search failed: ${e.message}` };
            }
        },

        async getCompetitorPriceHistory(productId: string, days?: number, limit?: number) {
            try {
                const { getPriceHistory } = await import('@/server/services/ezal/lancedb-store');
                const history = await getPriceHistory(tenantId, productId, {
                    days: days || 30,
                    limit: limit || 100,
                });
                return { success: true, count: history.length, productId, history };
            } catch (e: any) {
                return { success: false, error: `Price history failed: ${e.message}` };
            }
        },

        async getVectorStoreStats() {
            try {
                const { EzalAgent } = await import('@/server/services/ezal');
                const stats = await EzalAgent.getVectorStoreStats(tenantId);
                return { success: true, tenantId, ...stats };
            } catch (e: any) {
                return { success: false, error: `Stats failed: ${e.message}` };
            }
        },
    };
}
