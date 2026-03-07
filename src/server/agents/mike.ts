
import { AgentImplementation } from './harness';
import { ExecutiveMemory, ExecutiveTools, executiveAgent } from './executive';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import {
    contextOsToolDefs,
    lettaToolDefs,
    intuitionOsToolDefs,
    executiveContextToolDefs,
    AllSharedTools,
    ExecutiveContextTools,
    semanticSearchToolDefs,
    makeSemanticSearchToolsImpl,
} from './shared-tools';
import {
    getDelegatableAgentIds,
    AgentId,
} from './agent-definitions';

/**
 * Mike (Corporate CFO)
 *
 * Distinct from "Money Mike" (Street Banker/Sales).
 * Mike handles:
 * - High-level financial planning
 * - Investor relations
 * - Audits
 * - Treasury management
 *
 * Uses the Executive Wrapper for advanced tool access.
 */

export interface MikeTools extends Partial<AllSharedTools>, Partial<ExecutiveContextTools> {
    delegateTask?(personaId: string, task: string, context?: any): Promise<any>;
    sendEmail?(to: string, subject: string, content: string): Promise<any>;
}

export const mikeAgent: AgentImplementation<ExecutiveMemory, ExecutiveTools> = {
    ...executiveAgent,
    agentName: 'mike_exec',

    async initialize(brandMemory, agentMemory) {
        // Reuse base executive init logic but override instructions
        const baseMemory = await executiveAgent.initialize!(brandMemory, agentMemory);

        baseMemory.system_instructions = `
            You are Mike, the Chief Financial Officer (CFO) for ${brandMemory.brand_profile.name}.

            **YOUR IDENTITY:**
            - You are "Corporate Mike", not "Money Mike".
            - Money Mike is your tactical field agent who deals with everyday sales and margins.
            - You deal with STRATEGY, INVESTORS, AUDITS, and TREASURY.
            - You are professional, precise, and obsessed with EBITDA and Enterprise Value.

            **YOUR RELATIONSHIPS:**
            - **Leo (COO)**: Your operational partner — you align financial guardrails with his execution plans.
            - **Jack (CRO)**: You provide revenue forecasts; he drives the top-line growth.
            - **Money Mike**: Your field operative. You delegate tactical pricing analysis to him.
            - **Linus (CTO)**: You ensure his R&D spend has ROI.

            **CAPABILITIES (EXECUTIVE TIER):**
            - **Audit & Compliance**: You verify numbers.
            - **Calendar & Email**: getCalendarContext() for investor/board meetings; getEmailDigest() for financial signals.
            - **Market Search**: searchOpportunities() for cannabis FinTech and funding news.
            - **Drive & Email**: You produce and send formal financial reports.
            - **CRM Access**: You monitor MRR and LTV at a macro level.

            **OBJECTIVE:**
            - Ensure the company reaches $100k MRR efficiently.
            - Guard the burn rate.

            PROACTIVE FINANCE STANCE:
            When asked "what's our financial posture?", "any investor signals?", or "what should I focus on financially?":
            1. Call getEmailDigest() — scan for investor emails, payment failures, subscription changes
            2. Call searchOpportunities("cannabis industry funding round investment 2026") — surface fundraising news
            3. Call getCalendarContext() — flag any board/investor calls needing prep with financial briefs
            4. Present: burn rate risk, MRR trajectory, revenue signals from inbound

            FINANCIAL EMAIL SIGNALS (auto-flag these):
            - "invoice" or "payment" in email → flag for immediate review; check against outstanding AR
            - Investor or VC domain in email → high-priority: draft response, prep current financials summary
            - "subscription" cancel signal → alert Mrs. Parker for win-back; calculate LTV impact
            - Revenue milestone → draft internal announcement for Glenda to amplify
            - "audit" or "due diligence" → prepare data room summary; brief Leo

            CALENDAR MEETING PREP:
            Before any board or investor meeting from getCalendarContext():
            - Use searchOpportunities() to pull latest cannabis industry benchmarks
            - Prepare a financial snapshot: MRR, burn rate, runway estimate, top metrics
            - Recommend 3 talking points tailored to the meeting type

            OUTPUT RULES:
            - Use standard markdown headers (###) to separate sections like "Financial Strategy", "EBITDA Outlook", and "Treasury Directives".
            - This ensures your response renders correctly as rich cards.
            - Always cite the source of your data (tool output or database query).
        `;

        return baseMemory;
    },

    async act(brandMemory, agentMemory, targetId, tools: ExecutiveTools, stimulus?: string) {
        if (targetId === 'user_request' && stimulus) {
            const userQuery = stimulus;
            const delegatableAgents = getDelegatableAgentIds('mike_exec');

            const mikeSpecificTools = [
                {
                    name: "delegateTask",
                    description: "Delegate a task to a specialized agent. Route financial ops to Money Mike, tech spend analysis to Linus, revenue strategy to Jack.",
                    schema: z.object({
                        personaId: z.enum(delegatableAgents as [AgentId, ...AgentId[]]),
                        task: z.string().describe("Clear description of the task"),
                        context: z.any().optional(),
                    })
                },
                {
                    name: "sendEmail",
                    description: "Draft and send a formal financial report or investor update via email.",
                    schema: z.object({
                        to: z.string(),
                        subject: z.string(),
                        content: z.string(),
                    })
                },
            ];

            const toolsDef = [
                ...mikeSpecificTools,
                ...executiveContextToolDefs,
                ...contextOsToolDefs,
                ...lettaToolDefs,
                ...intuitionOsToolDefs,
                ...semanticSearchToolDefs,
            ];

            try {
                const { runMultiStepTask } = await import('./harness');

                const result = await runMultiStepTask({
                    userQuery,
                    systemInstructions: (agentMemory.system_instructions as string) || '',
                    toolsDef,
                    tools: {
                        ...tools,
                        ...makeSemanticSearchToolsImpl((brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id || 'unknown'),
                    },
                    model: 'claude-sonnet-4-5-20250929',
                    maxIterations: 5,
                });

                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'finance_task_complete',
                        result: result.finalResult,
                        metadata: { steps: result.steps },
                    },
                };
            } catch (e: any) {
                logger.error('[Mike CFO] Task failed', { error: e.message });
                return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'error', result: `Mike CFO Task failed: ${e.message}`, metadata: { error: e.message } },
                };
            }
        }

        return {
            updatedMemory: agentMemory,
            logEntry: {
                action: 'idle',
                result: 'Monitoring the burn rate. Show me the P&L.',
                metadata: {},
            },
        };
    },
};
