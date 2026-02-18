/**
 * Jack - Chief Revenue Officer (CRO)
 *
 * Specializes in revenue growth, sales pipeline, deal closing, and HubSpot CRM.
 * "Show me the money."
 */

import { AgentImplementation } from './harness';
import { AgentMemory } from './schemas';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { contextOsToolDefs, lettaToolDefs, intuitionOsToolDefs, AllSharedTools } from './shared-tools';
import { crmToolDefs } from '../tools/crm-tools';
import {
    buildSquadRoster,
    getDelegatableAgentIds,
    buildIntegrationStatusSummary,
    AgentId
} from './agent-definitions';

export interface JackTools extends Partial<AllSharedTools> {
    // CRM & Pipeline Tools
    crmListUsers?(search?: string, lifecycleStage?: string, limit?: number): Promise<any>;
    crmGetStats?(): Promise<any>;
    crmUpdateLifecycle?(userId: string, stage: string): Promise<any>;

    // Revenue Analysis
    getRevenueMetrics?(period: 'day' | 'week' | 'month'): Promise<any>;
    forecastMRR?(months: number): Promise<any>;

    // Deal Management
    createDeal?(name: string, value: number, stage: string): Promise<any>;
    updateDealStage?(dealId: string, stage: string): Promise<any>;

    // Delegation
    delegateTask?(personaId: string, task: string, context?: any): Promise<any>;

    // Communication
    sendEmail?(to: string, subject: string, content: string): Promise<any>;
}

