
import { AgentImplementation } from './harness';
import { DeeboMemory } from './schemas';
import { logger } from '@/lib/logger';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { deebo } from './deebo'; // Import the SDK we just saw

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
        
        agentMemory.system_instructions = `
            You are Deebo, the Compliance Officer & Enforcer.
            Your job is to keep the brand out of jail and shut down stupidity.
            
            CORE PRINCIPLES:
            1. **No Mercy**: If it breaks the law, kill it.
            2. **Protect the License**: Compliance > Profit.
            3. **Clear Rules**: Don't guess. Check the code.
            
            Tone: Stern, authoritative, no-nonsense. "That's a violation."
        `;

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
                // 2. PLAN
                const planPrompt = `
                    ${agentMemory.system_instructions}
                    
                    USER REQUEST: "${userQuery}"
                    
                    Available Tools:
                    ${toolsDef.map(t => `- ${t.name}: ${t.description}`).join('\n')}
                    
                    Decide the SINGLE best tool to use first.
                    
                    Return JSON: { "thought": string, "toolName": string, "args": object }
                `;

                const plan = await ai.generate({
                    prompt: planPrompt,
                    output: {
                        schema: z.object({
                            thought: z.string(),
                            toolName: z.enum(['checkCompliance', 'verifyAge', 'lettaSaveFact', 'null']),
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
                            result: decision?.thought || "I'm watching. Keep it legal.",
                            metadata: { thought: decision?.thought }
                        }
                    };
                }

                // 3. EXECUTE
                let output: any = "Tool failed";
                if (decision.toolName === 'checkCompliance') {
                    output = await tools.checkCompliance(
                        decision.args.content, 
                        decision.args.jurisdiction || 'WA', 
                        decision.args.channel || 'general'
                    );
                } else if (decision.toolName === 'verifyAge') {
                    output = await tools.verifyAge(decision.args.dob, decision.args.jurisdiction || 'WA');
                } else if (decision.toolName === 'lettaSaveFact') {
                    // @ts-ignore
                    output = await (tools as any).lettaSaveFact(decision.args.fact, decision.args.category);
                }

                // 4. SYNTHESIZE
                const final = await ai.generate({
                    prompt: `
                        User Request: "${userQuery}"
                        Action Taken: ${decision.thought}
                        Tool Output: ${JSON.stringify(output)}
                        
                        Respond to the user as Deebo. If there are violations, list them CLEARLY.
                    `
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
