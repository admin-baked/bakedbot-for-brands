import { AgentImplementation } from './harness';
import { AgentMemory } from './schemas';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { ai } from '@/ai/genkit';

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

            const toolsDef = [
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

            try {
                // Planner
                const plan = await ai.generate({
                    prompt: `
                        ${agentMemory.system_instructions}
                        USER REQUEST: "${userQuery}"
                        TOOLS: ${JSON.stringify(toolsDef)}
                        
                        Decide next step. JSON: { thought, toolName, args }
                    `,
                    output: {
                        schema: z.object({
                            thought: z.string(),
                            toolName: z.enum(['processMeetingTranscript', 'triageError', 'null']),
                            args: z.record(z.any())
                        })
                    }
                });

                const decision = plan.output;

                if (!decision || decision.toolName === 'null') {
                    return {
                        updatedMemory: agentMemory,
                        logEntry: {
                            action: 'chat_response',
                            result: decision?.thought || "I'm here to coordinate. Upload a transcript or paste an error.",
                            metadata: {}
                        }
                    };
                }

                // Executor
                let output: any;
                if (decision.toolName === 'processMeetingTranscript') {
                    output = await tools.processMeetingTranscript(decision.args.transcript);
                } else if (decision.toolName === 'triageError') {
                    output = await tools.triageError(decision.args.errorLog);
                }

                // Synthesizer
                const final = await ai.generate({
                    prompt: `Summarize Felisha's action: ${userQuery}. Tool: ${decision.toolName}. Output: ${JSON.stringify(output)}`
                });

                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'tool_execution',
                        result: final.text,
                        metadata: { tool: decision.toolName, output }
                    }
                };

            } catch (e: any) {
                return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'error', result: `Felisha Error: ${e.message}` }
                };
            }
        }

        return { updatedMemory: agentMemory, logEntry: { action: 'idle', result: 'No action.' } };
    }
};

export const felisha = felishaAgent;
