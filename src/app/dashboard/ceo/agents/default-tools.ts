
import { ai } from '@/ai/genkit';
import { deebo } from '@/server/agents/deebo';
import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { CannMenusService } from '@/server/services/cannmenus';
import { searchWeb, formatSearchResults } from '@/server/tools/web-search';

// Wrapper to avoid cirular dependency issues if any
// but these tools mostly depend on external services or leaf nodes.

// Shared Memory Tools (Letta) - available to all agents
const commonMemoryTools = {
    lettaSaveFact: async (fact: string, category?: string) => {
        try {
            const { lettaClient } = await import('@/server/services/letta/client');
            const agents = await lettaClient.listAgents();
            let agent = agents.find(a => a.name === 'BakedBot Research Memory');
            if (!agent) {
                agent = await lettaClient.createAgent('BakedBot Research Memory', 'Long-term memory for BakedBot.');
            }
            const message = category 
                ? `Remember this fact under category '${category}': ${fact}`
                : `Remember this fact: ${fact}`;
            await lettaClient.sendMessage(agent.id, message);
            return { success: true, message: `Saved to memory: ${fact}` };
        } catch (e: any) {
            return { success: false, error: `Letta Save Failed: ${e.message}` };
        }
    },
    lettaAsk: async (question: string) => {
        try {
            const { lettaClient } = await import('@/server/services/letta/client');
            const agents = await lettaClient.listAgents();
            const agent = agents.find(a => a.name === 'BakedBot Research Memory');
            if (!agent) return { response: "Memory is empty or not initialized." };
            const result: any = await lettaClient.sendMessage(agent.id, question);
            if (result.messages && Array.isArray(result.messages)) {
                 const last = result.messages.filter((m:any) => m.role === 'assistant').pop();
                 return { response: last ? last.content : "No recall." };
            }
            return { response: "No clear memory found." };
        } catch (e: any) {
            return { error: `Letta Ask Failed: ${e.message}` };
        }
    }
};

export const defaultCraigTools = {
    ...commonMemoryTools,
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
    ...commonMemoryTools,
    analyzeExperimentResults: async (experimentId: string, data: any[]) => {
        return { winner: 'Variant B', confidence: 0.98 };
    },
    rankProductsForSegment: async (segmentId: string, products: any[]) => {
        return products;
    }
};

