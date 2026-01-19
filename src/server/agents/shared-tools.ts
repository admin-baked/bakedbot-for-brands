/**
 * Shared Tool Definitions for All Agents
 *
 * This file contains common tool definitions that all agents can use.
 * Import these into agent files to ensure consistent Context OS and Letta integration.
 */

import { z } from 'zod';

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
