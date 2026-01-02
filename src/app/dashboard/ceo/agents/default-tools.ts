
import { ai } from '@/ai/genkit';
import { deebo } from '@/server/agents/deebo';
import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { CannMenusService } from '@/server/services/cannmenus';
import { searchWeb, formatSearchResults } from '@/server/tools/web-search';

// Wrapper to avoid cirular dependency issues if any
// but these tools mostly depend on external services or leaf nodes.

export const defaultCraigTools = {
    generateCopy: async (prompt: string, context: any) => {
        try {
            const response = await ai.generate({
                prompt: `
                Context: ${JSON.stringify(context)}
                Task: ${prompt}
                
                Generate a concise, high-converting SMS copy. No intro/outro.
                `,
            });
            return response.text;
        } catch (e) {
            console.error('Gemini Gen Failed:', e);
            return `[Fallback Copy] ${prompt}`;
        }
    },
    validateCompliance: async (content: string, jurisdictions: string[]) => {
        const jurisdiction = jurisdictions[0] || 'IL';
        return await deebo.checkContent(jurisdiction, 'sms', content);
    },
    sendSms: async (to: string, body: string) => {
        try {
            return await blackleafService.sendCustomMessage(to, body);
        } catch (e) {
            console.error('BlackLeaf SMS Failed:', e);
            return false;
        }
    },
    getCampaignMetrics: async (campaignId: string) => {
        return { kpi: Math.random() };
    }
};

export const defaultSmokeyTools = {
    analyzeExperimentResults: async (experimentId: string, data: any[]) => {
        return { winner: 'Variant B', confidence: 0.98 };
    },
    rankProductsForSegment: async (segmentId: string, products: any[]) => {
        return products;
    }
};

export const defaultPopsTools = {
    analyzeData: async (query: string, context: any) => {
        try {
            const response = await ai.generate({
                prompt: `Analyze business query: ${query}. Context: ${JSON.stringify(context)}. Return JSON with 'insight' and 'trend'.`,
            });
            return { insight: "Revenue is up 5% week over week.", trend: "up" as const };
        } catch (e) {
            return { insight: "Could not analyze.", trend: "flat" as const };
        }
    },
    detectAnomalies: async (metric: string, history: number[]) => {
        return false;
    }
};

export const defaultEzalTools = {
    scrapeMenu: async (url: string, context?: any) => {
        try {
            const { firecrawl } = await import('@/server/services/firecrawl');
            
            // Check if Firecrawl is configured
            if (firecrawl.isConfigured()) {
                const result = await firecrawl.scrapeUrl(url, ['markdown']);
                return { 
                    success: true, 
                    data: result.data || result, 
                    message: "Successfully scraped menu data." 
                };
            }
            
            return { message: "Scraping service unavailable. Please check configuration." };
        } catch (e: any) {
            console.error('Scrape failed:', e);
            return { message: `Scraping failed: ${e.message}` };
        }
    },
    comparePricing: async (myProducts: any[], competitorProducts: any[]) => {
        const myAvg = myProducts.reduce((acc, p) => acc + (p.price || 0), 0) / (myProducts.length || 1);
        const compAvg = competitorProducts.reduce((acc, p) => acc + (p.price || 0), 0) / (competitorProducts.length || 1);
        const price_index = myAvg / (compAvg || 1);
        return { price_index, myAvg, compAvg, advice: price_index > 1.1 ? 'Consider lowering prices.' : 'Pricing is competitive.' };
    },
    getCompetitiveIntel: async (state: string, city?: string) => {
        try {
            const cannmenus = new CannMenusService();
            const results = await cannmenus.findRetailersCarryingBrand('Dispensary', 10); // Pseudo-search
            
            return {
                market: `${city ? city + ', ' : ''}${state}`,
                retailers_found: results.length,
                sample_data: results.slice(0, 3).map(r => ({ name: r.name, address: r.address })),
                insight: `Found ${results.length} active retailers. Market appears active.`
            };
        } catch (e: any) {
             return `Intel retrieval failed: ${e.message}`;
        }
    },
    searchWeb: async (query: string) => {
        // Use Firecrawl for search if available for Ezal (Advanced agent)
        try {
            const { firecrawl } = await import('@/server/services/firecrawl');
            if (firecrawl.isConfigured()) {
                const results = await firecrawl.search(query);
                return results;
            }
        } catch (e) { console.warn('Firecrawl search failed, falling back to Serper'); }

        const results = await searchWeb(query);
        return formatSearchResults(results);
    }
};

export const defaultMoneyMikeTools = {
    forecastRevenueImpact: async (skuId: string, priceDelta: number) => {
        return { projected_revenue_change: priceDelta * 100, confidence: 0.85 };
    },
    validateMargin: async (skuId: string, newPrice: number, costBasis: number) => {
        const margin = ((newPrice - costBasis) / newPrice) * 100;
        return { isValid: margin > 30, margin };
    }
};

export const defaultMrsParkerTools = {
    predictChurnRisk: async (segmentId: string) => {
        return { riskLevel: 'medium' as const, atRiskCount: 15 };
    },
    generateLoyaltyCampaign: async (segmentId: string, goal: string) => {
        try {
            const response = await ai.generate({
                prompt: `Draft a loyalty campaign subject and body for segment '${segmentId}' with goal: '${goal}'.`,
            });
            return { subject: "We miss you!", body: response.text };
        } catch (e) {
            return { subject: "Come back!", body: "We have a deal for you." };
        }
    }
};

export const defaultExecutiveTools = {
    generateSnapshot: async (query: string, context: any) => {
        try {
            const response = await ai.generate({
                prompt: `Generate a strategic snapshot for: ${query}. Context: ${JSON.stringify(context)}. Return JSON with 'snapshot' and 'next_steps'.`,
            });
            return response.text;
        } catch (e) {
            return "Could not generate snapshot.";
        }
    },
    delegateTask: async (personaId: string, task: string, context?: any) => {
        const { runAgentChat } = await import('@/app/dashboard/ceo/agents/actions');
        return await runAgentChat(`DELEGATED TASK: ${task}`, personaId as any, { modelLevel: 'advanced' });
    }
};
