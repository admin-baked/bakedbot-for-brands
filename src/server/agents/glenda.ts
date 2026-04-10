/**
 * Glenda - Chief Marketing Officer (CMO)
 *
 * Specializes in brand awareness, organic traffic, social campaigns, and PR.
 * Polished, on-brand, creative. Focus on engagement and reach.
 */

import { AgentImplementation } from './harness';
import { AgentMemory } from './schemas';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { contextOsToolDefs, lettaToolDefs, intuitionOsToolDefs, executiveContextToolDefs, AllSharedTools, ExecutiveContextTools, semanticSearchToolDefs, makeSemanticSearchToolsImpl } from './shared-tools';
import { analyticsToolDefs, analyticsToolImplementations } from './tools/analytics-tools';
import {
    buildSquadRoster,
    getDelegatableAgentIds,
    AgentId
} from './agent-definitions';
import { buildIntegrationStatusSummaryForOrg } from '@/server/services/org-integration-status';

export interface GlendaTools extends Partial<AllSharedTools>, Partial<ExecutiveContextTools> {
    // Marketing Analytics
    getGA4Traffic?(): Promise<any>;
    getSearchConsoleStats?(): Promise<any>;
    getSocialMetrics?(platform: string): Promise<any>;

    // Content Creation
    generateContent?(type: string, topic: string, tone?: string): Promise<any>;
    generateSocialPost?(platform: string, message: string): Promise<any>;

    // Campaign Management
    createCampaign?(name: string, channels: string[], budget?: number): Promise<any>;
    getCampaignPerformance?(campaignId: string): Promise<any>;

    // SEO & Growth
    findSEOOpportunities?(): Promise<any>;
    auditPage?(url: string): Promise<any>;

    // Delegation
    delegateTask?(personaId: string, task: string, context?: any): Promise<any>;

    // Communication
    sendEmail?(to: string, subject: string, content: string): Promise<any>;
}

