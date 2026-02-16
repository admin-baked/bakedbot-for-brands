
import { AgentImplementation } from './harness';
import { DeeboMemory } from './schemas';
import { logger } from '@/lib/logger';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { deebo } from './deebo'; // Import the SDK we just saw
import {
    buildSquadRoster,
    buildIntegrationStatusSummary
} from './agent-definitions';

// --- Tool Definitions ---

export interface DeeboTools {
    // Check if content is compliant with local laws
    checkCompliance(content: string, jurisdiction: string, channel: string): Promise<{ status: 'pass' | 'fail' | 'warning'; violations: string[]; suggestions: string[] }>;
    // Verify age of a customer
    verifyAge(dob: string, jurisdiction: string): Promise<{ allowed: boolean; reason?: string }>;
}

// --- Deebo Agent Implementation ---

export const deeboAgent: AgentImplementation<DeeboMemory, DeeboTools> = {
    agentName: 'deebo',

    async initialize(brandMemory, agentMemory) {
        logger.info('[Deebo] Initializing. Loading compliance rule packs...');

        // Build dynamic context from agent-definitions (source of truth)
        const squadRoster = buildSquadRoster('deebo');
        const integrationStatus = buildIntegrationStatusSummary();

        agentMemory.system_instructions = `
            You are Deebo, the Compliance Enforcer for ${brandMemory.brand_profile.name}.
            Your job is to keep the brand out of legal trouble and enforce advertising regulations.

            CORE PRINCIPLES:
            1. **No Mercy**: If it breaks the law, kill it.
            2. **Protect the License**: Compliance > Profit.
            3. **Clear Rules**: Don't guess. Check the code.

            === AGENT SQUAD (For Collaboration) ===
            ${squadRoster}

            === INTEGRATION STATUS ===
            ${integrationStatus}

            === GROUNDING RULES (CRITICAL) ===
            You MUST follow these rules to avoid hallucination:

            1. **Use checkCompliance tool for REAL compliance checks.**
               - DO NOT make up violation types or legal codes.
               - If uncertain about a rule, say "I need to verify this regulation."

            2. **Be jurisdiction-specific.**
               - Cannabis laws vary by state. Always ask for or confirm jurisdiction.
               - Don't claim to know rules for jurisdictions you haven't loaded.

            3. **NEVER approve content without actually checking it.**
               - Always run the compliance check tool, don't just say "looks fine."

            4. **When collaborating with other agents, use the AGENT SQUAD list.**
               - Craig = Marketing (for content reviews). Glenda = CMO (brand messaging).

            5. **When uncertain, err on the side of caution.**
               - "I recommend holding this content for legal review."

            KEY COMPLIANCE RULES (Cannabis Marketing):
            - No medical claims without FDA approval
            - No appeal to minors (imagery, language, cartoon characters)
            - No false statements about effects
            - Age-gating required on all digital content
            - Jurisdiction-specific disclosure requirements

            Tone: Stern, authoritative, no-nonsense. "That's a violation."

            OUTPUT RULES:
            - Use standard markdown headers (###) for sections.
            - Always cite the specific regulation being violated.
            - Provide clear remediation steps.
        `;

        // === HIVE MIND INIT ===
        try {
            const { lettaBlockManager } = await import('@/server/services/letta/block-manager');
            const brandId = (brandMemory.brand_profile as any)?.id || 'unknown';
            await lettaBlockManager.attachBlocksForRole(brandId, agentMemory.agent_id as string, 'brand');
            logger.info(`[Deebo:HiveMind] Connected to shared compliance blocks.`);
        } catch (e) {
            logger.warn(`[Deebo:HiveMind] Failed to connect: ${e}`);
        }

        return agentMemory;
    },

    async orient(brandMemory, agentMemory, stimulus) {
        if (stimulus && typeof stimulus === 'string') return 'user_request';
        // Deebo is reactive mainly, but could check for 'pending_review' items
        return null;
    },

    async act(brandMemory, agentMemory, targetId, tools: DeeboTools, stimulus?: string) {
         // === SCENARIO A: User Request (The "Planner" Flow) ===
        if (targetId === 'user_request' && stimulus) {
            const userQuery = stimulus;
            
            // 1. Tool Definitions
            const toolsDef = [
                {
                    name: "checkCompliance",
                    description: "Audit text or content for legal violations.",
                    schema: z.object({
                        content: z.string(),
                        jurisdiction: z.string().describe("State code e.g. WA, CA"),
                        channel: z.string().describe("e.g. sms, email, website")
                    })
                },
                {
                    name: "verifyAge",
                    description: "Check if a customer is old enough.",
                    schema: z.object({
                        dob: z.string().describe("YYYY-MM-DD"),
                        jurisdiction: z.string()
                    })
                },
                {
                    name: "lettaSaveFact",
                    description: "Save a compliance violation or legal precedent to memory.",
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
                    tools: tools,
                    model: 'claude-sonnet-4-5-20250929', // Use Claude for strict compliance logic
                    maxIterations: 3
                });

                return {
                     updatedMemory: agentMemory,
                     logEntry: {
                         action: 'task_completed',
                         result: result.finalResult,
                         metadata: { steps: result.steps }
                     }
                };

            } catch (e: any) {
                 return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'error', result: `Planning failed: ${e.message}`, metadata: { error: e.message } }
                };
            }
        }
    
        return {
            updatedMemory: agentMemory,
            logEntry: {
                 action: 'no_action',
                 result: "Nothing to report.",
                 metadata: {}
            }
        };
    }
};
