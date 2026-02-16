
import { AgentImplementation } from './harness';
import { AgentMemory, AgentMemorySchema } from './schemas'; // Will update schemas.ts shortly
import { logger } from '@/lib/logger';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sidecar } from '@/server/services/python-sidecar';
import { contextOsToolDefs, lettaToolDefs } from './shared-tools';
import { runResearchElaboration } from './patterns';

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
            const researchTools = [...bigWormSpecificTools, ...contextOsToolDefs, ...lettaToolDefs];

            try {
                // === RESEARCH-ELABORATION PATTERN ===
                // Phase 1: Research with tools (gather data, run analysis)
                // Phase 2: Elaborate without tools (synthesize findings)
                const result = await runResearchElaboration(userQuery, {
                    researchPrompt: `
                        You are Big Worm, conducting deep research.

                        RESEARCH PHASE OBJECTIVES:
                        1. Use pythonAnalyze to run data analysis and trend forecasting
                        2. Use Context OS tools to gather external data sources
                        3. Use Letta tools to check existing knowledge and save new findings
                        4. Verify all data points - don't guess, run the numbers

                        Be thorough. This is deep research, not surface-level.
                    `,
                    researchTools,
                    researchToolsImpl: tools as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>,
                    maxResearchIterations: 7,
                    elaboration: {
                        instructions: `
                            You are Big Worm, synthesizing your research findings.

                            ELABORATION PHASE:
                            Based on all the data you gathered, provide:
                            1. **Executive Summary**: Key insights in 2-3 sentences
                            2. **Deep Findings**: Detailed analysis with supporting data
                            3. **Recommendations**: Actionable next steps
                            4. **Data Sources**: List of tools/sources used

                            Tone: Authoritative, street-wise, data-rich.
                            Format: Use markdown headers and bullet points.
                        `,
                        model: 'claude-sonnet-4-20250514',
                        maxIterations: 3,
                    },
                });

                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'deep_research_complete',
                        result: result.elaboratedOutput,
                        metadata: {
                            researchSteps: result.researchOutput.steps.length,
                            totalDurationMs: result.metadata.totalDurationMs,
                            pattern: 'research-elaboration'
                        }
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