export const glendaAgent: AgentImplementation<AgentMemory, GlendaTools> = {
    agentName: 'glenda',

    async initialize(brandMemory, agentMemory) {
        logger.info(`[Glenda CMO] Initializing for ${brandMemory.brand_profile.name}...`);

        if (!agentMemory.objectives || (Array.isArray(agentMemory.objectives) && agentMemory.objectives.length === 0)) {
            agentMemory.objectives = [...brandMemory.priority_objectives];
        }

        // Build dynamic squad roster from agent-definitions (source of truth)
        const orgId = (brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id || '';
        const squadRoster = buildSquadRoster('glenda');
        const integrationStatus = await buildIntegrationStatusSummaryForOrg(orgId);

        agentMemory.system_instructions = `
            You are Glenda, the Chief Marketing Officer (CMO) for ${brandMemory.brand_profile.name}.
            Your mission is BRAND AWARENESS and ORGANIC GROWTH.

            PERSONA:
            - Polished, creative, on-brand
            - Data-informed but creatively driven
            - Focus on engagement, reach, and brand perception

            CORE RESPONSIBILITIES:
            1. **Brand Strategy**: Define and protect brand voice/identity
            2. **Content Marketing**: Drive organic traffic through quality content
            3. **Social Media**: Manage presence across platforms
            4. **PR & Communications**: Handle press, partnerships, announcements
            5. **Growth Marketing**: Expand reach and audience

            KEY METRICS:
            - Organic Traffic (GA4)
            - Social Engagement (likes, shares, comments)
            - Brand Mentions & Sentiment
            - Content Performance (CTR, time on page)
            - Email Open/Click Rates
            - Search Rankings (GSC)

            === AGENT SQUAD (Available for Delegation) ===
            ${squadRoster}

            === INTEGRATION STATUS ===
            ${integrationStatus}

            === GROUNDING RULES (CRITICAL) ===
            You MUST follow these rules to avoid hallucination:

            1. **ONLY report metrics you can actually query.** Use analytics tools for real data.
               - DO NOT fabricate traffic numbers, engagement rates, or social metrics.
               - If a tool returns no data, say "No data available" — don't make up values.

            2. **ONLY delegate to agents that exist in the AGENT SQUAD list above.**
               - DO NOT invent agents or give agents incorrect roles.
               - Craig = Marketer (campaigns). Day Day = SEO. Ezal = Competitive Intel.

            3. **For integrations NOT YET ACTIVE, be honest about limitations.**
               - Example: "Social media analytics integration isn't configured. Would you like me to help set it up?"
               - NEVER claim to have pulled metrics from platforms that aren't integrated.

            4. **When uncertain about metrics, ASK rather than assume.**
               - "I don't have current GA4 data. Should I set up analytics integration?"

            TOOLS AVAILABLE:
            - Analytics: GA4 traffic, Search Console stats, social metrics (where integrated)
            - Content: Generate blog posts, social content, email copy
            - Campaign: Create and track marketing campaigns
            - SEO: Find opportunities, audit pages
            - Delegate: Hand off tasks to squad members
            - Calendar: getCalendarContext() — align content drops with upcoming events and meetings
            - Email: getEmailDigest(sinceHours?) — spot PR inquiries, partnership proposals, media outreach
            - Search: searchOpportunities(query) — find trending cannabis topics and content opportunities

            PROACTIVE MARKETING STANCE:
            You proactively scan industry trends and incoming communications for marketing opportunities.
            When a user asks "what should we be marketing?", "what content do we need?", or "any PR opportunities?":
            1. Call searchOpportunities("cannabis marketing trends NY 2026") — find trending topics to capitalize on
            2. Call getEmailDigest() — spot inbound media/PR inquiries, partnership proposals, influencer reach-outs
            3. Call getCalendarContext() — align content calendar with upcoming meetings, launches, events
            4. Produce a marketing action plan: content ideas, campaign angles, PR pitches

            CONTENT OPPORTUNITY SIGNALS (auto-flag these from email):
            - "Press" or "media" or "journalist" in sender/subject → PR opportunity, draft response + media kit
            - "Partnership" or "collab" → potential co-marketing deal, brief Jack on revenue angle
            - "Event" or "conference" or "summit" → speaking/sponsorship opportunity for brand building
            - Industry news from searchOpportunities → brief Craig to create reactive content within 24h
            - Low organic traffic from analytics → brief Day Day for SEO sprint

            CONTENT CALENDAR ALIGNMENT:
            - Scan upcoming meetings (getCalendarContext) for announcement hooks
            - Coordinate blog/social drops 48h before major meetings or product launches
            - Route compliance-sensitive content to Deebo before publishing

            OUTPUT FORMAT:
            - Polished, on-brand language
            - Include engagement metrics (from REAL tool data)
            - Visual content recommendations
            - Hashtag and keyword suggestions
            - Always cite the source of your metrics

            COLLABORATION:
            - Work with Craig for campaign execution
            - Coordinate with Day Day for SEO optimization
            - Get competitive intel from Ezal
            - Align with Jack on lead generation goals
            - Consult Deebo for compliance on all content
            - Route technical issues to Linus (CTO)

            COMPLIANCE:
            - ALWAYS ensure cannabis marketing compliance
            - No health claims, age-appropriate targeting only
            - Include required disclaimers
            - Get Deebo approval before publishing
        `;

        // Connect to Hive Mind
        try {
            const { lettaBlockManager } = await import('@/server/services/letta/block-manager');
            const brandId = (brandMemory.brand_profile as any)?.id || (brandMemory.brand_profile as any)?.orgId || 'unknown';
            await lettaBlockManager.attachBlocksForRole(brandId, agentMemory.agent_id as string, 'executive');
            logger.info(`[Glenda:HiveMind] Connected to shared executive blocks.`);
        } catch (e) {
            logger.warn(`[Glenda:HiveMind] Failed to connect: ${e}`);
        }

        return agentMemory;
    },

    async orient(brandMemory, agentMemory, stimulus) {
        if (stimulus && typeof stimulus === 'string') return 'user_request';

        // Check for content calendar gaps
        const needsContent = (agentMemory as any).contentCalendar?.some(
            (item: any) => !item.content && new Date(item.scheduledDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        );
        if (needsContent) return 'content_gap';

        return null;
    },

    async act(brandMemory, agentMemory, targetId, tools: GlendaTools, stimulus?: string) {
        const semanticSearchEntityId = (brandMemory.brand_profile as any)?.id || (brandMemory.brand_profile as any)?.orgId || 'unknown';

        if (targetId === 'user_request' && stimulus) {
            const userQuery = stimulus;
            const brandId = (brandMemory.brand_profile as any)?.id || 'unknown';

            // Get delegatable agent IDs dynamically from registry
            const delegatableAgents = getDelegatableAgentIds('glenda');

            // Glenda-specific tools for marketing and brand management
            const glendaSpecificTools = [
                {
                    name: "getSocialMetrics",
                    description: "Get social media metrics for a platform (instagram, twitter, facebook, linkedin).",
                    schema: z.object({
                        platform: z.enum(['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube'])
                    })
                },
                {
                    name: "generateContent",
                    description: "Generate marketing content (blog post, email, landing page copy).",
                    schema: z.object({
                        type: z.enum(['blog', 'email', 'landing_page', 'press_release', 'newsletter']),
                        topic: z.string(),
                        tone: z.enum(['professional', 'casual', 'educational', 'promotional']).optional()
                    })
                },
                {
                    name: "generateSocialPost",
                    description: "Generate a social media post optimized for a specific platform.",
                    schema: z.object({
                        platform: z.enum(['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube']),
                        message: z.string().describe("Key message or topic for the post")
                    })
                },
                {
                    name: "createCampaign",
                    description: "Create a new marketing campaign across channels.",
                    schema: z.object({
                        name: z.string(),
                        channels: z.array(z.enum(['email', 'social', 'sms', 'blog', 'paid'])),
                        budget: z.number().optional()
                    })
                },
                {
                    name: "getCampaignPerformance",
                    description: "Get performance metrics for a marketing campaign.",
                    schema: z.object({
                        campaignId: z.string()
                    })
                },
                {
                    name: "auditPage",
                    description: "Run an SEO and content audit on a specific URL.",
                    schema: z.object({
                        url: z.string()
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
                    description: "Send an email (for PR outreach, partnership inquiries).",
                    schema: z.object({
                        to: z.string(),
                        subject: z.string(),
                        content: z.string()
                    })
                }
            ];

            // Combine Glenda-specific tools with shared + executive context (calendar/email/search)
            const toolsDef = [
                ...glendaSpecificTools,
                ...executiveContextToolDefs,
                ...analyticsToolDefs,
                ...contextOsToolDefs,
                ...lettaToolDefs,
                ...intuitionOsToolDefs,
                ...semanticSearchToolDefs
            ];
            
            // Merge implementations
            const allTools = { ...tools, ...analyticsToolImplementations, ...makeSemanticSearchToolsImpl(semanticSearchEntityId) };

            try {
                const { runMultiStepTask } = await import('./harness');

                const result = await runMultiStepTask({
                    userQuery,
                    systemInstructions: (agentMemory.system_instructions as string) || '',
                    toolsDef,
                    tools: allTools,
                    model: 'claude-sonnet-4-6',
                    maxIterations: 5
                });

                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'marketing_task_complete',
                        result: result.finalResult,
                        metadata: { steps: result.steps }
                    }
                };

            } catch (e: any) {
                return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'error', result: `Glenda CMO Task failed: ${e.message}`, metadata: { error: e.message } }
                };
            }
        }

        if (targetId === 'content_gap') {
            return {
                updatedMemory: agentMemory,
                logEntry: {
                    action: 'content_planning',
                    result: "Content calendar gap detected. Preparing content recommendations.",
                    metadata: { targetId }
                }
            };
        }

        return {
            updatedMemory: agentMemory,
            logEntry: {
                action: 'idle',
                result: 'Monitoring brand presence and engagement metrics.',
                metadata: {}
            }
        };
    }
};

export const glenda = glendaAgent;
