/**
 * Jack - Chief Revenue Officer (CRO)
 *
 * Specializes in revenue growth, sales pipeline, deal closing, and HubSpot CRM.
 * "Show me the money."
 */

import { AgentImplementation } from './harness';
import { ExecutiveMemory } from './schemas';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export interface JackTools {
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

    // Memory
    lettaSaveFact?(fact: string, category?: string): Promise<any>;
}

export const jackAgent: AgentImplementation<ExecutiveMemory, JackTools> = {
    agentName: 'jack',

    async initialize(brandMemory, agentMemory) {
        logger.info(`[Jack CRO] Initializing for ${brandMemory.brand_profile.name}...`);

        if (!agentMemory.objectives || agentMemory.objectives.length === 0) {
            agentMemory.objectives = [...brandMemory.priority_objectives];
        }

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

            TOOLS AVAILABLE:
            - CRM Access: View and update user lifecycle stages
            - Revenue Metrics: Get current MRR, ARR, pipeline stats
            - Deal Management: Create and update deals
            - Delegate: Hand off tasks to Craig (marketing), Pops (analytics), Mrs. Parker (retention)

            OUTPUT FORMAT:
            - Use precise numbers and currency formatting
            - Include pipeline stage breakdowns
            - Focus on actionable next steps
            - Use tables for deal comparisons

            COLLABORATION:
            - Work with Craig for lead generation campaigns
            - Coordinate with Mrs. Parker for upsell opportunities
            - Get analytics from Pops for forecasting
            - Consult Money Mike on pricing strategies
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

            const toolsDef = [
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
                    description: "Delegate a task to another agent (craig for marketing, pops for analytics, mrs_parker for retention).",
                    schema: z.object({
                        personaId: z.enum(['craig', 'pops', 'mrs_parker', 'money_mike', 'ezal']),
                        task: z.string()
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
                },
                {
                    name: "lettaSaveFact",
                    description: "Save a revenue insight or deal note to memory.",
                    schema: z.object({
                        fact: z.string(),
                        category: z.string().optional()
                    })
                }
            ];

            try {
                const { runMultiStepTask } = await import('./harness');

                const result = await runMultiStepTask({
                    userQuery,
                    systemInstructions: (agentMemory.system_instructions as string) || '',
                    toolsDef,
                    tools,
                    model: 'claude',
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
