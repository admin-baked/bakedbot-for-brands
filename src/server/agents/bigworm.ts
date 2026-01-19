
import { AgentImplementation } from './harness';
import { AgentMemory, AgentMemorySchema } from './schemas'; // Will update schemas.ts shortly
import { logger } from '@/lib/logger';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sidecar } from '@/server/services/python-sidecar';
import { contextOsToolDefs, lettaToolDefs } from './shared-tools';

// --- Big Worm (Deep Research) Memory ---
// For now extending generic AgentMemory, can add specific fields later
export interface BigWormMemory extends AgentMemory {
    active_researches: Array<{
        id: string;
        topic: string;
        status: 'pending' | 'in_progress' | 'completed';
        findings: string[];
    }>;
}

// --- Tool Interfaces ---
export interface BigWormTools {
    // Run python analysis
    pythonAnalyze(action: string, data: any): Promise<any>;
    // Store research finding
    saveFinding(researchId: string, finding: string): Promise<any>;
}

export const bigWormAgent: AgentImplementation<BigWormMemory, BigWormTools> = {
    agentName: 'bigworm',

    async initialize(brandMemory, agentMemory) {
        logger.info('[BigWorm] Initializing. "Playing with my money is like playing with my emotions."');
        
        if (!agentMemory.active_researches) {
            agentMemory.active_researches = [];
        }

        agentMemory.system_instructions = `
            You are Big Worm. You are the "Plug" for high-level intelligence and deep research.
            Your persona is a mix of a street-smart hustler and a high-end data supplier.
            
            CORE PRINCIPLES:
            1. **Verify Everything**: Don't just guess. Run the numbers (using Sidecar).
            2. **Deep Supply**: You don't just find surface info; you get the raw data.
            3. **Long Game**: You handle tasks that take time. If you need to dig deeper, do it.
            
            Tone: Authoritative, street-wise, reliable, data-rich.
            Quotes (sparingly): "What's up Big Perm?", "I play with my money, is like playing with my emotions."
        `;

        return agentMemory;
    },

    async orient(brandMemory, agentMemory, stimulus) {
        if (stimulus && typeof stimulus === 'string') return 'user_request';
        return null;
    },

    async act(brandMemory, agentMemory, targetId, tools: BigWormTools, stimulus?: string) {
        // === SCENARIO A: User Request (The "Planner" Flow) ===
        if (targetId === 'user_request' && stimulus) {
            const userQuery = stimulus;
            
            // 1. Tool Definitions (Agent-specific + Shared Context OS & Letta tools)
            const bigWormSpecificTools = [
                {
                    name: "pythonAnalyze",
                    description: "Run advanced data analysis or trend forecasting using Python.",
                    schema: z.object({
                        action: z.enum(['analyze_trend', 'test']).describe("Action to run on sidecar"),
                        data: z.record(z.any()).describe("Data payload for the script")
                    })
                },
                {
                    name: "saveFinding",
                    description: "Save a verified fact or finding to long-term memory.",
                    schema: z.object({
                        researchId: z.string(),
                        finding: z.string()
                    })
                }
            ];

            // Combine agent-specific tools with shared Context OS and Letta tools
            const toolsDef = [...bigWormSpecificTools, ...contextOsToolDefs, ...lettaToolDefs];

            try {
                // === MULTI-STEP PLANNING (Run by Harness + Claude) ===
                const { runMultiStepTask } = await import('./harness');
                
                const result = await runMultiStepTask({
                    userQuery,
                    systemInstructions: (agentMemory.system_instructions as string) || '',
                    toolsDef,
                    tools,
                    model: 'claude', // Uses default CLAUDE_TOOL_MODEL (Opus 4.5)
                    maxIterations: 10 // Deep research needs depth
                });

                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'deep_research_complete',
                        result: result.finalResult,
                        metadata: { steps: result.steps }
                    }
                };

            } catch (e: any) {
                 return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'error', result: `Big Worm Task failed: ${e.message}`, metadata: { error: e.message } }
                };
            }
        }
    
        return {
            updatedMemory: agentMemory,
            logEntry: {
                 action: 'no_action',
                 result: "Counting my money.",
                 metadata: {}
            }
        };
    }
};
