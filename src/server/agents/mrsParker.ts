// src/server/agents/mrsParker.ts
import { createServerClient } from "@/firebase/server-client";
import { EventType } from "@/types/domain";
import { FieldValue } from "firebase-admin/firestore";
import { deeboCheckMessage } from "./deebo";
import { blackleafService } from "@/lib/notifications/blackleaf-service";
import { logger } from '@/lib/logger';
import type { AgentImplementation } from '@/server/agents/harness';
import { runMultiStepTask } from '@/server/agents/harness';
import type { MrsParkerMemory } from './schemas';
import { deebo } from './deebo';
import { z } from 'zod';
import { contextOsToolDefs, lettaToolDefs, proactiveSearchToolDef, semanticSearchToolDefs, makeSemanticSearchToolsImpl, learningLoopToolDefs } from './shared-tools';
import { mrsParkerCrmToolDefs } from '../tools/crm-tools';
import { mrsParkerCampaignToolDefs } from '../tools/campaign-tools';
import {
    buildSquadRoster
} from './agent-definitions';
import { getOrgProfileWithFallback, buildMrsParkerContextBlock } from '@/server/services/org-profile';
import { buildIntegrationStatusSummaryForOrg } from '@/server/services/org-integration-status';
import { buildBulletSection, buildContextDisciplineSection, buildLearningLoopSection, joinPromptSections } from './prompt-kit';
import { makeLearningLoopToolsImpl } from '@/server/services/agent-learning-loop';

// ... (Existing Event Handling Code remains unchanged, replacing AgentImplementation)

// --- Tool Definitions ---

export interface MrsParkerTools {
  // Predict churn risk for a segment (Genkit analysis of frequency)
  predictChurnRisk(segmentId: string): Promise<{ riskLevel: 'high' | 'medium' | 'low'; atRiskCount: number }>;
  // Generate a loyalty campaign concept
  generateLoyaltyCampaign(segmentId: string, goal: string): Promise<{ subject: string; body: string }>;
  // Letta Collaboration (NEW)
  lettaUpdateCoreMemory?(section: 'persona' | 'human', content: string): Promise<any>;
  lettaMessageAgent?(toAgent: string, message: string): Promise<any>;
}

// --- Mrs. Parker Agent Implementation (Harness) ---

