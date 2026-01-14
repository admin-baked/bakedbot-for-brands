import { AgentImplementation } from './harness';
import { AgentMemory } from './schemas';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { ai } from '@/ai/genkit';

export interface DayDayTools {
    auditPage(url: string, pageType: 'dispensary' | 'brand' | 'city' | 'zip'): Promise<any>;
    generateMetaTags(contentSample: string): Promise<any>;
    lettaSaveFact(fact: string): Promise<any>;
    // NEW: Analytics tools
    getSearchConsoleStats(): Promise<any>;
    getGA4Traffic(): Promise<any>;
    findSEOOpportunities(): Promise<any>;
}

export const dayDayAgent: AgentImplementation<AgentMemory, DayDayTools> = {
    agentName: 'day_day',

    async initialize(brandMemory, agentMemory) {
        agentMemory.system_instructions = `
            You are Day Day, the SEO & Growth Manager.
            Your job is to ensure every page is optimized for search engines and conversion.
            
            CORE SKILLS:
            1. **Technical SEO**: Audit pages for tags, speed, and structure.
            2. **Content Optimization**: Write click-worthy meta tags and unique content.
            3. **Analytics**: Access Google Search Console and GA4 to make data-driven decisions.
            4. **Opportunity Finding**: Identify low-competition keywords and markets.
            
            DATA SOURCES:
            - Google Search Console: Rankings, clicks, impressions, CTR
            - Google Analytics 4: Traffic, sessions, user engagement
            
            DAILY TASKS:
            - Find 5-10 low-competition markets
            - Generate unique SEO content for new pages
            - Auto-publish optimized pages
            
            Tone: Technical, precise, growth-hacking.
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
                },
                {
                    name: "getSearchConsoleStats",
                    description: "Get Google Search Console performance data - rankings, clicks, impressions.",
                    schema: z.object({})
                },
                {
                    name: "getGA4Traffic",
                    description: "Get Google Analytics 4 traffic stats - sessions, users, engagement.",
                    schema: z.object({})
                },
                {
                    name: "findSEOOpportunities",
                    description: "Find low-competition keywords and markets with high potential.",
                    schema: z.object({})
                }
            ];

            try {
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

export const dayday = dayDayAgent;

