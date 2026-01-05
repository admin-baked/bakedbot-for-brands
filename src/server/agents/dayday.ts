import { AgentImplementation } from './harness';
import { AgentMemory } from './schemas';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { ai } from '@/ai/genkit';

export interface DayDayTools {
    auditPage(url: string, pageType: 'dispensary' | 'brand' | 'city' | 'zip'): Promise<any>;
    generateMetaTags(contentSample: string): Promise<any>;
    lettaSaveFact(fact: string): Promise<any>;
}

export const dayDayAgent: AgentImplementation<AgentMemory, DayDayTools> = {
    agentName: 'day_day',

    async initialize(brandMemory, agentMemory) {
        agentMemory.system_instructions = `
            You are Day Day, the SEO & Growth Manager.
            Your job is to ensure every page is optimized for search engines and conversion.
            
            CORE SKILLS:
            1. **Technical SEO**: Audit pages for tags, speed, and structure.
            2. **Content Optimization**: Write click-worthy meta tags.
            
            Tone: Technical, precise, growth-hacking.
        `;
        return agentMemory;
    },

    async orient(brandMemory, agentMemory, stimulus) {
        if (stimulus && typeof stimulus === 'string') return 'user_request';
        return null; // No background loop for now
    },

    async act(brandMemory, agentMemory, targetId, tools, stimulus) {
        if (targetId === 'user_request' && stimulus) {
            const userQuery = stimulus;

            const toolsDef = [
                {
                    name: "auditPage",
                    description: "Run an SEO audit on a specific URL.",
                    schema: z.object({
                        url: z.string(),
                        pageType: z.enum(['dispensary', 'brand', 'city', 'zip'])
                    })
                },
                {
                    name: "generateMetaTags",
                    description: "Generate optimized title and description tags for content.",
                    schema: z.object({
                        contentSample: z.string()
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
                            toolName: z.enum(['auditPage', 'generateMetaTags', 'null']),
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
                            result: decision?.thought || "I'm ready to optimize. Give me a URL or content.",
                            metadata: {}
                        }
                    };
                }

                // Executor
                let output: any;
                if (decision.toolName === 'auditPage') {
                    output = await tools.auditPage(decision.args.url, decision.args.pageType);
                } else if (decision.toolName === 'generateMetaTags') {
                    output = await tools.generateMetaTags(decision.args.contentSample);
                }

                // Synthesizer
                const final = await ai.generate({
                    prompt: `Summarize this Day Day action for user: ${userQuery}. Action: ${decision.toolName}. Result: ${JSON.stringify(output)}`
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
                    logEntry: { action: 'error', result: `Day Day Error: ${e.message}` }
                };
            }
        }
        
        return { updatedMemory: agentMemory, logEntry: { action: 'idle', result: 'No action.' } };
    }
};

// Export strictly named export to match import expectation if needed, 
// or default. The previous file used named export 'dayday'. 
// We will export 'dayday' as the agent implementation to minimize breakage.
export const dayday = dayDayAgent;
