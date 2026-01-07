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
                // === MULTI-STEP PLANNING (Run by Harness + Claude) ===
                const { runMultiStepTask } = await import('./harness');
                
                const result = await runMultiStepTask({
                    userQuery,
                    systemInstructions: (agentMemory.system_instructions as string) || '',
                    toolsDef,
                    tools,
                    model: 'claude',
                    maxIterations: 5
                });

                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'seo_task_complete',
                        result: result.finalResult,
                        metadata: { steps: result.steps }
                    }
                };

            } catch (e: any) {
                 return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'error', result: `DayDay Task failed: ${e.message}`, metadata: { error: e.message } }
                };
            }
        }
        
        return { updatedMemory: agentMemory, logEntry: { action: 'idle', result: 'Day Day analytics checking in.' } };
    }
};

// Export strictly named export to match import expectation if needed, 
// or default. The previous file used named export 'dayday'. 
// We will export 'dayday' as the agent implementation to minimize breakage.
export const dayday = dayDayAgent;
