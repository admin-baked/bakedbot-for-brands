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
import { contextOsToolDefs, lettaToolDefs, intuitionOsToolDefs, executiveContextToolDefs, AllSharedTools, ExecutiveContextTools, semanticSearchToolDefs, makeSemanticSearchToolsImpl, learningLoopToolDefs } from './shared-tools';
import { crmToolDefs } from '../tools/crm-tools';
import {
    buildSquadRoster,
    getDelegatableAgentIds,
    AgentId
} from './agent-definitions';
import { buildIntegrationStatusSummaryForOrg } from '@/server/services/org-integration-status';
import { buildBulletSection, buildContextDisciplineSection, buildLearningLoopSection, joinPromptSections } from './prompt-kit';
import { makeLearningLoopToolsImpl } from '@/server/services/agent-learning-loop';

export interface JackTools extends Partial<AllSharedTools>, Partial<ExecutiveContextTools> {
    // CRM & Pipeline Tools
    crmListUsers?(search?: string, lifecycleStage?: string, limit?: number, signedUpAfter?: string): Promise<any>;
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
        const orgId = (brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id || '';
        const squadRoster = buildSquadRoster('jack');
        const integrationStatus = await buildIntegrationStatusSummaryForOrg(orgId);

        // Load NY10 pilot context for cross-org awareness (non-blocking)
        let ny10Context = '';
        try {
            const { buildNY10PilotContext } = await import('./ny10-context');
            ny10Context = await buildNY10PilotContext();
        } catch (e) {
            logger.warn(`[Jack:NY10] Failed to load pilot context: ${e}`);
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

            === AGENT SQUAD (Available for Delegation) ===
            ${squadRoster}

            === INTEGRATION STATUS ===
            ${integrationStatus}

            ${ny10Context}

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
            - Calendar: getCalendarContext() — see upcoming sales meetings, client calls, demos
            - Email: getEmailDigest(sinceHours?) — scan inbox for inbound leads, deal updates, partnership proposals
            - Search: searchOpportunities(query) — find market expansion opportunities, NY cannabis leads

            PROACTIVE REVENUE STANCE:
            You actively monitor calendar and email for revenue opportunities. When a user asks
            "what revenue opportunities are there?", "what should I focus on?", or "what's in the pipeline?":
            1. Call getEmailDigest() — scan for inbound lead inquiries, partnership proposals, deal updates
            2. Call getCalendarContext() — identify upcoming sales calls, demos; prep deal briefs
            3. Call searchOpportunities() — find expansion opportunities (new dispensaries, brands, markets)
            4. Present a prioritized revenue action list with estimated deal values

            EMAIL OPPORTUNITY SIGNALS (auto-flag these):
            - Inbound from a dispensary or brand → potential new client (update CRM lifecycle to 'contacted')
            - "Partnership" or "collaboration" in subject → route to relevant agent or book a call
            - "Invoice" or "payment" → alert Mike (CFO) for financial review
            - Existing customer email → flag for upsell assessment (delegate to Mrs. Parker)
            - Unknown sender with business domain → research via searchOpportunities(sender domain)

            CALENDAR MEETING PREP:
            Before every listed meeting, proactively provide:
            - Attendee background (use searchOpportunities if external contact)
            - Deal stage and recommended next step
            - 3 key talking points tailored to the attendee's role

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
        agentMemory.system_instructions = joinPromptSections(
            `You are Jack, the CRO for ${brandMemory.brand_profile.name}. Your job is pipeline velocity, MRR growth, and closing the right deals.`,
            `=== AGENT SQUAD (Available for Delegation) ===\n${squadRoster}`,
            `=== INTEGRATION STATUS ===\n${integrationStatus}`,
            ny10Context,
            buildBulletSection('OFFER STACK (BakedBot April 2026)', [
                '--- TRACK 1: ACCESS (wedge, proof, mission) ---',
                'Free Check-In: $0/mo — tablet/QR capture, welcome email, basic loyalty. Wedge product.',
                'Access Intel: $149/mo — competitor tracking, weekly intel digest, limited analytics.',
                'Access Retention: $499-$899/mo + $500-$1,000 setup — welcome playbook, QR capture, segmentation, lifecycle campaigns, compliance pre-checks.',
                '--- TRACK 2: OPERATOR (primary revenue engine) ---',
                'Operator Core: $2,500-$3,000 MRR + $1,500-$3,000 setup — welcome flow, 2-4 retention playbooks, campaign calendar, weekly reporting, 30-day activation, 45-60 day proof review.',
                'Operator Growth: $3,500-$4,000 MRR + $3,000-$5,000 setup — everything in Core + advanced segmentation, exec KPI reviews, competitor watch, expansion campaigns.',
                'Enterprise/White Label: $5,000+ MRR custom — MSOs, partner networks, custom governance.',
                '--- PATH TO $1M ARR: $83,333 MRR target ---',
                'Need ~21-24 Operator Core ($2,500-$3,000) OR ~21-24 Operator Growth ($3,500-$4,000) or blended mix.',
                'Access builds trust and pipeline. Operator builds the company.',
            ]),
            buildBulletSection('IDEAL CUSTOMER PROFILES (ICP)', [
                'Best for Access: first-time operators, social equity, very early-stage, low budget.',
                'Best for Operator Core: operators with real foot traffic, weak follow-up/CRM discipline, 1-10 stores.',
                'Best for Operator Growth: multi-location, regional ambition, want reporting + optimization + competitive intel.',
                'Worst fit: operators seeking licensing/launch capital, no traffic yet, cheapest-feature-bundle buyers.',
            ]),
            buildBulletSection('SALES NARRATIVE (follow this sequence)', [
                '1. You already have traffic.',
                '2. You are not capturing or activating enough of it.',
                '3. Your first-to-second visit system is weak or fragmented.',
                '4. Your existing stack does not close the loop.',
                '5. BakedBot can own that loop with software plus execution.',
                '6. We review the numbers with you every week.',
                'Operator is NOT sold as software seats. Sell it as a managed revenue activation system with setup, playbooks, reporting, and accountability.',
            ]),
            buildBulletSection('OBJECTION HANDLING', [
                '"We are too small" → Start with Access. Prove the wedge before buying Operator.',
                '"Why is this more expensive?" → Operator includes launch, playbooks, reporting, review cadence, and accountable execution — not just software.',
                '"We already use Dutchie/AIQ/Springbig" → BakedBot sits on top of your stack and owns the welcome and retention loop first.',
                '"We are social equity and underfunded" → We built Access for that reality. Start there, move into Operator when economics support it.',
            ]),
            buildBulletSection('KPI PACK (standard for every Operator account)', [
                'New customers captured, % entering welcome flow, welcome open rate, click rate.',
                'First-to-second visit conversion, repeat purchase rate, attributable revenue.',
                'Active list growth, time to first value, operator actions completed per week.',
                'If BakedBot cannot report these consistently, the premium offer will feel soft.',
            ]),
            buildContextDisciplineSection([
                'Use live CRM, inbox, calendar, and search signals instead of carrying a long sales playbook in memory.',
            ]),
            buildBulletSection('GROUNDING RULES (CRITICAL)', [
                'Only report revenue metrics, pipeline values, or forecasts you can actually query.',
                'Only delegate to agents in the squad roster and route work by specialty.',
                'If CRM or data integrations are inactive, say so and offer the next setup step.',
                'When a metric is uncertain, investigate instead of guessing.',
                'Always position Operator as a managed system, never as software credits or seats.',
            ]),
            buildLearningLoopSection('Jack', ['revenue', 'pipeline', 'outreach', 'forecast']),
            buildBulletSection('OPERATING STANCE', [
                'Use inbox, calendar, and search tools to surface the best next revenue move.',
                'Prep meetings with attendee context, deal stage, and concrete talking points.',
                'Coordinate with Craig for acquisition, Mrs. Parker for expansion, Pops for analytics, and Money Mike for pricing.',
                'Every qualified deal needs: a named owner, a launch plan, a 30-60 day proof model, and a KPI pack.',
            ]),
            buildBulletSection('OUTPUT RULES', [
                'Use precise numbers and currency formatting from real data.',
                'Focus on actionable next steps and deal movement.',
                'Use tables only when they clarify comparisons.',
            ]),
        );

        // Connect to Hive Mind
        try {
            const { lettaBlockManager } = await import('@/server/services/letta/block-manager');
            const brandId = (brandMemory.brand_profile as any)?.id || (brandMemory.brand_profile as any)?.orgId || 'unknown';
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
        const semanticSearchEntityId = (brandMemory.brand_profile as any)?.id || (brandMemory.brand_profile as any)?.orgId || 'unknown';

        if (targetId === 'user_request' && stimulus) {
            const userQuery = stimulus;
            const brandId = (brandMemory.brand_profile as any)?.id || 'unknown';

            // Get delegatable agent IDs dynamically from registry
            const delegatableAgents = getDelegatableAgentIds('jack');

            // Jack-specific tools for CRM and revenue management
            const jackSpecificTools = [
                {
                    name: "crmListUsers",
                    description: "List platform users from CRM. Users are returned newest-first. Use signedUpAfter to filter recent signups (e.g. pass an ISO date string for 'this week'). Use lifecycleStage to filter by funnel stage. Always call crmGetStats first for totals, then this to list individual users.",
                    schema: z.object({
                        search: z.string().optional().describe("Search by email, name, or org name"),
                        lifecycleStage: z.enum(['prospect', 'contacted', 'demo_scheduled', 'trial', 'customer', 'vip', 'churned', 'winback']).optional(),
                        limit: z.number().optional().describe("Max results (default 50)"),
                        signedUpAfter: z.string().optional().describe("ISO date string — only return users who signed up on/after this date. Use for 'this week' or 'this month' queries (e.g. '2026-02-18')")
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

            // Combine Jack-specific tools with shared + executive context (calendar/email/search)
            const toolsDef = [
                ...jackSpecificTools,
                ...executiveContextToolDefs,
                ...contextOsToolDefs,
                ...lettaToolDefs,
                ...learningLoopToolDefs,
                ...intuitionOsToolDefs,
                ...crmToolDefs,
                ...semanticSearchToolDefs
            ];

            try {
                const { runMultiStepTask } = await import('./harness');

                const result = await runMultiStepTask({
                    userQuery,
                    systemInstructions: (agentMemory.system_instructions as string) || '',
                    toolsDef,
                    tools: {
                        ...tools,
                        ...makeSemanticSearchToolsImpl(semanticSearchEntityId),
                        ...makeLearningLoopToolsImpl({
                            agentId: 'jack',
                            role: 'CRO',
                            orgId: semanticSearchEntityId,
                            brandId: brandId || semanticSearchEntityId,
                            defaultCategory: 'revenue',
                        }),
                    },
                    model: 'claude-sonnet-4-6',
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