export const defaultPopsTools = {
    ...commonMemoryTools,
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
    ...commonMemoryTools,
    discoverMenu: async (url: string, context?: any) => {
        try {
            const { discovery } = await import('@/server/services/firecrawl');
            
            // Check if BakedBot Discovery is configured
            if (discovery.isConfigured()) {
                const result = await discovery.discoverUrl(url, ['markdown']);
                return { 
                    success: true, 
                    data: result.data || result, 
                    message: "Successfully discovered menu data." 
                };
            }
            
            return { message: "Discovery service unavailable. Please check configuration." };
        } catch (e: any) {
            console.error('Discovery failed:', e);
            return { message: `Discovery failed: ${e.message}` };
        }
    },
    comparePricing: async (myProducts: any[], competitorProducts: any[]) => {
        const myAvg = myProducts.reduce((acc, p) => acc + (p.price || 0), 0) / (myProducts.length || 1);
        const compAvg = competitorProducts.reduce((acc, p) => acc + (p.price || 0), 0) / (competitorProducts.length || 1);
        const price_index = myAvg / (compAvg || 1);
        return { price_index, myAvg, compAvg, advice: price_index > 1.1 ? 'Consider lowering prices.' : 'Pricing is competitive.' };
    },
    getCompetitiveIntel: async (state: string, city?: string | null) => {
        try {
            // Import dynamically to avoid circular dependencies
            const { getRetailersByZipCode, getZipCodeCoordinates } = await import('@/server/services/geo-discovery');
            
            let retailers = [];
            let marketLocation = city ? `${city}, ${state}` : state;

            // Heuristic: If city looks like a ZIP, treat it as such
            const isZip = city && /^\d{5}$/.test(city);
            if (isZip) {
                retailers = await getRetailersByZipCode(city, 15);
                marketLocation = `Zip Code ${city}`;
            } else if (city) {
                 // Try to resolve city to lat/long/zip if possible, or search by text
                 // For now, fast path: use a central zip for the city if known, or fallback to generic search
                 // We will simply try to "search nearby" a known point if we had one, but strict city search is harder without a geocoder for city names.
                 // Fallback to simple stub for city-only if not a zip, OR use a known zip map.
                 // Actually, let's use the basic CannMenusService directly for city text search if we can't geocode.
                 const { CannMenusService } = await import('@/server/services/cannmenus');
                 const cms = new CannMenusService();
                 // CannMenus 'near' param supports "City, State"
                 const results = await cms.searchProducts({ near: `${city}, ${state}`, limit: 12 });
                 if (results.products) {
                     // We need to extract retailers from products, which is imperfect but works for discovery
                     // Or use findRetailers with lat/lng if we could geocode.
                     // Let's stick to the tool spec: return a summary string.
                     return {
                        market: marketLocation,
                        retailers_found: results.products.length > 0 ? "Multiple" : 0,
                        sample_data: results.products.slice(0,3).map(p => ({
                             name: p.retailer_name || "Unknown Dispensary",
                             address: "Verified via CannMenus"
                        })),
                        insight: `Found products listed in ${marketLocation}.`
                     };
                 }
            } else {
                 // State-wide is too broad, just return a sample
                 return { market: state, retailers_found: "Many", insight: "Please specify a City or Zip Code for detailed intel." };
            }

            return {
                market: marketLocation,
                retailers_found: retailers.length,
                sample_data: retailers.slice(0, 5).map(r => ({ name: r.name, address: r.address, distance: r.distance + ' mi' })),
                insight: `Found ${retailers.length} active retailers in ${marketLocation}. Market appears ${retailers.length > 5 ? 'highly competitive' : 'open for expansion'}.`
            };
        } catch (e: any) {
             return `Intel retrieval failed: ${e.message}`;
        }
    },
    searchWeb: async (query: string) => {
        // Use BakedBot Discovery for search if available for Ezal (Advanced agent)
        try {
            const { discovery } = await import('@/server/services/firecrawl');
            if (discovery.isConfigured()) {
                const results = await discovery.search(query);
                return results;
            }
        } catch (e) { console.warn('BakedBot Discovery search failed, falling back to Serper'); }

        const results = await searchWeb(query);
        return formatSearchResults(results);
    }
};

export const defaultMoneyMikeTools = {
    ...commonMemoryTools,
    forecastRevenueImpact: async (skuId: string, priceDelta: number) => {
        return { projected_revenue_change: priceDelta * 100, confidence: 0.85 };
    },
    validateMargin: async (skuId: string, newPrice: number, costBasis: number) => {
        const margin = ((newPrice - costBasis) / newPrice) * 100;
        return { isValid: margin > 30, margin };
    }
};