export const mrsParkerAgent: AgentImplementation<MrsParkerMemory, MrsParkerTools> = {
  agentName: 'mrs_parker',

  async initialize(brandMemory, agentMemory) {
    logger.info('[MrsParker] Initializing. Syncing segments...');

    const orgId = (brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id || '';
    const orgProfile = await getOrgProfileWithFallback(orgId).catch(() => null);
    const contextBlock = orgProfile ? buildMrsParkerContextBlock(orgProfile) : '';

    const brandName = (brandMemory as any)?.brand_profile?.name || 'your brand';
    if (!(brandMemory as any)?.brand_profile?.name) {
        logger.warn('[MrsParker] Missing brand_profile.name in brand memory; using fallback.');
    }

    // Build dynamic context from agent-definitions (source of truth)
    const squadRoster = buildSquadRoster('mrs_parker');
    const integrationStatus = await buildIntegrationStatusSummaryForOrg(orgId);

    agentMemory.system_instructions = `
        You are Mrs. Parker, the Customer Retention Manager for ${brandName}.
        Your job is to make every customer feel like a VIP and bring them back.

        CORE PRINCIPLES:
        1. **Southern Hospitality**: Warm, welcoming, and personal.
        2. **Churn Prevention**: Notice when people stop visiting.
        3. **Surprise & Delight**: Reward loyalty generously (but sustainably).
        4. **Collaboration**: Work with the team to execute your ideas.

        === AGENT SQUAD (For Collaboration) ===
        ${squadRoster}

        === INTEGRATION STATUS ===
        ${integrationStatus}

        === GROUNDING RULES (CRITICAL) ===
        You MUST follow these rules to avoid hallucination:

        1. **ONLY reference customer data you can actually access.**
           - If no synced customer data is available, be transparent.
           - Don't claim to know customer visit history without data.

        2. **Use the CRM tools before saying data is unavailable.**
           - For questions about how many customers have emails or what the email capture rate is, call getCustomerEmailCoverage.
           - For VIPs or top customers, call getTopCustomers or lookupCustomer.

        3. **Check INTEGRATION STATUS before naming systems.**
           - If Alleaves POS is listed as active, do not say the organization is on Dutchie.
           - Offer to help set up missing integrations only when the summary says they are not integrated.

        4. **When collaborating with other agents, use the AGENT SQUAD list.**
           - Craig = Marketing (for campaign execution). Pops = Analytics.

        5. **When uncertain about customer status, ASK.**
           - "I don't have enough synced customer records to verify that yet."

        Tone: Maternal, warm, caring ("Sugar", "Honey", "Dear").

        PROACTIVE RETENTION STANCE:
        When a user asks "how are we doing with retention?", "who might we lose?", "what should I focus on?":
        1. Call predictChurnRisk() — identify at-risk segments right away
        2. Call searchOpportunities("cannabis dispensary customer retention winback strategies 2026") — find what's working industry-wide
        3. For at-risk segments: propose a concrete winback campaign via generateLoyaltyCampaign
        4. Delegate execution to Craig once the strategy is approved

        OPPORTUNITY SIGNALS (auto-act on these):
        - "We haven't seen [customer type] lately" → predictChurnRisk for that segment → winback campaign
        - "It's been slow" → searchOpportunities("cannabis loyalty program ideas") → propose surprise-and-delight initiative
        - Birthday season / holiday approaching → propose personalized campaign for VIP segment via sendPersonalizedEmail
        - Craig reports a new campaign launched → suggest a complementary retention follow-up sequence

        OUTPUT RULES:
        - Use standard markdown headers (###) for sections.
        - Always be honest about data limitations.
        ${contextBlock}
    `;
    agentMemory.system_instructions = joinPromptSections(
        `You are Mrs. Parker, the Customer Retention Manager for ${brandName}. Protect loyalty, spot churn risk early, and turn customer care into repeat visits.`,
        `=== AGENT SQUAD (For Collaboration) ===\n${squadRoster}`,
        `=== INTEGRATION STATUS ===\n${integrationStatus}`,
        contextBlock,
        buildContextDisciplineSection([
            'Keep the prompt centered on customer care, retention judgment, and data honesty. Pull detailed winback tactics from tools and search when needed.',
        ]),
        buildBulletSection('GROUNDING RULES (CRITICAL)', [
            'Only reference customer history, email coverage, or VIP status you actually verified with tools.',
            'Use integration status before naming systems or claiming data availability.',
            'Use the squad roster for campaign, analytics, and compliance collaboration.',
        ]),
        buildLearningLoopSection('Mrs. Parker', ['retention', 'winback', 'loyalty', 'customer-care']),
        buildBulletSection('RETENTION SKILL FRAMEWORKS (apply when relevant)', [
            // Skill 9: Re-engagement Campaign Builder
            'RE-ENGAGEMENT CAMPAIGN (Skill 9) — For cold subscribers or lapsed customers (inactive 30-90+ days): build a 3-email win-back sequence. Email 1: Acknowledge absence without guilt, offer real value (not a discount). Email 2: Social proof or what they missed, clear benefit. Email 3: Honest sunset email — low-pressure farewell, final CTA, respect their choice. Each email: subject line, preview text, full body, timing. Tone: warm, personal, never desperate. End with a sunset email for those who remain unresponsive — it protects list hygiene and occasionally triggers a reply.',
            // Skill 25: Churn Prevention Playbook
            'CHURN PREVENTION PLAYBOOK (Skill 25) — When building a full retention system: output these sections: (1) Early Warning Signals — usage/visit drop triggers at 30, 60, 90 days with intervention thresholds. (2) Intervention Messages by Stage: usage drop = re-engagement email with specific value reminder | support friction = proactive outreach template | pricing concern = response framework + offer options | competitor evaluation = differentiation message with proof. (3) Cancellation Flow — what to say at each step to attempt recovery: acknowledge frustration → offer a pause/downgrade → share one proof point → make cancelling genuinely easy. (4) Win-back Campaign — 3-email sequence for already-churned customers: timing (Day 0, Day 14, Day 45), angle per email, offer only in Email 3. Tone throughout: human, warm, zero guilt-tripping.',
        ]),
        buildBulletSection('OPERATING FOCUS', [
            'Lead with warmth, clear retention risk, and the next concrete customer action.',
            'Use churn tools, CRM tools, and market search to validate the segment before recommending a campaign.',
            'Keep output honest, structured, and ready for execution handoff.',
        ]),
    );

    // === HIVE MIND INIT ===
    try {
        const { lettaBlockManager } = await import('@/server/services/letta/block-manager');
        const brandId = (brandMemory.brand_profile as any)?.id || (brandMemory.brand_profile as any)?.orgId || 'unknown';
        await lettaBlockManager.attachBlocksForRole(brandId, agentMemory.agent_id as string, 'brand');
        logger.info(`[MrsParker:HiveMind] Connected to shared retention blocks.`);
    } catch (e) {
        logger.warn(`[MrsParker:HiveMind] Failed to connect: ${e}`);
    }

    return agentMemory;
  },

  async orient(brandMemory, agentMemory, stimulus) {
    if (stimulus && typeof stimulus === 'string') return 'user_request';

    const runningJourney = agentMemory.journeys.find(j => j.status === 'running');
    if (runningJourney) return `journey:${runningJourney.id}`;
    return null;
  },

  async act(brandMemory, agentMemory, targetId, tools: MrsParkerTools, stimulus?: string) {
    const semanticSearchEntityId = (brandMemory.brand_profile as any)?.id || (brandMemory.brand_profile as any)?.orgId || 'unknown';

    // === SCENARIO A: User Request (The "Planner" Flow) ===
    if (targetId === 'user_request' && stimulus) {
        const userQuery = stimulus;
        const orgId = (brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id || 'unknown';

        // Tool Definitions (Agent-specific + Shared Context OS & Letta tools)
        const mrsParkerSpecificTools = [
            {
                name: "predictChurnRisk",
                description: "Predict churn probability for a customer or segment.",
                schema: z.object({
                    segmentId: z.string().optional()
                })
            },
            {
                name: "generateLoyaltyCampaign",
                description: "Create a loyalty campaign with specific goals.",
                schema: z.object({
                    segmentId: z.string().optional(),
                    goal: z.string()
                })
            },
            {
                name: "sendPersonalizedEmail",
                description: "Send a compliant, personalized email to a customer.",
                schema: z.object({
                    customerId: z.string(),
                    emailType: z.enum(['welcome', 'onboarding', 'promotion', 'winback']),
                    context: z.record(z.any()).optional()
                })
            }
        ];

        // Combine agent-specific tools with shared Context OS, Letta, and proactive search tools
        const toolsDef = [...mrsParkerSpecificTools, proactiveSearchToolDef, ...learningLoopToolDefs, ...contextOsToolDefs, ...lettaToolDefs, ...mrsParkerCrmToolDefs, ...mrsParkerCampaignToolDefs, ...semanticSearchToolDefs];

        try {
            // === MULTI-STEP PLANNING (Run by Harness + Gemini 3) ===
            const result = await runMultiStepTask({
                userQuery,
                systemInstructions: (agentMemory.system_instructions as string) || '',
                toolsDef,
                tools: {
                    ...tools,
                    ...makeSemanticSearchToolsImpl(semanticSearchEntityId),
                    ...makeLearningLoopToolsImpl({
                        agentId: 'mrs_parker',
                        role: 'Retention',
                        orgId,
                        brandId: semanticSearchEntityId,
                        defaultCategory: 'retention',
                    }),
                    searchOpportunities: async (query: string) => {
                        try {
                            const { searchWeb, formatSearchResults } = await import('@/server/tools/web-search');
                            const results = await searchWeb(`cannabis customer retention ${query}`);
                            return await formatSearchResults(results);
                        } catch (e: any) {
                            return { error: e.message };
                        }
                    },
                },
                model: 'googleai/gemini-3-pro-preview', // Context-heavy customer history
                maxIterations: 5
            });

            return {
                updatedMemory: agentMemory,
                logEntry: {
                    action: 'mrs_parker_task_complete',
                    result: result.finalResult,
                    metadata: { steps: result.steps }
                }
            };

            } catch (e: any) {
                 return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'error', result: `Mrs Parker Task failed: ${e.message}`, metadata: { error: e.message } }
                };
            }
        }

        return {
            updatedMemory: agentMemory,
            logEntry: {
                action: 'idle',
                result: 'Mrs. Parker waiting for a guest.'
            }
        };
    }
};

export async function handleMrsParkerEvent(orgId: string, eventId: string) {
  logger.info(`[MrsParker] Handled event ${eventId} for org ${orgId} (Stub)`);
}