export const jackAgent: AgentImplementation<AgentMemory, JackTools> = {
    agentName: 'jack',

    async initialize(brandMemory, agentMemory) {
        logger.info(`[Jack CRO] Initializing for ${brandMemory.brand_profile.name}...`);

        if (!agentMemory.objectives || (Array.isArray(agentMemory.objectives) && agentMemory.objectives.length === 0)) {
            agentMemory.objectives = [...brandMemory.priority_objectives];
        }

        // Build dynamic squad roster from agent-definitions (source of truth)
        const squadRoster = buildSquadRoster('jack');
        const integrationStatus = buildIntegrationStatusSummary();

        agentMemory.system_instructions = `
            You are Jack, the Chief Revenue Officer (CRO) for ${brandMemory.brand_profile.name}.
            Your sole focus is REVENUE GROWTH.

            PERSONA:
            - Aggressive, revenue-focused, data-driven
            - "Show me the money" mentality
            - Close deals, grow MRR, reduce churn

            CORE RESPONSIBILITIES:
            1. **Pipeline Management**: Track deals from lead to close
            2. **MRR Growth**: Hit monthly recurring revenue targets
            3. **Sales Strategy**: Identify high-value opportunities
            4. **Deal Closing**: Push deals across the finish line
            5. **Revenue Forecasting**: Predict and plan for growth

            KEY METRICS:
            - MRR (Monthly Recurring Revenue)
            - ARR (Annual Recurring Revenue)
            - Pipeline Value
            - Win Rate
            - Sales Cycle Length
            - Customer Acquisition Cost (CAC)
            - Lifetime Value (LTV)

            === AGENT SQUAD (Available for Delegation) ===
            ${squadRoster}

            === INTEGRATION STATUS ===
            ${integrationStatus}

            === GROUNDING RULES (CRITICAL) ===
            You MUST follow these rules to avoid hallucination:

            1. **ONLY report metrics you can actually query.** Use CRM/Revenue tools to get real data.
               - DO NOT fabricate MRR numbers, pipeline values, or percentages.
               - If a tool returns no data, say "No data available" — don't make up values.

            2. **ONLY delegate to agents that exist in the AGENT SQUAD list above.**
               - DO NOT invent agents or give agents incorrect roles.
               - Craig = Marketer. Pops = Analytics. Mrs. Parker = Retention.

            3. **For integrations NOT YET ACTIVE (like HubSpot CRM), be honest.**
               - Example: "HubSpot CRM integration isn't configured yet. Would you like me to help set it up?"
               - NEVER claim to have pulled data from systems that aren't integrated.

            4. **When uncertain about a metric, ASK rather than assume.**
               - "I don't have current pipeline data. Should I set up CRM integration?"

            TOOLS AVAILABLE:
            - CRM Access: View and update user lifecycle stages (requires integration)
            - Revenue Metrics: Get current MRR, ARR, pipeline stats
            - Deal Management: Create and update deals
            - Delegate: Hand off tasks to squad members

            OUTPUT FORMAT:
            - Use precise numbers and currency formatting (from REAL tool data)
            - Include pipeline stage breakdowns
            - Focus on actionable next steps
            - Use tables for deal comparisons
            - Always cite the source of your data

            COLLABORATION:
            - Work with Craig for lead generation campaigns
            - Coordinate with Mrs. Parker for upsell opportunities
            - Get analytics from Pops for forecasting
            - Consult Money Mike on pricing strategies
            - Route technical issues to Linus (CTO)
            - Route compliance questions to Deebo
        `;

        // Connect to Hive Mind
        try {
            const { lettaBlockManager } = await import('@/server/services/letta/block-manager');
            const brandId = (brandMemory.brand_profile as any)?.id || 'unknown';
            await lettaBlockManager.attachBlocksForRole(brandId, agentMemory.agent_id as string, 'executive');
            logger.info(`[Jack:HiveMind] Connected to shared executive blocks.`);
        } catch (e) {
            logger.warn(`[Jack:HiveMind] Failed to connect: ${e}`);
        }

        return agentMemory;
    },

    async orient(brandMemory, agentMemory, stimulus) {
        if (stimulus && typeof stimulus === 'string') return 'user_request';

        // Check for stalled deals
        const stalledDeal = (agentMemory as any).deals?.find(
            (d: any) => d.stage === 'negotiation' && d.daysSinceUpdate > 7
        );
        if (stalledDeal) return 'follow_up_deal';

        return null;
    },

    async act(brandMemory, agentMemory, targetId, tools: JackTools, stimulus?: string) {
        if (targetId === 'user_request' && stimulus) {
            const userQuery = stimulus;

            // Get delegatable agent IDs dynamically from registry
            const delegatableAgents = getDelegatableAgentIds('jack');

            // Jack-specific tools for CRM and revenue management
            const jackSpecificTools = [
                {
                    name: "crmListUsers",
                    description: "List users from CRM by search or lifecycle stage (prospect, contacted, demo_scheduled, trial, customer, vip, churned).",
                    schema: z.object({
                        search: z.string().optional(),
                        lifecycleStage: z.enum(['prospect', 'contacted', 'demo_scheduled', 'trial', 'customer', 'vip', 'churned', 'winback']).optional(),
                        limit: z.number().optional()
                    })
                },
                {
                    name: "crmGetStats",
                    description: "Get high-level CRM stats including MRR, total users, conversion rates.",
                    schema: z.object({})
                },
                {
                    name: "crmUpdateLifecycle",
                    description: "Update a user's lifecycle stage in the CRM.",
                    schema: z.object({
                        userId: z.string(),
                        stage: z.enum(['prospect', 'contacted', 'demo_scheduled', 'trial', 'customer', 'vip', 'churned', 'winback'])
                    })
                },
                {
                    name: "getRevenueMetrics",
                    description: "Get revenue metrics for a given period.",
                    schema: z.object({
                        period: z.enum(['day', 'week', 'month'])
                    })
                },
                {
                    name: "forecastMRR",
                    description: "Forecast MRR for the next N months based on current trends.",
                    schema: z.object({
                        months: z.number().default(3)
                    })
                },
                {
                    name: "delegateTask",
                    description: "Delegate a task to another agent in the squad. Route to the right specialist based on their expertise.",
                    schema: z.object({
                        personaId: z.enum(delegatableAgents as [AgentId, ...AgentId[]]),
                        task: z.string().describe("Clear description of the task to delegate"),
                        context: z.any().optional().describe("Additional context for the task")
                    })
                },
                {
                    name: "sendEmail",
                    description: "Send an email to a prospect or customer.",
                    schema: z.object({
                        to: z.string(),
                        subject: z.string(),
                        content: z.string()
                    })
                }
            ];

            // Combine Jack-specific tools with shared Context OS, Letta Memory, and Intuition OS tools
            const toolsDef = [
                ...jackSpecificTools,
                ...contextOsToolDefs,
                ...lettaToolDefs,
                ...intuitionOsToolDefs,
                ...crmToolDefs
            ];

            try {
                const { runMultiStepTask } = await import('./harness');

                const result = await runMultiStepTask({
                    userQuery,
                    systemInstructions: (agentMemory.system_instructions as string) || '',
                    toolsDef,
                    tools,
                    model: 'claude-sonnet-4-5-20250929',
                    maxIterations: 5
                });

                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'revenue_task_complete',
                        result: result.finalResult,
                        metadata: { steps: result.steps }
                    }
                };

            } catch (e: any) {
                return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'error', result: `Jack CRO Task failed: ${e.message}`, metadata: { error: e.message } }
                };
            }
        }

        if (targetId === 'follow_up_deal') {
            return {
                updatedMemory: agentMemory,
                logEntry: {
                    action: 'deal_follow_up',
                    result: "Stalled deal detected. Preparing follow-up sequence.",
                    metadata: { targetId }
                }
            };
        }

        return {
            updatedMemory: agentMemory,
            logEntry: {
                action: 'idle',
                result: 'Reviewing pipeline. Show me the money.',
                metadata: {}
            }
        };
    }
};

export const jack = jackAgent;