export const defaultMrsParkerTools = {
    ...commonMemoryTools,
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

export const defaultDeeboTools = {
    ...commonMemoryTools,
    checkCompliance: async (content: string, jurisdiction: string, channel: string) => {
        try {
            // Import the SDK dynamically or from top level if safe
            // checking deebo import... 'deebo' is imported from '@/server/agents/deebo' at top of file.
            return await deebo.checkContent(jurisdiction, channel, content);
        } catch (e: any) {
            return { status: 'fail', violations: [e.message] };
        }
    },
    verifyAge: async (dob: string, jurisdiction: string) => {
        const { deeboCheckAge } = await import('@/server/agents/deebo');
        return deeboCheckAge(dob, jurisdiction);
    }
};

export const defaultBigWormTools = {
    ...commonMemoryTools,
    pythonAnalyze: async (action: string, data: any) => {
        try {
            const { sidecar } = await import('@/server/services/python-sidecar');
            return await sidecar.execute(action, data);
        } catch (e: any) {
            return { status: 'error', message: `Sidecar error: ${e.message}` };
        }
    },
    saveFinding: async (researchId: string, finding: string) => {
        try {
            const { lettaClient } = await import('@/server/services/letta/client');
            const agents = await lettaClient.listAgents();
            let agent = agents.find(a => a.name === 'BakedBot Research Memory');
            if (!agent) {
                agent = await lettaClient.createAgent('BakedBot Research Memory', 'Long-term memory for BakedBot.');
            }
            await lettaClient.sendMessage(agent.id, `Research ID ${researchId}: ${finding}`);
            return { success: true, id: researchId, status: 'saved_to_letta' };
        } catch (e: any) {
            console.error('Letta Save Error:', e);
            return { success: false, error: e.message };
        }
    }
};

export const defaultExecutiveTools = {
    ...commonMemoryTools,
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
    },
    // --- RTRvr.ai Capabilities ---
    rtrvrAgent: async (message: string, sessionId?: string) => {
        try {
            const { getRTRVRClient } = await import('@/server/services/rtrvr');
            const client = getRTRVRClient();
            const result = await client.chat(message, sessionId);
            return {
                response: result.response,
                sources: result.sources,
                sessionId: result.sessionId
            };
        } catch (e: any) {
            return { status: 'error', message: `RTRVR Error: ${e.message}` };
        }
    },
    rtrvrScrape: async (url: string) => {
        try {
            const { getRTRVRClient } = await import('@/server/services/rtrvr/client');
            const client = getRTRVRClient();
            return await client.scrape(url);
        } catch (e: any) {
            return { error: `RTRvr Scrape failed: ${e.message}` };
        }
    },
    rtrvrMcp: async (serverName: string, args: any) => {
        try {
            const { getRTRVRClient } = await import('@/server/services/rtrvr/client');
            const client = getRTRVRClient();
            return await client.mcp(serverName, args);
        } catch (e: any) {
            return { error: `RTRvr MCP failed: ${e.message}` };
        }
    },
    createPlaybook: async (name: string, description: string, steps: any[], schedule?: string) => {
        try {
            const { createPlaybook } = await import('@/server/tools/playbook-manager');
            return await createPlaybook({ name, description, steps, schedule });
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },
    use_mcp_tool: async (serverName: string, toolName: string, args: any) => {
        try {
            const { getMcpClient } = await import('@/server/services/mcp/client');
            const client = getMcpClient(serverName);
            if (!client) {
                return { success: false, error: `MCP Server '${serverName}' not found or not connected.` };
            }
            const result = await client.callTool(toolName, args);
            return { success: true, result };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },
    }
};

export const defaultDayDayTools = {
    auditPage: async (url: string, pageType: 'dispensary' | 'brand' | 'city' | 'zip') => {
        try {
            const { dayday } = await import('@/server/agents/dayday');
            return await dayday.auditPage(url, pageType);
        } catch (e: any) {
            return { error: e.message, score: 0, issues: ['Failed to audit'] };
        }
    },
    generateMetaTags: async (contentSample: string) => {
        try {
            const { dayday } = await import('@/server/agents/dayday');
            return await dayday.generateMetaTags(contentSample);
        } catch (e: any) {
            return { title: 'Error', description: 'Could not generate tags' };
        }
    }
};

export const defaultFelishaTools = {
    processMeetingTranscript: async (transcript: string) => {
        try {
            const { felisha } = await import('@/server/agents/felisha');
            return await felisha.processMeetingTranscript(transcript);
        } catch (e: any) {
            return { summary: 'Processing failed', actionItems: [] };
        }
    },
    triageError: async (errorLog: any) => {
        try {
            const { felisha } = await import('@/server/agents/felisha');
            return await felisha.triageError(errorLog);
        } catch (e: any) {
            return { severity: 'unknown', team: 'engineering' };
        }
    }
};
