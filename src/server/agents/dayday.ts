import { AgentImplementation } from './harness';
import { AgentMemory } from './schemas';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { contextOsToolDefs, lettaToolDefs } from './shared-tools';

export interface DayDayTools {
    auditPage(url: string, pageType: 'dispensary' | 'brand' | 'city' | 'zip'): Promise<any>;
    generateMetaTags(contentSample: string): Promise<any>;
    lettaSaveFact(fact: string): Promise<any>;
    // NEW: Analytics tools
    getSearchConsoleStats(): Promise<any>;
    getGA4Traffic(): Promise<any>;
    findSEOOpportunities(): Promise<any>;
}

// ... imports
import { searchConsoleService } from '@/server/services/growth/search-console';
import { googleAnalyticsService } from '@/server/services/growth/google-analytics';
import { sitemapManager } from '@/server/services/growth/sitemap-manager';

// ... DayDayTools interface ...

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
            - Google Search Console: Rankings, clicks, impressions, CTR.
            - Google Analytics 4: Traffic, sessions, user engagement.
            
            PROTOCOLS:
            
            [WEEKLY_GROWTH_REVIEW]
            When asked to "perform weekly review" or when identifying optimization candidates:
            1. Use 'findSEOOpportunities' to identify pages with high impressions but low CTR.
            2. For each candidate, analyze WHY it's failing (e.g., boring title, irrelevant meta description).
            3. Propose a new Title Tag and Meta Description.
            4. Suggest one content addition (e.g., "Add a FAQ about X").
            
            [DAILY_DISCOVERY]
            - Find 5-10 low-competition markets using your knowledge of cannabis deserts.
            - Generate unique SEO content for new pages.
            
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

            // Tool Definitions (Agent-specific + Shared Context OS & Letta tools)
            const dayDaySpecificTools = [
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
                },
                {
                   name: "refreshSitemap",
                   description: "Ping Google to refresh the sitemap index.",
                   schema: z.object({})
                }
            ];

            // Implement specific tools
            const specificImplementations = {
                getSearchConsoleStats: async () => {
                    return await searchConsoleService.getSiteSummary(7);
                },
                getGA4Traffic: async () => {
                    return await googleAnalyticsService.getTrafficReport('28daysAgo', 'today');
                },
                findSEOOpportunities: async () => {
                    return await searchConsoleService.findLowCompetitionOpportunities(10);
                },
                refreshSitemap: async () => {
                    const success = await sitemapManager.pingGoogle();
                    return { success, message: success ? 'Pinged Google' : 'Ping failed' };
                },
                auditPage: async ({ url }: { url: string }) => {
                    // Placeholder for real audit logic (e.g. Firecrawl or Puppeteer)
                    return { url, score: 85, issues: ['Missing H1', 'Slow LCP'] };
                },
                generateMetaTags: async ({ contentSample }: { contentSample: string }) => {
                     const { text } = await ai.generate({
                        prompt: `Generate SEO title and meta description for: ${contentSample.substring(0, 500)}...`,
                        model: 'googleai/gemini-1.5-flash'
                    });
                    return { meta: text };
                }
            };

            // Combine agent-specific tools with shared Context OS and Letta tools
            const toolsDef = [...dayDaySpecificTools, ...contextOsToolDefs, ...lettaToolDefs];
            
            // Merge implementations
            const allTools = { ...tools, ...specificImplementations };

            try {
                const { runMultiStepTask } = await import('./harness');
                
                const result = await runMultiStepTask({
                    userQuery,
                    systemInstructions: (agentMemory.system_instructions as string) || '',
                    toolsDef,
                    tools: allTools,
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

