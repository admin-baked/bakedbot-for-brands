import { AgentImplementation } from './harness';
import { AgentMemory } from './schemas';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { contextOsToolDefs, lettaToolDefs } from './shared-tools';

export interface FelishaTools {
    processMeetingTranscript(transcript: string): Promise<any>;
    triageError(errorLog: any): Promise<any>;
}

export const felishaAgent: AgentImplementation<AgentMemory, FelishaTools> = {
    agentName: 'felisha',

    async initialize(brandMemory, agentMemory) {
        agentMemory.system_instructions = `
            You are Felisha, the Operations Coordinator.
            "Bye Felisha" is what we say to problems. You fix them or route them.
            
            CORE SKILLS:
            1. **Meeting Notes**: Summarize transcripts into action items.
            2. **Triage**: Analyze errors and assign to the right team.
            
            Tone: Efficient, organized, slightly sassy but helpful.
        `;
        return agentMemory;
    },

    async orient(brandMemory, agentMemory, stimulus) {
        if (stimulus && typeof stimulus === 'string') return 'user_request';
        return null;
    },

    async act(brandMemory, agentMemory, targetId, tools, stimulus) {
        if (targetId === 'user_request' && stimulus) {
            const userQuery = stimulus;

            // Tool Definitions (Agent-specific + Shared Context OS & Letta tools)
            const felishaSpecificTools = [
                {
                    name: "processMeetingTranscript",
                    description: "Extract notes and action items from a raw meeting transcript.",
                    schema: z.object({
                        transcript: z.string()
                    })
                },
                {
                    name: "triageError",
                    description: "Analyze a system error log and suggest a fix or assignee.",
                    schema: z.object({
                        errorLog: z.string().describe("The error message or stack trace")
                    })
                }
            ];

            // Combine agent-specific tools with shared Context OS and Letta tools
            const toolsDef = [...felishaSpecificTools, ...contextOsToolDefs, ...lettaToolDefs];

            try {
                // === MULTI-STEP PLANNING (Run by Harness + Claude) ===
                const { runMultiStepTask } = await import('./harness');
                
                const result = await runMultiStepTask({
                    userQuery,
                    systemInstructions: (agentMemory.system_instructions as string) || '',
                    toolsDef,
                    tools,
                    model: 'claude-sonnet-4-20250514',
                    maxIterations: 5
                });

                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'triage_complete',
                        result: result.finalResult,
                        metadata: { steps: result.steps }
                    }
                };

            } catch (e: any) {
                 return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'error', result: `Felisha Task failed: ${e.message}`, metadata: { error: e.message } }
                };
            }
        }
        return { updatedMemory: agentMemory, logEntry: { action: 'idle', result: 'Felisha organizing tickets.' } };
    }
};

export const felisha = felishaAgent;
