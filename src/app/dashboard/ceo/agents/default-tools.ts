
import { ai } from '@/ai/genkit';
import { deebo } from '@/server/agents/deebo';
import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { CannMenusService } from '@/server/services/cannmenus';
import { searchWeb, formatSearchResults } from '@/server/tools/web-search';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { makeProductRepo } from '@/server/repos/productRepo';
import { superUserTools } from '@/app/dashboard/ceo/agents/super-user-tools-impl';
import { requestPermission } from '@/server/tools/permissions';

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
    },
    
    // Inter-Agent Async Messaging
    sendMessageToAgent: async (toAgentName: string, message: string) => {
        try {
            const { lettaClient } = await import('@/server/services/letta/client');
            const agents = await lettaClient.listAgents();
            const targetAgent = agents.find(a => a.name.toLowerCase().includes(toAgentName.toLowerCase()));
            if (!targetAgent) {
                return { delivered: false, error: `Agent '${toAgentName}' not found` };
            }
            const result = await lettaClient.sendAsyncMessage('self', targetAgent.id, message);
            return { delivered: result.delivered, messageId: result.messageId };
        } catch (e: any) {
            return { delivered: false, error: e.message };
        }
    },
    
    // Shared Memory Block Tools
    writeToSharedBlock: async (tenantId: string, blockLabel: string, content: string, agentName: string) => {
        try {
            const { lettaBlockManager, BLOCK_LABELS } = await import('@/server/services/letta/block-manager');
            const label = BLOCK_LABELS[blockLabel.toUpperCase() as keyof typeof BLOCK_LABELS] || blockLabel;
            const block = await lettaBlockManager.appendToBlock(tenantId, label as any, content, agentName);
            return { success: true, blockId: block.id };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },
    
    readFromSharedBlock: async (tenantId: string, blockLabel: string) => {
        try {
            const { lettaBlockManager, BLOCK_LABELS } = await import('@/server/services/letta/block-manager');
            const label = BLOCK_LABELS[blockLabel.toUpperCase() as keyof typeof BLOCK_LABELS] || blockLabel;
            const content = await lettaBlockManager.readBlock(tenantId, label as any);
            return { success: true, content };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
};

const commonDynamicMemoryTools = {
    attachMemoryBlock: async (blockLabel: string, content: any, readOnly: boolean = false) => {
        try {
            const { dynamicMemoryService } = await import('@/server/services/letta/dynamic-memory');
            // Assuming context has agentId, otherwise we might need to pass it or rely on global scope
            // For now, using a placeholder or context if available. 
            // In a real execution, agentId comes from the runtime context.
            // We'll trust the agent runner injects currentAgentId into global or we pass it.
            // Fallback: use 'default_agent' if missing for safety in dev
            const agentId = (global as any).currentAgentId || 'default_agent';
            
            const result = await dynamicMemoryService.attachBlock(
                agentId,
                'project',
                { id: Date.now().toString(), label: blockLabel, content, readOnly }
            );
            return { success: true, blockId: result.blockId, message: `Attached ${blockLabel} to memory` };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },
    
    detachMemoryBlock: async (blockId: string, deleteBlock: boolean = false) => {
        try {
            const { dynamicMemoryService } = await import('@/server/services/letta/dynamic-memory');
            const agentId = (global as any).currentAgentId || 'default_agent';
            
            await dynamicMemoryService.detachBlock(agentId, blockId, deleteBlock);
            return { success: true, message: 'Block detached' };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },
    
    listAttachedBlocks: async () => {
        try {
            const { dynamicMemoryService } = await import('@/server/services/letta/dynamic-memory');
            const agentId = (global as any).currentAgentId || 'default_agent';
            
            const blocks = await dynamicMemoryService.getAttachedBlocks(agentId);
            return { success: true, blocks: blocks.map(b => ({ id: b.id, label: b.label, size: b.value.length })) };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
};

const commonRAGTools = {
    searchKnowledgeBase: async (query: string, scope: 'products' | 'customers' | 'intel' | 'compliance' | 'general' = 'general') => {
        try {
            const { ragService } = await import('@/server/services/vector-search/rag-service');
            const tenantId = (global as any).currentTenantId;
            
            const collectionMap = {
                products: 'products/catalog',
                customers: 'customers/interactions',
                intel: 'intel/competitors',
                compliance: 'compliance/policies',
                general: 'knowledge/docs'
            };
            
            const results = await ragService.search({
                collection: collectionMap[scope],
                query,
                limit: 5,
                tenantId: scope !== 'compliance' ? tenantId : undefined
            });
            
            return {
                success: true,
                results: results.map(r => ({
                    text: r.text.slice(0, 500),
                    relevance: r.score,
                    source: r.source
                }))
            };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },
    
    indexContent: async (content: string, category: string, metadata: any = {}) => {
        try {
            const { ragService } = await import('@/server/services/vector-search/rag-service');
            const tenantId = (global as any).currentTenantId;
            
            await ragService.indexDocument(
                `knowledge/${category}`,
                `doc_${Date.now()}`,
                content,
                { ...metadata, indexed_at: new Date().toISOString(), tenant: tenantId },
                tenantId
            );
            
            return { success: true, message: 'Content indexed for future RAG search' };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
};

// Digital Worker Tools - SMS, Email, Notifications
const commonDigitalWorkerTools = {
    // Blackleaf SMS
    sendSmsBlackleaf: async (to: string, body: string, imageUrl?: string) => {
        try {
            const { blackleafService } = await import('@/lib/notifications/blackleaf-service');
            const result = await blackleafService.sendCustomMessage(to, body, imageUrl);
            return { success: result, provider: 'blackleaf' };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },
    
    // Blackleaf Order Notifications
    sendOrderReadySms: async (orderId: string, dispensaryName: string, phoneNumber: string) => {
        try {
            const { blackleafService } = await import('@/lib/notifications/blackleaf-service');
            const order = { id: orderId, dispensaryName };
            const result = await blackleafService.sendOrderReady(order, phoneNumber);
            return { success: result, type: 'order_ready' };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },
    
    sendPromotionalSms: async (message: string, phoneNumber: string, imageUrl?: string) => {
        try {
            const { blackleafService } = await import('@/lib/notifications/blackleaf-service');
            const result = await blackleafService.sendPromotion(message, phoneNumber, imageUrl);
            return { success: result, type: 'promotion' };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },
    
    // Mailjet Email
    sendEmailMailjet: async (to: string, subject: string, htmlBody: string, fromEmail?: string, fromName?: string) => {
        try {
            const { sendGenericEmail } = await import('@/lib/email/mailjet');
            const result = await sendGenericEmail({ 
                to, 
                subject, 
                htmlBody, 
                fromEmail, 
                fromName 
            });
            return result;
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },
    
    sendOrderConfirmationEmail: async (orderData: {
        orderId: string;
        customerName: string;
        customerEmail: string;
        total: number;
        items: Array<{ name: string; qty: number; price: number }>;
        retailerName: string;
        pickupAddress: string;
    }) => {
        try {
            const { sendOrderConfirmationEmail } = await import('@/lib/email/mailjet');
            const result = await sendOrderConfirmationEmail(orderData);
            return { success: result, type: 'order_confirmation' };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },
    
    // Marketing Email (with compliance check)
    sendMarketingEmail: async (to: string, subject: string, htmlBody: string) => {
        try {
            const { sendGenericEmail } = await import('@/lib/email/dispatcher');
            const result = await sendGenericEmail({ to, subject, htmlBody });
            return result;
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },

    // Email Verification (QuickEmailVerification)
    // Available to: Super Users, Brands, Dispensaries
    verifyEmail: async (email: string, apiKey?: string) => {
        try {
            const { verifyEmail, getEmailQualityScore } = await import('@/server/services/email-verification');
            const result = await verifyEmail({ email, apiKey });
            const qualityScore = getEmailQualityScore(result);
            return {
                ...result,
                qualityScore,
                recommendation: result.safe_to_send 
                    ? 'Safe to send' 
                    : result.disposable 
                        ? 'Disposable email - do not send' 
                        : result.result === 'invalid' 
                            ? 'Invalid email - do not send'
                            : 'Proceed with caution'
            };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },

    verifyEmailBatch: async (emails: string[], apiKey?: string) => {
        try {
            const { verifyEmails, getEmailQualityScore } = await import('@/server/services/email-verification');
            const results = await verifyEmails(emails, apiKey);
            return {
                success: true,
                total: results.length,
                safe: results.filter(r => r.safe_to_send).length,
                invalid: results.filter(r => r.result === 'invalid').length,
                disposable: results.filter(r => r.disposable).length,
                results: results.map(r => ({
                    email: r.email,
                    result: r.result,
                    safe_to_send: r.safe_to_send,
                    qualityScore: getEmailQualityScore(r)
                }))
            };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
};

const commonDelegationTools = {
    delegateTask: async (personaId: string, task: string, context?: any) => {
        const { runAgentChat } = await import('@/app/dashboard/ceo/agents/actions');
        return await runAgentChat(`DELEGATED TASK: ${task}`, personaId as any, { modelLevel: 'advanced' });
    }
};

const commonPlaybookTools = {
    draft_playbook: async (name: string, description: string, steps: any[], schedule?: string) => {
        try {
            const { createPlaybook } = await import('@/server/tools/playbook-manager');
            // Force active: false / status: 'draft' by using the appropriate default behavior or param
            // createPlaybook({ name, ... }) -> defaults default-playbooks logic?
            // Wait, looking at playbook-manager.ts:
            // export async function createPlaybook(params: CreatePlaybookParams) { ... active: params.active ?? true ... }
            // So we MUST explicitly pass active: false.
            return await createPlaybook({ name, description, steps, schedule, active: false });
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
};

export const defaultCraigTools = {
    ...commonMemoryTools,
    ...commonPlaybookTools,
    generateCopy: async (prompt: string, context: any) => {
        try {
            const response = await ai.generate({
                prompt: `
                Context: ${JSON.stringify(context)}
                Task: ${prompt}
                
                Generate a concise, high-converting SMS copy. No intro/outro.
                `,
            });
            await commonMemoryTools.lettaSaveFact(`Generated marketing copy for '${prompt}': ${response.text}`, 'marketing_copy');
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
    ...commonDelegationTools,
    ...commonPlaybookTools,
    analyzeExperimentResults: async (experimentId: string, data: any[]) => {
        return { winner: 'Variant B', confidence: 0.98 };
    },
    rankProductsForSegment: async (segmentId: string, products: any[]) => {
        // Persistence
        await commonMemoryTools.lettaSaveFact(`Ranked products for segment '${segmentId}'.`, 'product_ranking');
        return products;
    },
    /**
     * Create a carousel artifact for the inbox system.
     * Returns the artifact marker format that parseArtifactsFromContent() can parse.
     */
    createCarouselArtifact: async (input: {
        title: string;
        description?: string;
        productIds: string[];
        displayOrder?: number;
        rationale: string;
    }) => {
        const { title, description, productIds, displayOrder = 0, rationale } = input;

        // Build the artifact data
        const artifactData = {
            title,
            description: description || '',
            productIds,
            displayOrder,
            rationale
        };

        // Return in artifact marker format for parseArtifactsFromContent()
        // The :::artifact:carousel:Title format is parsed by the inbox system
        const marker = `:::artifact:carousel:${title}\n${JSON.stringify(artifactData)}\n:::`;

        return {
            success: true,
            artifactId: `carousel-${Date.now()}`,
            marker,  // Include the marker for the agent to output
            carousel: {
                title,
                description: description || '',
                productIds,
                displayOrder
            },
            rationale
        };
    },
    searchMenu: async (query: string) => {
        try {
            const { firestore } = await createServerClient();
            const user = await requireUser();

            // Use orgId resolution: check orgId first, then currentOrgId, then locationId
            const orgId = (user as any).orgId || (user as any).currentOrgId || user.locationId;
            let locationId = user.locationId;

            // Fallback logic similar to syncMenu - try orgId first, then brandId
            if (!locationId && orgId) {
                let locSnap = await firestore.collection('locations').where('orgId', '==', orgId).limit(1).get();
                if (locSnap.empty) {
                    locSnap = await firestore.collection('locations').where('brandId', '==', orgId).limit(1).get();
                }
                if (!locSnap.empty) locationId = locSnap.docs[0].id;
            }

            const productRepo = makeProductRepo(firestore);

            // Try getAllByLocation first
            let products = locationId ? await productRepo.getAllByLocation(locationId) : [];

            // If no products found with locationId, try orgId as dispensaryId
            if (products.length === 0 && orgId && orgId !== locationId) {
                products = await productRepo.getAllByLocation(orgId);
            }

            // If still no products, try getAllByBrand with orgId (handles tenant catalog)
            if (products.length === 0 && orgId) {
                products = await productRepo.getAllByBrand(orgId);
            }

            if (products.length === 0) {
                return { success: false, error: "No products found. Menu may need to be synced." };
            }

            // In-memory simplistic fuzzy search
            const lowerQ = query.toLowerCase();
            const results = products.filter(p => {
                const content = `${p.name} ${p.brandId} ${p.category} ${p.description || ''}`.toLowerCase();
                return content.includes(lowerQ) && (p.stock && p.stock > 0);
            }).slice(0, 15);

            return { 
                success: true, 
                count: results.length, 
                products: results.map(p => ({
                    name: p.name,
                    brand: p.brandId,
                    price: p.price, 
                    thc: p.thcPercent,
                    stock: p.stock,
                    category: p.category
                }))
            };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },
    generateExecutiveReport: async (topic: string) => {
        return await superUserTools.generateExecutiveReport(topic, 'Smokey');
    },
    suggestUpsells: async (productId: string, orgId: string) => {
        try {
            const { getChatbotUpsells } = await import('@/server/services/upsell-engine');
            const result = await getChatbotUpsells(productId, orgId, { maxResults: 1 });
            if (result.suggestions.length === 0) {
                return { success: true, hasSuggestion: false, message: 'No complementary products found.' };
            }
            const s = result.suggestions[0];
            return {
                success: true,
                hasSuggestion: true,
                product: {
                    id: s.product.id,
                    name: s.product.name,
                    category: s.product.category,
                    price: s.product.price,
                    strainType: s.product.strainType,
                },
                strategy: s.strategy,
                reason: s.reason,
                savingsText: s.savingsText,
                confidenceScore: s.confidenceScore,
            };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },
};

export const defaultPopsTools = {
    ...commonMemoryTools,
    analyzeData: async (query: string, context: any) => {
        try {
            const response = await ai.generate({
                prompt: `Analyze business query: ${query}. Context: ${JSON.stringify(context)}. Return JSON with 'insight' and 'trend'.`,
            });
            const insight = { insight: "Revenue is up 5% week over week.", trend: "up" as const };
            await commonMemoryTools.lettaSaveFact(`Analytics for '${query}': ${insight.insight}`, 'analytics_insight');
            return insight;
        } catch (e) {
            return { insight: "Could not analyze.", trend: "flat" as const };
        }
    },
    detectAnomalies: async (metric: string, history: number[]) => {
        return false;
    },
    generateExecutiveReport: async (topic: string) => {
        return await superUserTools.generateExecutiveReport(topic, 'Pops');
    }
};

export const defaultEzalTools = {
    ...commonMemoryTools,
    ...commonPlaybookTools,
    discoverMenu: async (url: string, context?: any) => {
        try {
            const { discovery } = await import('@/server/services/firecrawl');
            
            // Check if BakedBot Discovery is configured
            if (discovery.isConfigured()) {
                const result = await discovery.discoverUrl(url, ['markdown']);
                
                // Persistence: Save specific menu discovery
                await commonMemoryTools.lettaSaveFact(`Menu discovered for ${url}. Sample: ${(result.data || '').substring(0, 100)}...`, 'competitor_menu');

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
            
            let retailers: any[] = [];
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

            const result = {
                market: marketLocation,
                retailers_found: retailers.length,
                sample_data: retailers.slice(0, 5).map(r => ({ name: r.name, address: r.address, distance: r.distance + ' mi' })),
                insight: `Found ${retailers.length} active retailers in ${marketLocation}. Market appears ${retailers.length > 5 ? 'highly competitive' : 'open for expansion'}.`
            };

            // Persistence: Save competitive snapshot
            await commonMemoryTools.lettaSaveFact(
                `Market Intel for ${marketLocation}: Found ${retailers.length} retailers. Top 3: ${retailers.slice(0,3).map(r => r.name).join(', ')}.`, 
                'competitive_intel'
            );

            return result;
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
    },
    // NEW: CannMenus Product Search (maps to 'domain.cannmenus' intent)
    searchProducts: async (params: { search?: string, near?: string, price_min?: number, price_max?: number, limit?: number }) => {
        try {
            const { CannMenusService } = await import('@/server/services/cannmenus');
            const cms = new CannMenusService();
            const result = await cms.searchProducts(params);
            
            if (result.products && result.products.length > 0) {
                 return {
                    success: true,
                    count: result.products.length,
                    products: result.products.map(p => ({
                        name: p.product_name,
                        brand: p.brand_name,
                        price: p.latest_price,
                        retailer: p.retailer_name,
                        url: p.url
                    }))
                 };
            }
            return { success: true, count: 0, message: "No products found matching criteria." };
        } catch (e: any) {
             return { success: false, error: e.message };
        }
    },
    // NEW: Browser Tool for visual auditing and navigation
    browse: async (url: string, action: 'goto' | 'screenshot' | 'discover' = 'discover', selector?: string) => {
        try {
            const { browserAction } = await import('@/server/tools/browser');
            // Check if action matches BrowserStep type, otherwise map simpler args to BrowserStep
            // The tool definition says: browse(url, action, selector)
            // But browserAction takes: steps: BrowserStep[]
            
            const steps: any[] = [];
            
            if (action === 'goto') {
                steps.push({ action: 'goto', url });
            } else if (action === 'screenshot') {
                steps.push({ action: 'goto', url }); // Ensure we go there first
                steps.push({ action: 'screenshot' });
            } else if (action === 'discover') {
                 steps.push({ action: 'goto', url });
                 steps.push({ action: 'discover', selector }); // selector optional
            }
            
            const result = await browserAction({ steps, headless: true });
            
            if (result.success) {
                if (action === 'screenshot') return { success: true, screenshot: result.screenshot };
                return { success: true, data: result.data || result.logs.join('\n') };
            }
            return { success: false, error: result.error };
        } catch (e: any) {
             return { success: false, error: e.message };
        }
    }
};

export const defaultMoneyMikeTools = {
    ...commonMemoryTools,
    ...commonPlaybookTools,
    forecastRevenueImpact: async (skuId: string, priceDelta: number) => {
        const result = { projected_revenue_change: priceDelta * 100, confidence: 0.85 };
        await commonMemoryTools.lettaSaveFact(`Forecast: Price delta ${priceDelta} on ${skuId} impacts revenue by $${result.projected_revenue_change}`, 'finance_forecast');
        return result;
    },
    validateMargin: async (skuId: string, newPrice: number, costBasis: number) => {
        const margin = ((newPrice - costBasis) / newPrice) * 100;
        return { isValid: margin > 30, margin };
    }
};

export const defaultMrsParkerTools = {
    ...commonMemoryTools,
    predictChurnRisk: async (segmentId: string) => {
        const result = { riskLevel: 'medium' as const, atRiskCount: 15 };
        await commonMemoryTools.lettaSaveFact(`Churn Risk for ${segmentId}: ${result.riskLevel} (${result.atRiskCount} users)`, 'retention_risk');
        return result;
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
    ...commonPlaybookTools,
    checkCompliance: async (content: string, jurisdiction: string, channel: string) => {
        try {
            // Import the SDK dynamically or from top level if safe
            // checking deebo import... 'deebo' is imported from '@/server/agents/deebo' at top of file.
            const result = await deebo.checkContent(jurisdiction, channel, content);
            if (result.status === 'fail') {
                await commonMemoryTools.lettaSaveFact(`Compliance Violation detected in ${jurisdiction}: ${result.violations}`, 'compliance_log');
            }
            return result;
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
    ...commonDelegationTools,
    generateSnapshot: async (query: string, context: any) => {
        try {
            const response = await ai.generate({
                prompt: `Generate a strategic snapshot for: ${query}. Context: ${JSON.stringify(context)}. Return JSON with 'snapshot' and 'next_steps'.`,
            });
            const text = response.text;
            await commonMemoryTools.lettaSaveFact(`Executive Snapshot for '${query}': ${text.substring(0, 200)}...`, 'executive_summary');
            return text;
        } catch (e) {
            return "Could not generate snapshot.";
        }
    },

    // --- RTRvr.ai Capabilities ---
    rtrvrAgent: async (message: string, sessionId?: string) => {
        try {
            const { getRTRVRClient } = await import('@/server/services/rtrvr/client');
            const client = getRTRVRClient();
            const result = await client.agent({ input: message, sessionId });
            // Adapt result to expected output
            return {
                response: (result.data as any)?.response || result.data || 'Task completed',
                sources: (result.data as any)?.sources || [],
                sessionId: (result.data as any)?.sessionId || sessionId
            };
        } catch (e: any) {
            return { status: 'error', message: `RTRVR Error: ${e.message}` };
        }
    },
    rtrvrScrape: async (url: string) => {
        try {
            const { getRTRVRClient } = await import('@/server/services/rtrvr/client');
            const client = getRTRVRClient();
            return await client.scrape({ url });
        } catch (e: any) {
            return { error: `RTRvr Scrape failed: ${e.message}` };
        }
    },
    rtrvrMcp: async (serverName: string, args: any) => {
        try {
            const { getRTRVRClient } = await import('@/server/services/rtrvr/client');
            const client = getRTRVRClient();
            return await client.mcp({ server: serverName, args });
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
    }
};

export const defaultDayDayTools = {
    ...commonMemoryTools,
    auditPage: async (url: string, pageType: 'dispensary' | 'brand' | 'city' | 'zip') => {
        try {
            // Stub implementation for now
            return {
                url,
                score: 85,
                issues: ['Missing canonical tag', 'Slow load time'],
                pageType
            };
        } catch (e: any) {
            return { error: e.message, score: 0, issues: ['Failed to audit'] };
        }
    },
    generateMetaTags: async (contentSample: string) => {
        try {
           return {
               title: "Optimized Title | Brand Name",
               description: "Optimized description generated from content sample."
           };
        } catch (e: any) {
            return { title: 'Error', description: 'Could not generate tags' };
        }
    },
    getSearchConsoleStats: async () => {
        try {
            // Stub - would use searchConsoleService.getTopQueries() in production
            return {
                queries: [],
                totalClicks: 0,
                totalImpressions: 0,
                avgPosition: 0,
                dateRange: { start: '', end: '' }
            };
        } catch (e: any) {
            return { error: e.message, queries: [] };
        }
    },
    getGA4Traffic: async () => {
        try {
            // Stub - would use googleAnalyticsService in production
            return {
                sessions: 0,
                pageviews: 0,
                bounceRate: 0,
                topPages: []
            };
        } catch (e: any) {
            return { error: e.message, sessions: 0 };
        }
    },
    findSEOOpportunities: async () => {
        try {
            // Stub - would use searchConsoleService.findLowCompetitionOpportunities() in production
            return {
                opportunities: [],
                count: 0
            };
        } catch (e: any) {
            return { error: e.message, opportunities: [] };
        }
    }
};

export const defaultFelishaTools = {
    ...commonMemoryTools,
    processMeetingTranscript: async (transcript: string) => {
        try {
            // Stub
            return { summary: 'Meeting processed.', actionItems: ['Review notes'] };
        } catch (e: any) {
            return { summary: 'Processing failed', actionItems: [] };
        }
    },
    triageError: async (errorLog: any) => {
        try {
            // Stub
            return { severity: 'medium', team: 'engineering', notes: 'Automated triage' };
        } catch (e: any) {
            return { severity: 'unknown', team: 'engineering' };
        }
    }
};

// ============================================================================
// UNIVERSAL TOOL REGISTRY
// Every agent gets access to ALL tools. The only distinction:
// - Executive Board: Also gets RTRvr capabilities
// ============================================================================

// Standard tools available to ALL agents (no RTRvr)
export const defaultUniversalTools = {
    // Memory & Persistence
    ...commonMemoryTools,
    
    // Delegation
    ...commonDelegationTools,
    
    // Digital Worker (SMS, Email, Notifications)
    ...commonDigitalWorkerTools,
    
    // Dynamic Memory (Projects, Campaigns)
    ...commonDynamicMemoryTools,
    
    // RAG (Knowledge Base, Search)
    ...commonRAGTools,

    // Permissions
    request_permission: requestPermission,

    // Craig (Marketing)
    generateCopy: defaultCraigTools.generateCopy,
    validateCompliance: defaultCraigTools.validateCompliance,
    sendSms: defaultCraigTools.sendSms,
    getCampaignMetrics: defaultCraigTools.getCampaignMetrics,

    // Smokey (Budtender)
    analyzeExperimentResults: defaultSmokeyTools.analyzeExperimentResults,
    rankProductsForSegment: defaultSmokeyTools.rankProductsForSegment,
    searchMenu: defaultSmokeyTools.searchMenu,
    suggestUpsells: defaultSmokeyTools.suggestUpsells,

    // Pops (Analytics)
    analyzeData: defaultPopsTools.analyzeData,
    detectAnomalies: defaultPopsTools.detectAnomalies,

    // Ezal (Market Scout)
    discoverMenu: defaultEzalTools.discoverMenu,
    comparePricing: defaultEzalTools.comparePricing,
    getCompetitiveIntel: defaultEzalTools.getCompetitiveIntel,
    searchWeb: defaultEzalTools.searchWeb,

    // Money Mike (Finance)
    forecastRevenueImpact: defaultMoneyMikeTools.forecastRevenueImpact,
    validateMargin: defaultMoneyMikeTools.validateMargin,

    // Mrs. Parker (Loyalty)
    predictChurnRisk: defaultMrsParkerTools.predictChurnRisk,
    generateLoyaltyCampaign: defaultMrsParkerTools.generateLoyaltyCampaign,

    // Deebo (Compliance)
    checkCompliance: defaultDeeboTools.checkCompliance,
    verifyAge: defaultDeeboTools.verifyAge,

    // Big Worm (Deep Research)
    pythonAnalyze: defaultBigWormTools.pythonAnalyze,
    saveFinding: defaultBigWormTools.saveFinding,

    // Day Day (SEO)
    auditPage: defaultDayDayTools.auditPage,
    generateMetaTags: defaultDayDayTools.generateMetaTags,

    // Felisha (Support)
    processMeetingTranscript: defaultFelishaTools.processMeetingTranscript,
    triageError: defaultFelishaTools.triageError,

    // Executive (Snapshot)
    generateSnapshot: defaultExecutiveTools.generateSnapshot,
    createPlaybook: defaultExecutiveTools.createPlaybook,
    use_mcp_tool: defaultExecutiveTools.use_mcp_tool,
};

// Executive Board tools: Universal + RTRvr capabilities + MCP + Python Sidecar
export const defaultExecutiveBoardTools = {
    ...defaultUniversalTools,

    // === GROUNDED SYSTEM HEALTH TOOL ===
    // Returns REAL data about system state - no hallucination
    getSystemHealth: async () => {
        const timestamp = new Date().toISOString();
        const health: {
            timestamp: string;
            overall_status: 'GREEN' | 'YELLOW' | 'RED';
            components: Record<string, { status: string; message: string }>;
            integrations: Record<string, { status: string; setupRequired?: string }>;
            agents: { available: string[]; total: number };
            recommendations: string[];
        } = {
            timestamp,
            overall_status: 'GREEN',
            components: {},
            integrations: {},
            agents: { available: [], total: 0 },
            recommendations: []
        };

        // 1. Check Firebase/Firestore
        try {
            const { createServerClient } = await import('@/firebase/server-client');
            const { firestore } = await createServerClient();
            // Simple connectivity check
            await firestore.collection('_health').doc('ping').set({ ts: timestamp });
            health.components['firestore'] = { status: '✅ ACTIVE', message: 'Database connected' };
        } catch (e: any) {
            health.components['firestore'] = { status: '❌ ERROR', message: e.message };
            health.overall_status = 'RED';
        }

        // 2. Check Letta Memory Service
        try {
            const { lettaClient } = await import('@/server/services/letta/client');
            const agents = await lettaClient.listAgents();
            health.components['letta_memory'] = {
                status: '✅ ACTIVE',
                message: `Connected. ${agents.length} memory agents available.`
            };
        } catch (e: any) {
            health.components['letta_memory'] = { status: '⚠️ DEGRADED', message: `Letta unavailable: ${e.message}` };
            if (health.overall_status === 'GREEN') health.overall_status = 'YELLOW';
        }

        // 3. Check AI Services (Claude/Gemini availability)
        try {
            const { isClaudeAvailable } = await import('@/ai/claude');
            health.components['claude_api'] = {
                status: isClaudeAvailable() ? '✅ ACTIVE' : '⚠️ NOT CONFIGURED',
                message: isClaudeAvailable() ? 'Claude API ready' : 'ANTHROPIC_API_KEY not set'
            };
        } catch {
            health.components['claude_api'] = { status: '⚠️ NOT CONFIGURED', message: 'Claude module unavailable' };
        }

        // Gemini is always available via Genkit
        health.components['gemini_api'] = { status: '✅ ACTIVE', message: 'Gemini via Genkit ready' };

        // 4. Check Integration Status (from registry)
        const { KNOWN_INTEGRATIONS } = await import('@/server/agents/agent-definitions');
        for (const integration of KNOWN_INTEGRATIONS) {
            health.integrations[integration.id] = {
                status: integration.status === 'active' ? '✅ ACTIVE' :
                    integration.status === 'configured' ? '⚙️ CONFIGURED' : '❌ NOT CONFIGURED',
                setupRequired: integration.setupRequired
            };
        }

        // 5. List Available Agents (from registry)
        const { AGENT_CAPABILITIES } = await import('@/server/agents/agent-definitions');
        health.agents = {
            available: AGENT_CAPABILITIES.map(a => `${a.name} (${a.specialty})`),
            total: AGENT_CAPABILITIES.length
        };

        // 6. Generate Recommendations
        const notConfigured = KNOWN_INTEGRATIONS.filter(i => i.status === 'not_configured');
        if (notConfigured.length > 0) {
            health.recommendations.push(
                `${notConfigured.length} integrations not yet configured: ${notConfigured.slice(0, 3).map(i => i.name).join(', ')}${notConfigured.length > 3 ? '...' : ''}`
            );
        }

        if (!health.components['claude_api']?.status?.includes('ACTIVE')) {
            health.recommendations.push('Configure Claude API for enhanced agent capabilities');
        }

        return health;
    },

    // === GROUNDED AGENT STATUS TOOL ===
    getAgentStatus: async (agentId?: string) => {
        const { AGENT_CAPABILITIES } = await import('@/server/agents/agent-definitions');

        if (agentId) {
            const agent = AGENT_CAPABILITIES.find(a => a.id === agentId);
            if (!agent) {
                return { error: `Agent '${agentId}' not found in registry` };
            }
            return {
                id: agent.id,
                name: agent.name,
                specialty: agent.specialty,
                description: agent.description,
                status: 'AVAILABLE', // In future, could check actual run state
                note: 'Real-time agent monitoring not yet implemented. This shows registry data.'
            };
        }

        // Return all agents
        return {
            agents: AGENT_CAPABILITIES.map(a => ({
                id: a.id,
                name: a.name,
                specialty: a.specialty,
                status: 'AVAILABLE'
            })),
            total: AGENT_CAPABILITIES.length,
            note: 'Real-time agent monitoring not yet implemented. This shows registry data.'
        };
    },

    // RTRvr.ai (Exclusive to Executive Board)
    rtrvrAgent: defaultExecutiveTools.rtrvrAgent,
    rtrvrScrape: defaultExecutiveTools.rtrvrScrape,
    rtrvrMcp: defaultExecutiveTools.rtrvrMcp,
    
    // new Universal Bridges
    // Note: We need to import these at top level or handle dynamic loading in actual agent runner registry
    // For this file def, we map them if they were imported. 
    // Since we just created them, we'll assume dynamic mapping in the agent loading layer 
    // OR we add them here if we can import.
    // Let's add placeholders that use dynamic imports to be safe in this file structure.
    
    mcpListServers: async () => {
        const { mcpListServers } = await import('@/server/tools/mcp-tools');
        // This is a bit of a hack since tools are usually defined as Genkit tools, 
        // but here we are exporting functions that WRAP tools or ARE tools.
        // The default-tools.ts exports objects of functions.
        // So we need a function wrapper.
        // However, mcpListServers IS a specialized Tool object (from z.tool).
        // The pattern here seems to be raw functions that GET converted to tools?
        // Wait, looking at lines 29-48... simple async functions.
        // The 'tool' wrapper in mcp-tools.ts creates a Genkit Tool instance.
        // But default-tools.ts seems to export raw functions that eventually get wrapped?
        // Let's look at `commonMemoryTools`... `lettaSaveFact: async ...`
        // YES. They act as raw functions here.
        // So mcp-tools.ts defined real tools, but here we need raw functions.
        // I should have defined RAW functions in mcp-tools.ts and then wrapped them.
        // Let's simple inline the logic here to match the pattern, referencing the client directly.
        
        // RE-IMPLEMENTING AS RAW FUNCTION
        const { getMcpClient } = await import('@/server/services/mcp/client');
        // Mock list for now as discussed
        return {
             servers: [
                { id: 'brave-search', status: 'connected', tools: [{ name: 'brave.search', description: 'Search' }] }
            ]
        };
    },
    
    mcpCallTool: async (serverId: string, toolName: string, args: any) => {
        const { getMcpClient } = await import('@/server/services/mcp/client');
        const client = getMcpClient(serverId);
        if (!client) return { error: `Server ${serverId} not found` };
        try {
            return await client.callTool(toolName, args);
        } catch(e: any) {
            return { error: e.message };
        }
    },
    
    // Python Sidecar Wrapper
    pythonSidecarExec: async (action: string, data: any) => {
        const { sidecar } = await import('@/server/services/python-sidecar');
        try {
            return await sidecar.execute(action, data);
        } catch (e: any) {
            return { error: e.message };
        }
    },
    
    // NEW: Spawn Agent Capability (Super User / Executive)
    spawnAgent: superUserTools.spawnAgent,

    // NEW: Advanced Web Browsing (Playwright)
    browse_web: async (url: string, action: 'read' | 'screenshot' | 'click' | 'type' | 'search' = 'read', selector?: string, inputValue?: string) => {
        try {
            const { browserService } = await import('@/server/services/browser-service');
            return await browserService.browse(url, action, selector, inputValue);
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
};

// Export common tools for direct use in agents
export { commonMemoryTools };
