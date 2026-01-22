// src/server/agents/mrsParker.ts
import { createServerClient } from "@/firebase/server-client";
import { EventType } from "@/types/domain";
import { FieldValue } from "firebase-admin/firestore";
import { deeboCheckMessage } from "./deebo";
import { blackleafService } from "@/lib/notifications/blackleaf-service";
import { logger } from '@/lib/logger';
import { AgentImplementation } from './harness';
import { MrsParkerMemory } from './schemas';
import { deebo } from './deebo';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { contextOsToolDefs, lettaToolDefs } from './shared-tools';
import {
    buildSquadRoster,
    buildIntegrationStatusSummary
} from './agent-definitions';

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

    // Build dynamic context from agent-definitions (source of truth)
    const squadRoster = buildSquadRoster('mrs_parker');
    const integrationStatus = buildIntegrationStatusSummary();

    agentMemory.system_instructions = `
        You are Mrs. Parker, the Customer Retention Manager for ${brandMemory.brand_profile.name}.
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
           - If no loyalty program is integrated (Alpine IQ, Springbig), be transparent.
           - Don't claim to know customer visit history without data.

        2. **Check INTEGRATION STATUS for loyalty/CRM access.**
           - Offer to help set up missing integrations.

        3. **When collaborating with other agents, use the AGENT SQUAD list.**
           - Craig = Marketing (for campaign execution). Pops = Analytics.

        4. **When uncertain about customer status, ASK.**
           - "I don't have purchase history. Would you like to connect a loyalty program?"

        Tone: Maternal, warm, caring ("Sugar", "Honey", "Dear").

        OUTPUT RULES:
        - Use standard markdown headers (###) for sections.
        - Always be honest about data limitations.
    `;

    // === HIVE MIND INIT ===
    try {
        const { lettaBlockManager } = await import('@/server/services/letta/block-manager');
        const brandId = (brandMemory.brand_profile as any)?.id || 'unknown';
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
    // === SCENARIO A: User Request (The "Planner" Flow) ===
    if (targetId === 'user_request' && stimulus) {
        const userQuery = stimulus;

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

        // Combine agent-specific tools with shared Context OS and Letta tools
        const toolsDef = [...mrsParkerSpecificTools, ...contextOsToolDefs, ...lettaToolDefs];

        try {
            // === MULTI-STEP PLANNING (Run by Harness + Gemini 3) ===
            const { runMultiStepTask } = await import('./harness');
            
            const result = await runMultiStepTask({
                userQuery,
                systemInstructions: (agentMemory.system_instructions as string) || '',
                toolsDef,
                tools,
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


