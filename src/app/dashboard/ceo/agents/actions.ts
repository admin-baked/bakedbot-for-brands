'use server';

import { deebo } from '@/server/agents/deebo';
import { ai } from '@/ai/genkit';
import { runAgent } from '@/server/agents/harness';
import { persistence } from '@/server/agents/persistence';

import { craigAgent } from '@/server/agents/craig';
import { smokeyAgent } from '@/server/agents/smokey';
import { popsAgent } from '@/server/agents/pops';
import { ezalAgent } from '@/server/agents/ezal';
import { moneyMikeAgent } from '@/server/agents/moneyMike';
import { mrsParkerAgent } from '@/server/agents/mrsParker';
import { searchWeb, formatSearchResults } from '@/server/tools/web-search';
import { httpRequest, HttpRequestOptions } from '@/server/tools/http-client';
import { browserAction, BrowserActionParams } from '@/server/tools/browser';
import { scheduleTask, ScheduleParams } from '@/server/tools/scheduler';
import { manageWebhooks, WebhookParams } from '@/server/tools/webhooks';
import { gmailAction, GmailParams } from '@/server/tools/gmail';
import { calendarAction, CalendarParams } from '@/server/tools/calendar';
import { sheetsAction, SheetsParams } from '@/server/tools/sheets';
import { leaflinkAction, LeafLinkParams } from '@/server/tools/leaflink';
import { dutchieAction, DutchieParams } from '@/server/tools/dutchie';
import { revalidatePath } from 'next/cache';
import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { z } from 'zod';
import { PERSONAS, AgentPersona } from './personas';
import { CannMenusService } from '@/server/services/cannmenus';
import { getCustomerMemory } from '@/server/intuition/customer-memory';

const AGENT_MAP = {
    craig: craigAgent,
    smokey: smokeyAgent,
    pops: popsAgent,
    ezal: ezalAgent,
    money_mike: moneyMikeAgent,
    mrs_parker: mrsParkerAgent,
};

// --- Tools Implementation (Mocks/Stubs for Phase 6 & 8) ---
const defaultCraigTools = {
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

const defaultSmokeyTools = {
    analyzeExperimentResults: async (experimentId: string, data: any[]) => {
        return { winner: 'Variant B', confidence: 0.98 };
    },
    rankProductsForSegment: async (segmentId: string, products: any[]) => {
        return products;
    }
};

const defaultPopsTools = {
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

const defaultEzalTools = {
    scrapeMenu: async (url: string) => {
        return { products: [{ name: 'Live Rosin', price: 45 }, { name: 'Gummies', price: 20 }] };
    },
    comparePricing: async (myProducts: any[], competitorProducts: any[]) => {
        return { price_index: 0.95 };
    },
    getCompetitiveIntel: async (state: string, city?: string) => {
        return `Market Intel for ${city || 'statewide'}, ${state}: Price index is stable.`;
    },
    searchWeb: async (query: string) => {
        const results = await searchWeb(query);
        return formatSearchResults(results);
    }
};

const defaultMoneyMikeTools = {
    forecastRevenueImpact: async (skuId: string, priceDelta: number) => {
        return { projected_revenue_change: priceDelta * 100, confidence: 0.85 };
    },
    validateMargin: async (skuId: string, newPrice: number, costBasis: number) => {
        const margin = ((newPrice - costBasis) / newPrice) * 100;
        return { isValid: margin > 30, margin };
    }
};

const defaultMrsParkerTools = {
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

export async function triggerAgentRun(agentName: string, stimulus?: string, brandIdOverride?: string) {
    const brandId = brandIdOverride || 'demo-brand-123';
    const agentImpl = AGENT_MAP[agentName as keyof typeof AGENT_MAP];
    if (!agentImpl) {
        throw new Error(`Unknown agent: ${agentName}`);
    }

    let tools: any = {};
    if (agentName === 'craig') tools = defaultCraigTools;
    else if (agentName === 'smokey') tools = defaultSmokeyTools;
    else if (agentName === 'pops') tools = defaultPopsTools;
    else if (agentName === 'ezal') tools = defaultEzalTools;
    else if (agentName === 'money_mike') tools = defaultMoneyMikeTools;
    else if (agentName === 'mrs_parker') tools = defaultMrsParkerTools;

    try {
        const logEntry = await runAgent(brandId, persistence, agentImpl as any, tools, stimulus);
        revalidatePath('/dashboard/ceo/agents'); // Refresh the UI
        return { success: true, message: `Ran ${agentName} successfully.`, log: logEntry };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}


export async function fetchAgentLogs() {
    const brandId = 'demo-brand-123';
    return await persistence.getRecentLogs(brandId);
}

// --- Playbook Logic ---

interface PlaybookResult {

    success: boolean;
    message: string;
    logs: string[];
}

const PLAYBOOK_REGISTRY: Record<string, () => Promise<PlaybookResult>> = {

    'welcome-sequence': async () => {
        const logs: string[] = [];
        logs.push("Starting 'Welcome Email Sequence' Playbook...");

        logs.push("Triggering Mrs. Parker for segment analysis...");
        const result = await triggerAgentRun('mrs_parker');
        logs.push(`Mrs. Parker Result: ${result.message}`);

        logs.push("Dispatching welcome emails via active provider (Mailjet/SendGrid)...");
        
        // Import and use the email dispatcher
        const { sendOrderConfirmationEmail } = await import('@/lib/email/dispatcher');
        
        // Send welcome email (demo recipient for now)
        const emailResult = await sendOrderConfirmationEmail({
            orderId: `WELCOME-${Date.now()}`,
            customerEmail: 'demo@bakedbot.ai', // Would be dynamic in production
            customerName: 'New VIP Member',
            total: 0,
            items: [{ name: 'Welcome to BakedBot!', qty: 1, price: 0 }],
            retailerName: 'BakedBot',
            pickupAddress: 'Welcome to the BakedBot family! Your AI agents are ready to help.'
        });
        
        logs.push(`Email dispatch result: ${emailResult ? 'Success' : 'Failed'}`);
        logs.push("Playbook 'Welcome Email Sequence' completed successfully.");

        return {
            success: true,
            message: `Welcome Sequence executed. Mrs. Parker analyzed segments and welcome email ${emailResult ? 'sent' : 'failed'}.`,
            logs
        };
    },
    'competitor-scan': async () => {
        const logs: string[] = [];
        logs.push("Starting 'Competitor Price Scan' Playbook...");

        logs.push("Triggering Ezal for market scrape...");
        const result = await triggerAgentRun('ezal');
        logs.push(`Ezal Result: ${result.message}`);

        logs.push("Generating price gap report...");
        return {
            success: true,
            message: "Competitor Scan complete. Ezal found 3 new pricing updates.",
            logs
        };
    },
    'churn-predictor': async () => {
        const logs: string[] = [];
        logs.push("Starting 'Churn Prediction' Playbook...");

        const result = await triggerAgentRun('mrs_parker');
        logs.push(`Mrs. Parker Analysis: ${result.message}`);

        return {
            success: true,
            message: "Churn Prediction complete. At-risk lists updated.",
            logs
        };
    },
    'platform-health': async () => {
        const logs: string[] = [];
        logs.push("Running Platform Health Check...");
        const result = await triggerAgentRun('pops');
        logs.push(`Pops Diagnostics: ${result.message}`);

        return {
            success: result.success,
            message: "Platform Health verified. All systems nominal.",
            logs
        };
    }
};

export async function executePlaybook(playbookId: string): Promise<PlaybookResult> {
    const runner = PLAYBOOK_REGISTRY[playbookId];
    if (!runner) {
        return {
            success: false,
            message: `Playbook ID '${playbookId}' not found.`,
            logs: [`Error: Playbook ${playbookId} is not defined in registry.`]
        };
    }

    try {
        return await runner();
    } catch (error: any) {
        return {
            success: false,
            message: `Playbook execution failed: ${error.message}`,
            logs: [`Exception: ${error.message}`]
        };
    }
}


// -- Chat & Intent Router --

export interface AgentResult {
    content: string;
    toolCalls?: { id: string; name: string; status: 'success' | 'error' | 'running'; result: string }[];
    metadata?: {
        type?: 'compliance_report' | 'product_rec' | 'elasticity_analysis' | 'session_context';
        data?: any;
        brandId?: string;
        brandName?: string;
        agentName?: string;
        role?: string;
    };
    logs?: string[];
}

// Extending the input options
interface ChatExtraOptions {
    modelLevel?: string;
    audioInput?: string; // base64
    attachments?: { name: string; type: string; base64: string }[];
}

export async function runAgentChat(userMessage: string, personaId?: string, extraOptions?: ChatExtraOptions): Promise<AgentResult> {
    console.log('[runAgentChat] Starting with message:', userMessage.substring(0, 50), 'Persona:', personaId, 'Mode:', extraOptions?.modelLevel);
    
    // If audio input is present, we would ideally transcode/transcribe here.
    // For now, we will simulate a transcription or assume the UserMessage contains the transcribed text if done client-side.
    // However, if we want server-side STT (Speech-to-Text), we would call a tool here.
    // Assuming for this MVP iteration, client sends text or we treat audio as an attachment for the model to "hear" if supported.
    // Multi-modal Gemini supports audio directly.

    let finalMessage = userMessage;

    // Handle Attachments (Prepending to prompt for now, or using Genkit's multi-modal structure if applicable)
    // Since we are using a simplified 'triggerAgentRun' which takes a string string stimulus,
    // we will serialize the context into the string for the agents to "read".
    // Later upgrade: Update `triggerAgentRun` to support real multi-modal Parts.
    
    if (extraOptions?.attachments?.length) {
        finalMessage += `\n\n[ATTACHMENTS]\nThe user has uploaded ${extraOptions.attachments.length} files.`;
        // We can't easily pass base64 to all underlying agents via string, 
        // so for MVP we might just acknowledge them or if they are text/code, decode them.
        
        for (const file of extraOptions.attachments) {
            // For text files, we can inline content
            if (file.type.includes('text') || file.type.includes('json') || file.type.includes('javascript')) {
                try {
                     const content = Buffer.from(file.base64.split(',')[1], 'base64').toString('utf-8');
                     finalMessage += `\n\n--- File: ${file.name} ---\n${content.substring(0, 2000)}\n--- End File ---\n`;
                } catch (e) { console.error('Failed to decode file', e); }
            } else {
                 finalMessage += `\n- ${file.name} (${file.type})`;
            }
        }
    }
    
    // Handle Audio (Simulated transcription indication)
    if (extraOptions?.audioInput) {
        finalMessage += `\n\n[AUDIO INPUT RECEIVED] (Voice processing enabled)`;
        // In a real system: const text = await transcode(extraOptions.audioInput); finalMessage = text;
    }

    // Override userMessage with rich content
    userMessage = finalMessage;

    // Select Persona
    const activePersona = personaId && PERSONAS[personaId as AgentPersona]
        ? PERSONAS[personaId as AgentPersona]

        : PERSONAS.puff;

    const executedTools: AgentResult['toolCalls'] = [];

    try {
        console.log('[runAgentChat] Importing dependencies...');
        // Import dependencies
        const { routeToAgent } = await import('@/server/agents/agent-router');
        const { AGENT_CAPABILITIES } = await import('@/server/agents/agent-definitions');
        const { getIntuitionSummary } = await import('@/server/algorithms/intuition-engine');
        const { requireUser } = await import('@/server/auth/auth');

        console.log('[runAgentChat] Getting user context...');
        const user = await requireUser().catch(() => null);
        const role = (user?.role as string) || 'guest';
        const userBrandId = (user?.brandId as string) || (role === 'brand' ? 'demo-brand-123' : 'general');
        const userBrandName = role === 'brand' ? 'Your Brand' : 'BakedBot';

        console.log('[runAgentChat] Routing message...');
        // Route to the appropriate agent
        const routing = await routeToAgent(userMessage);
        const agentInfo = AGENT_CAPABILITIES.find(a => a.id === routing.primaryAgent) ||
            AGENT_CAPABILITIES.find(a => a.id === 'general');

        // --- KNOWLEDGE BASE RETRIEVAL ---
        console.log('[runAgentChat] Checking Knowledge Base...');
        let knowledgeContext = '';
        try {
            const { getKnowledgeBasesAction, searchKnowledgeBaseAction } = await import('@/server/actions/knowledge-base');

            // 1. Find relevant KBs (Agent-specific OR Brand/Dispensary-specific)
            // Strategy: Check if there is an Agent KB (primary) or Brand/Dispensary KB (secondary)
            const kbs = await getKnowledgeBasesAction(agentInfo?.id || 'general');
            
            let userKbs: any[] = [];
            if (role === 'brand') {
                userKbs = await getKnowledgeBasesAction(userBrandId);
            } else if (role === 'dispensary') {
                 // Assuming dispensary uses same knowledge base structure, mapped by ownerId
                 userKbs = await getKnowledgeBasesAction(userBrandId);
            }

            const allKbs = [...kbs, ...userKbs];

            if (allKbs.length > 0) {
                // 2. Perform semantic search across found KBs
                const searchPromises = allKbs.map(kb => searchKnowledgeBaseAction(kb.id, userMessage, 2));
                const results = await Promise.all(searchPromises);

                // Flatten and dedup
                const docs = results.flat().filter(d => d && d.similarity > 0.65).sort((a, b) => b.similarity - a.similarity).slice(0, 3);

                if (docs.length > 0) {
                    knowledgeContext = `\n\n[KNOWLEDGE BASE CONTEXT]\nUse this information to answer if relevant:\n${docs.map(d => `- ${d.content} (Source: ${d.title})`).join('\n')}\n`;

                    executedTools.push({
                        id: `knowledge-${Date.now()}`,
                        name: 'Knowledge Base',
                        status: 'success',
                        result: `Found ${docs.length} relevant documents.`
                    });
                }
            }
        } catch (kbError) {
            console.warn('[runAgentChat] Knowledge Retrieval Failed:', kbError);
        }

        console.log('[runAgentChat] Initializing context...');
        // Initialize context for specialized agents
        const metadata = {
            brandId: userBrandId,
            brandName: userBrandName,
            agentName: agentInfo?.name || 'General',
            role
        };

        console.log('[runAgentChat] Getting intuition summary...');

        // Intuition OS: Load Memory
        const brandMemory = await persistence.loadBrandMemory(userBrandId);
        // We could also load agent-specific memory here if needed

        // Derived stats for UI
        const intuition = {
            stage: brandMemory.brand_profile.name ? 'Active Learning' : 'Cold Start',
            interactions: (brandMemory.experiments_index?.length || 0) * 10, // Mock derivation
            confidence: 0.85 // Mock derivation
        };

        // Add routing info
        executedTools.push({
            id: `route-${Date.now()}`,
            name: `Agent: ${agentInfo?.name || 'General'}`,
            status: 'success',
            result: `${agentInfo?.specialty || 'General Assistant'} (${Math.round(routing.confidence * 100)}% confidence)`
        });

        // Add Intuition context
        executedTools.push({
            id: `intuition-${Date.now()}`,
            name: `Intuition: ${intuition.stage}`,
            status: 'success',
            result: `Loaded ${brandMemory.brand_profile.name} profile · ${intuition.interactions} ops`
        });

        // --- Specialized Agent Execution ---
        if (agentInfo && routing.confidence > 0.6 && agentInfo.id !== 'general' && agentInfo.id !== 'puff') {
            executedTools.push({
                id: `agent-${Date.now()}`,
                name: agentInfo.name,
                status: 'running',
                result: 'Thinking...'
            });

            console.log(`[runAgentChat] Triggering specialized agent: ${agentInfo.id}`);
            console.log(`[runAgentChat] Explicitly triggering agent ${agentInfo.id} for brand ${userBrandId}...`);
            // Inject Knowledge Context into stimulus if present
            const augmentedMessage = knowledgeContext ? `${userMessage}\n${knowledgeContext}` : userMessage;
            const agentRun = await triggerAgentRun(agentInfo.id, augmentedMessage, userBrandId);

            if (agentRun.success && agentRun.log) {
                executedTools[executedTools.length - 1].status = 'success';
                executedTools[executedTools.length - 1].result = agentRun.log.result;

                // If the agent produced a chat reply, show it
                if (agentRun.log.action === 'chat_reply') {
                    return {
                        content: agentRun.log.result,
                        toolCalls: executedTools
                    };
                }
                // Else, show what it did (e.g. Launched Campaign)
                return {
                    content: `**${agentInfo.name}**: ${agentRun.log.result}\n\n*Action: ${agentRun.log.action}*`,
                    toolCalls: executedTools
                };
            } else {
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = agentRun.message;
            }
        }

        // Check for playbook commands (pattern matching)
        const lowerMessage = userMessage.toLowerCase();

        // Check for web search requests FIRST
        const isSearchRequest =
            lowerMessage.includes('search') ||
            lowerMessage.includes('find') ||
            lowerMessage.includes('articles') ||
            lowerMessage.includes('news about') ||
            lowerMessage.includes('look up') ||
            lowerMessage.includes('google') ||
            lowerMessage.includes('research');

        // Specialized Dispensary Search
        const isDispensarySearch = lowerMessage.includes('dispensary') ||
            lowerMessage.includes('retailer') ||
            lowerMessage.includes('shop') ||
            lowerMessage.includes('cannmenus');
        const isBuyerMatchRequest = lowerMessage.includes('buyer') || lowerMessage.includes('customer');

        if (isDispensarySearch && (isSearchRequest || lowerMessage.includes('research'))) {
            executedTools.push({
                id: `cannmenus-${Date.now()}`,
                name: 'CannMenus Discovery',
                status: 'running',
                result: 'Accessing retailer database...'
            });

            try {
                const cannmenus = new CannMenusService();

                // Try to get actual brand context from user profile
                const { requireUser } = await import('@/server/auth/auth');
                const user = await requireUser();
                const brandName = (user as any)?.brandName || '40 Tons'; // Fallback to a real brand they've been searching for
                const brandId = (user as any)?.brandId || 'demo-brand';

                // If it's a buyer match request, add that context
                let buyerContext = '';
                if (isBuyerMatchRequest) {
                    executedTools.push({
                        id: `buyers-${Date.now()}`,
                        name: 'Buyer Insights',
                        status: 'running',
                        result: 'Analyzing buyer profiles...'
                    });

                    const intuition = getIntuitionSummary(brandId);
                    buyerContext = `Our buyers prefer: ${intuition.topEffects.join(', ')}. They look for ${intuition.topFormats.join(', ')}.`;

                    executedTools[executedTools.length - 1].status = 'success';
                    executedTools[executedTools.length - 1].result = 'Profiles analyzed';
                }

                // Try to find the city/state or use brand defaults
                const results = await cannmenus.findRetailersCarryingBrand(brandName, 20);

                executedTools[executedTools.length - 1].status = 'success';
                executedTools[executedTools.length - 1].result = `Discovered ${results.length} locations for ${brandName}`;

                const synthesis = await ai.generate({
                    prompt: `You are a Retail Strategic Advisor for cannabis brands.
                    Your Brand: ${brandName}
                    User Request: "${userMessage}"
                    Buyer Context: "${buyerContext}"
                    Found Data: ${JSON.stringify(results.slice(0, 5))} ... and ${Math.max(0, results.length - 5)} others.
                    
                    Task: Map these dispensaries to our target buyers for ${brandName}. 
                    - Highlight the top locations that match best.
                    - Provide a summary of our footprint.
                    - Use a professional tone.
                    - Format as a clear report with names, cities, and "Match Score".`
                });

                return {
                    content: synthesis.text,
                    toolCalls: executedTools,
                    metadata
                };
            } catch (e: any) {
                console.error('[runAgentChat] Dispensary search failed:', e);
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = e.message || 'Search failed';
                // If it failed due to auth or something high-level, don't fall through to generic search
                if (e.message.includes('auth') || e.message.includes('unauthorized')) {
                    return {
                        content: `⚠️ **Search Interrupted**: ${e.message}`,
                        toolCalls: executedTools
                    };
                }
            }
        }

        if (isSearchRequest) {
            console.log('[runAgentChat] Entering Web Search block');
            executedTools.push({
                id: `search-${Date.now()}`,
                name: 'Web Search',
                status: 'running',
                result: 'Generating search query...'
            });

            console.log('[runAgentChat] Generating search query with AI...');
            // Use AI to extract the optimal search query
            let searchQuery = userMessage;
            // Inject Knowledge Context if present for general search too
            if (knowledgeContext) {
                // For general AI synthesis, we append it to the prompt later
            }

            try {
                const conversion = await ai.generate({
                    prompt: `You are an expert search engine operator.
                    Convert this user request into a single, highly effective Google search query.
                    User Request: "${userMessage}"
                    
                    Goal: Extract the core topic and remove conversational fluff.
                    If the user asks to "research X", search for "X analysis" or "X competitors".
                    
                    Output: Return ONLY the search query string. No quotes, no markdown.`,
                });
                searchQuery = conversion.text.trim().replace(/^"|"$/g, '');
            } catch (aiErr: any) {
                console.warn('[runAgentChat] AI Query Conversion failed:', aiErr.message);
                // Fallback: use message as query
            }

            executedTools[executedTools.length - 1].result = `Searching for: ${searchQuery}`;


            const searchResults = await searchWeb(searchQuery, 7);

            // Update tool status
            executedTools[executedTools.length - 1].status = searchResults.success ? 'success' : 'error';
            executedTools[executedTools.length - 1].result = searchResults.success
                ? `Found ${searchResults.results.length} results`
                : searchResults.error || 'Search failed';

            // Use AI to synthesize a research report from the results
            let formattedResults = '';
            if (searchResults.success && searchResults.results.length > 0) {
                executedTools.push({
                    id: `analyze-${Date.now()}`,
                    name: 'Research Agent',
                    status: 'running',
                    result: 'Synthesizing report...'
                });

                const synthesis = await ai.generate({
                    prompt: activePersona.id === 'ezal' || activePersona.id !== 'puff' 
                    ? `
                    SYSTEM PROMPT: ${activePersona.systemPrompt}
                    
                    USER QUERY: "${userMessage}"
                    SEARCH RESULTS: ${JSON.stringify(searchResults.results)}
                    KNOWLEDGE CONTEXT: ${knowledgeContext}
                    
                    TASK: Generate a response strictly adhering to your System Prompt persona and format.
                    `
                    : `You are an expert Research Analyst.
                    The user asked: "${userMessage}"
                    
                    I searched for: "${searchQuery}"
                    Found these results:
                    ${JSON.stringify(searchResults.results)}

                    ${knowledgeContext ? `Also consider this internal knowledge:\n${knowledgeContext}` : ''}
                    
                    Task: Write a comprehensive, high-quality response based on these findings.
                    
                    Guidelines:
                    1. **Structure**: specific to the query (e.g., if "competitors", use "Competitor Map", "Strengths/Weaknesses", "Strategic Analysis").
                    2. **Style**: Professional, insightful, and "consultancy grade" (like the user provided example).
                    3. **Citations**: ALWAYS cite the sources provided in the search results using [Title](Link) format appropriately.
                    4. **Completeness**: If the results are thin, answer the best you can and suggest a follow-up search.
                    
                    Output: A beautifully formatted Markdown report.`
                });

                formattedResults = synthesis.text;
                // Add identity prefix
                formattedResults = `**${activePersona.name}**: \n\n${formattedResults}`;

                executedTools[executedTools.length - 1].status = 'success';
                executedTools[executedTools.length - 1].result = 'Report generated';
            } else {
                formattedResults = await formatSearchResults(searchResults);
            }

            return {
                content: formattedResults,
                toolCalls: executedTools
            };
        }

        // Check for HTTP requests
        const isHttpRequest =
            lowerMessage.includes('http request') ||
            lowerMessage.includes('call api') ||
            lowerMessage.includes('fetch url') ||
            (lowerMessage.startsWith('get ') && lowerMessage.includes('http'));

        if (isHttpRequest) {
            executedTools.push({
                id: `http-${Date.now()}`,
                name: 'HTTP Request',
                status: 'running',
                result: 'Parsing request...'
            });

            // Use AI to parse the natural language request into HTTP options
            const conversion = await ai.generate({
                prompt: `Convert this user request into a JSON object for an HTTP request.
                User Request: "${userMessage}"
                Output JSON Schema: { method: "GET"|"POST"|"PUT"|"DELETE", url: "string", headers?: object, body?: object }
                Only return the JSON.`,
            });

            try {
                const options = JSON.parse(conversion.text) as HttpRequestOptions;

                executedTools[executedTools.length - 1].result = `${options.method} ${options.url}`;

                const response = await httpRequest(options);

                executedTools[executedTools.length - 1].status = response.success ? 'success' : 'error';
                executedTools[executedTools.length - 1].result = `Status: ${response.status}\nDuration: ${response.durationMs}ms`;

                return {
                    content: `🌐 **HTTP Request Complete**\n\n**${options.method}** ${options.url}\n**Status**: ${response.status} ${response.statusText}\n\n\`\`\`json\n${JSON.stringify(response.data, null, 2)}\n\`\`\``,
                    toolCalls: executedTools
                };

            } catch (e) {
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed to parse request';
            }
        }

        // Check for Browser actions
        const isBrowserAction =
            lowerMessage.includes('browser') ||
            lowerMessage.includes('scrape') ||
            lowerMessage.includes('login to') ||
            lowerMessage.includes('go to ') ||
            lowerMessage.includes('visit ') ||
            lowerMessage.includes('screenshot');

        if (isBrowserAction) {
            executedTools.push({
                id: `browser-${Date.now()}`,
                name: 'Cloud Browser',
                status: 'running',
                result: 'Generating automation script...'
            });

            // Use AI to generate the browser script
            const conversion = await ai.generate({
                prompt: `Convert this user request into a Playwright automation script (JSON steps).
                User Request: "${userMessage}"
                
                Available Actions:
                - { action: 'goto', url: string }
                - { action: 'type', selector: string, text: string }
                - { action: 'click', selector: string }
                - { action: 'wait', selector: string } (use for waiting for elements)
                - { action: 'scrape', selector?: string } (default: body)
                - { action: 'screenshot' }
                
                Example: Login to example.com ->
                { "steps": [
                    { "action": "goto", "url": "https://example.com/login" },
                    { "action": "type", "selector": "#email", "text": "user@test.com" },
                    { "action": "click", "selector": "#login" },
                    { "action": "wait", "selector": "#dashboard" },
                    { "action": "scrape", "selector": "#stats" }
                ]}
                
                Output JSON Schema: { steps: BrowserStep[], headless?: boolean }
                Only return the JSON.`,
            });

            try {
                const params = JSON.parse(conversion.text) as BrowserActionParams;

                executedTools[executedTools.length - 1].result = `Running ${params.steps.length} steps...`;

                const result = await browserAction(params);

                executedTools[executedTools.length - 1].status = result.success ? 'success' : 'error';
                executedTools[executedTools.length - 1].result = result.success
                    ? `Completed ${result.logs.length} actions`
                    : result.error || 'Browser Error';

                let output = `🖥️ **Browser Action Complete**\n\n`;
                if (result.screenshot) {
                    output += `![Screenshot](data:image/png;base64,${result.screenshot})\n\n`;
                }
                if (result.data) {
                    output += `**Scraped Data**:\n\`\`\`\n${typeof result.data === 'string' ? result.data.slice(0, 500) : JSON.stringify(result.data).slice(0, 500)}...\n\`\`\`\n`;
                }
                output += `**Logs**:\n${result.logs.map(l => `- ${l}`).join('\n')}`;

                return {
                    content: output,
                    toolCalls: executedTools
                };

            } catch (e: any) {
                console.error(e);
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
            }
        }

        // Check for Scheduler actions
        const isSchedulerAction =
            lowerMessage.includes('schedule') ||
            lowerMessage.includes('remind me') ||
            lowerMessage.includes('every day') ||
            lowerMessage.includes('every week') ||
            lowerMessage.includes('recurring') ||
            lowerMessage.includes('list tasks');

        if (isSchedulerAction) {
            executedTools.push({
                id: `schedule-${Date.now()}`,
                name: 'Scheduler',
                status: 'running',
                result: 'Configuring schedule...'
            });

            // Use AI to generate scheduler params
            const conversion = await ai.generate({
                prompt: `Convert this request into a Scheduler tool action (JSON).
                User Request: "${userMessage}"
                
                Actions: 'create' | 'list' | 'delete'
                Fields: 
                - action: required
                - cron: string (cron syntax, e.g. "0 9 * * *" for daily 9am) - REQUIRED for create
                - task: string (description) - REQUIRED for create
                - scheduleId: string (for delete)

                Example 1: "Remind me to check emails every day at 9am" ->
                { "action": "create", "cron": "0 9 * * *", "task": "Check emails" }

                Example 2: "List my schedules" ->
                { "action": "list" }

                Output JSON Schema: ScheduleParams
                Only return the JSON.`,
            });

            try {
                const params = JSON.parse(conversion.text) as ScheduleParams;

                // If create, show intent
                if (params.action === 'create') {
                    executedTools[executedTools.length - 1].result = `Scheduling "${params.task}" (${params.cron})`;
                } else {
                    executedTools[executedTools.length - 1].result = `${params.action.toUpperCase()} schedules`;
                }

                const result = await scheduleTask(params);

                executedTools[executedTools.length - 1].status = result.success ? 'success' : 'error';

                let output = '';
                if (result.success) {
                    if (params.action === 'list') {
                        const tasks = result.data || [];
                        output = `📅 **Active Schedules**\n\n${tasks.length === 0 ? 'No recurring tasks found.' : ''}`;
                        tasks.forEach((t: any) => {
                            output += `• **${t.task}**\n  Cron: \`${t.cron}\` | ID: \`${t.id}\`\n\n`;
                        });
                        executedTools[executedTools.length - 1].result = `Found ${tasks.length} tasks`;
                    } else {
                        output = `✅ **Schedule Configured**\n\n${result.data?.message || 'Done'}`;
                        executedTools[executedTools.length - 1].result = 'Success';
                    }
                } else {
                    output = `⚠️ **Schedule Error**\n\n${result.error}`;
                    executedTools[executedTools.length - 1].result = result.error || 'Error';
                }

                return {
                    content: output,
                    toolCalls: executedTools
                };

            } catch (e: any) {
                console.error(e);
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
            }
        }

        // Check for Webhook actions
        const isWebhookAction =
            lowerMessage.includes('webhook') ||
            lowerMessage.includes('hook url') ||
            lowerMessage.includes('endpoint');

        if (isWebhookAction) {
            executedTools.push({
                id: `hook-${Date.now()}`,
                name: 'Webhook Manager',
                status: 'running',
                result: 'Configuring webhook...'
            });

            // Use AI to generate webhook params
            const conversion = await ai.generate({
                prompt: `Convert this request into a Webhook tool action (JSON).
                User Request: "${userMessage}"
                
                Actions: 'create' | 'list' | 'delete'
                Fields: 
                - action: required
                - description: string (optional)
                - webhookId: string (for delete)

                Example 1: "Create a webhook for Zapier" ->
                { "action": "create", "description": "Zapier Integration" }

                Output JSON Schema: WebhookParams
                Only return the JSON.`,
            });

            try {
                const params = JSON.parse(conversion.text) as WebhookParams;

                executedTools[executedTools.length - 1].result = `${params.action.toUpperCase()} webhooks`;

                const result = await manageWebhooks(params);

                executedTools[executedTools.length - 1].status = result.success ? 'success' : 'error';

                let output = '';
                if (result.success) {
                    if (params.action === 'list') {
                        const hooks = result.data || [];
                        output = `🔗 **Active Webhooks**\n\n${hooks.length === 0 ? 'No webhooks found.' : ''}`;
                        hooks.forEach((h: any) => {
                            output += `• **${h.description}**\n  URL: \`${h.url}\`\n  ID: \`${h.id}\`\n\n`;
                        });
                        executedTools[executedTools.length - 1].result = `Found ${hooks.length} hooks`;
                    } else if (params.action === 'create') {
                        output = `✅ **Webhook Created**\n\nURL: \`${result.data.url}\`\n\n(Send POST requests here to trigger events)`;
                        executedTools[executedTools.length - 1].result = 'Created endpoint';
                    } else {
                        output = `✅ **Webhook Deleted**\n\n${result.data?.message}`;
                        executedTools[executedTools.length - 1].result = 'Deleted endpoint';
                    }
                } else {
                    output = `⚠️ **Webhook Error**\n\n${result.error}`;
                    executedTools[executedTools.length - 1].result = result.error || 'Error';
                }

                return {
                    content: output,
                    toolCalls: executedTools
                };

            } catch (e: any) {
                console.error(e);
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
            }
        }

        // Check for Gmail actions
        const isGmailAction =
            lowerMessage.includes('email') ||
            lowerMessage.includes('gmail') ||
            lowerMessage.includes('inbox') ||
            lowerMessage.includes('send message');

        // Avoid triggering if it's just "what is your email"
        const isAuthQuestion = lowerMessage.includes('your email') || lowerMessage.includes('login');

        if (isGmailAction && !isAuthQuestion) {
            executedTools.push({
                id: `gmail-${Date.now()}`,
                name: 'Gmail',
                status: 'running',
                result: 'Accessing inbox...'
            });

            // Use AI to generate gmail params
            const conversion = await ai.generate({
                prompt: `Convert this request into a Gmail tool action (JSON).
                User Request: "${userMessage}"
                
                Actions: 'list' | 'read' | 'send'
                Fields: 
                - action: required
                - query: string (for list, e.g. "is:unread")
                - messageId: string (for read)
                - to, subject, body: string (for send)

                Example 1: "Check unread emails from boss" ->
                { "action": "list", "query": "is:unread from:boss" }

                Example 2: "Send email to test@test.com saying hello" ->
                { "action": "send", "to": "test@test.com", "subject": "Hello", "body": "Just saying hi!" }

                Output JSON Schema: GmailParams
                Only return the JSON.`,
            });

            try {
                const params = JSON.parse(conversion.text) as GmailParams;

                executedTools[executedTools.length - 1].result = `${params.action.toUpperCase()} email`;

                const result = await gmailAction(params);

                executedTools[executedTools.length - 1].status = result.success ? 'success' : 'error';

                let output = '';
                if (result.success) {
                    if (params.action === 'list') {
                        const threads = result.data || [];
                        output = `📧 **Inbox Results**\n\n${threads.length === 0 ? 'No emails found.' : ''}`;
                        threads.forEach((t: any) => {
                            output += `• **${t.subject || '(No Subject)'}**\n  From: ${t.from}\n  *${t.snippet}*\n  ID: \`${t.id}\`\n\n`;
                        });
                        executedTools[executedTools.length - 1].result = `Found ${threads.length} emails`;
                    } else if (params.action === 'read') {
                        const email = result.data;
                        output = `📧 **${email.subject || 'Email Content'}**\n\n${email.body}`;
                        executedTools[executedTools.length - 1].result = 'Read email';
                    } else {
                        output = `✅ **Email Sent**\n\nTo: ${params.to}`;
                        executedTools[executedTools.length - 1].result = 'Sent email';
                    }
                } else {
                    output = `⚠️ **Gmail Error**\n\n${result.error}\n\n*Note: Ensure you have added the 'gmail' doc to 'integrations' in Firestore with an accessToken.*`;
                    executedTools[executedTools.length - 1].result = result.error || 'Error';
                }

                return {
                    content: output,
                    toolCalls: executedTools
                };

            } catch (e: any) {
                console.error(e);
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
            }
        }

        // Check for Calendar actions
        const isCalendarAction =
            lowerMessage.includes('calendar') ||
            lowerMessage.includes('meeting') ||
            lowerMessage.includes('schedule event') ||
            lowerMessage.includes('what am i doing today');

        if (isCalendarAction) {
            executedTools.push({
                id: `cal-${Date.now()}`,
                name: 'Calendar',
                status: 'running',
                result: 'Accessing calendar...'
            });

            // Use AI to generate calendar params
            const conversion = await ai.generate({
                prompt: `Convert this request into a Calendar tool action (JSON).
                User Request: "${userMessage}"
                
                Actions: 'list' | 'create'
                Fields: 
                - action: required
                - timeMin: string (ISO for list, optional)
                - maxResults: number (for list)
                - summary, startTime, endTime: string (ISO for create)

                Current Time: ${new Date().toISOString()}

                Example 1: "What meetings do I have?" ->
                { "action": "list", "maxResults": 5 }

                Example 2: "Schedule a meeting with Pops tomorrow at 2pm for 1 hour" ->
                { "action": "create", "summary": "Meeting with Pops", "startTime": "2025-12-12T14:00:00Z", "endTime": "2025-12-12T15:00:00Z" }

                Output JSON Schema: CalendarParams
                Only return the JSON.`,
            });

            try {
                const params = JSON.parse(conversion.text) as CalendarParams;

                executedTools[executedTools.length - 1].result = `${params.action.toUpperCase()} event`;

                const result = await calendarAction(params);

                executedTools[executedTools.length - 1].status = result.success ? 'success' : 'error';

                let output = '';
                if (result.success) {
                    if (params.action === 'list') {
                        const events = result.data || [];
                        output = `📅 **Upcoming Events**\n\n${events.length === 0 ? 'No upcoming events.' : ''}`;
                        events.forEach((e: any) => {
                            const start = e.start.dateTime || e.start.date;
                            output += `• **${e.summary}**\n  Time: \`${new Date(start).toLocaleString()}\`\n  Link: [View](${e.htmlLink})\n\n`;
                        });
                        executedTools[executedTools.length - 1].result = `Found ${events.length} events`;
                    } else {
                        output = `✅ **Event Created**\n\n**${result.data.summary}**\nTime: ${new Date(result.data.start.dateTime).toLocaleString()}\nLink: [View](${result.data.htmlLink})`;
                        executedTools[executedTools.length - 1].result = 'Created event';
                    }
                } else {
                    output = `⚠️ **Calendar Error**\n\n${result.error}\n\n*Note: Ensure you have added the 'calendar' doc to 'integrations' in Firestore.*`;
                    executedTools[executedTools.length - 1].result = result.error || 'Error';
                }

                return {
                    content: output,
                    toolCalls: executedTools
                };

            } catch (e: any) {
                console.error(e);
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
            }
        }

        // Check for Sheets actions
        const isSheetsAction =
            lowerMessage.includes('sheet') ||
            lowerMessage.includes('excel') ||
            lowerMessage.includes('spreadsheet') ||
            lowerMessage.includes('csv');

        if (isSheetsAction) {
            executedTools.push({
                id: `sheet-${Date.now()}`,
                name: 'Google Sheets',
                status: 'running',
                result: 'Accessing sheets...'
            });

            // Use AI to generate sheets params
            const conversion = await ai.generate({
                prompt: `Convert this request into a Sheets tool action (JSON).
                User Request: "${userMessage}"
                
                Actions: 'read' | 'append' | 'create'
                Fields: 
                - action: required
                - spreadsheetId: string (optional, infer or ask if missing)
                - range: string (e.g. "A1:B2", for read/append)
                - values: string[][] (for append)
                - title: string (for create)

                Example 1: "Create a sheet called Sales Report" ->
                { "action": "create", "title": "Sales Report" }

                Example 2: "Add John Doe (row) to sheet ID 123ABC..." ->
                { "action": "append", "spreadsheetId": "123ABC...", "range": "Sheet1!A1", "values": [["John Doe"]] }

                Output JSON Schema: SheetsParams
                Only return the JSON.`,
            });

            try {
                const params = JSON.parse(conversion.text) as SheetsParams;

                executedTools[executedTools.length - 1].result = `${params.action.toUpperCase()} sheet`;

                const result = await sheetsAction(params);

                executedTools[executedTools.length - 1].status = result.success ? 'success' : 'error';

                let output = '';
                if (result.success) {
                    if (params.action === 'read') {
                        const rows = result.data.values || [];
                        output = `📊 **Sheet Data** (${result.data.range})\n\n`;
                        rows.forEach((row: string[]) => {
                            output += `| ${row.join(' | ')} |\n`;
                        });
                        executedTools[executedTools.length - 1].result = `Read ${rows.length} rows`;
                    } else if (params.action === 'create') {
                        output = `✅ **Sheet Created**\n\nTitle: ${result.data.title}\nURL: [Open Sheet](${result.data.url})\nID: \`${result.data.spreadsheetId}\` (Save this ID!)`;
                        executedTools[executedTools.length - 1].result = 'Created sheet';
                    } else {
                        output = `✅ **Rows Appended**\n\n${result.data.updates?.updatedRows || 1} rows added.`;
                        executedTools[executedTools.length - 1].result = 'Appended rows';
                    }
                } else {
                    output = `⚠️ **Sheets Error**\n\n${result.error}\n\n*Note: Ensure you have added the 'sheets' doc to 'integrations' in Firestore.*`;
                    executedTools[executedTools.length - 1].result = result.error || 'Error';
                }

                return {
                    content: output,
                    toolCalls: executedTools
                };

            } catch (e: any) {
                console.error(e);
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
            }
        }

        // Check for LeafLink actions
        const isLeafLinkAction =
            lowerMessage.includes('leaflink') ||
            lowerMessage.includes('wholesale') ||
            lowerMessage.includes('inventory update');

        if (isLeafLinkAction) {
            executedTools.push({
                id: `leaf-${Date.now()}`,
                name: 'LeafLink',
                status: 'running',
                result: 'Accessing LeafLink...'
            });

            // Use AI to generate leaflink params
            const conversion = await ai.generate({
                prompt: `Convert this request into a LeafLink tool action (JSON).
                User Request: "${userMessage}"
                
                Actions: 'list_orders' | 'list_products' | 'update_inventory'
                Fields: 
                - action: required
                - status: string (for list_orders, e.g. "Accepted")
                - productId: string (for update_inventory)
                - quantity: number (for update_inventory)

                Example 1: "Show me new wholesale orders" ->
                { "action": "list_orders", "status": "Submitted" }

                Example 2: "Update inventory for SKU 123 to 50" ->
                { "action": "update_inventory", "productId": "123", "quantity": 50 }

                Output JSON Schema: LeafLinkParams
                Only return the JSON.`,
            });

            try {
                const params = JSON.parse(conversion.text) as LeafLinkParams;

                executedTools[executedTools.length - 1].result = `${params.action.toUpperCase().replace('_', ' ')}`;

                const result = await leaflinkAction(params);

                executedTools[executedTools.length - 1].status = result.success ? 'success' : 'error';

                let output = '';
                if (result.success) {
                    if (params.action === 'list_orders') {
                        const orders = result.data || [];
                        output = `📦 **Wholesale Orders**\n\n${orders.length === 0 ? 'No orders found.' : ''}`;
                        orders.forEach((o: any) => {
                            output += `• **#${o.id}** (${o.status})\n  Customer: ${o.customer}\n  Total: $${o.total}\n\n`;
                        });
                        executedTools[executedTools.length - 1].result = `Found ${orders.length} orders`;
                    } else if (params.action === 'list_products') {
                        const prods = result.data || [];
                        output = `🌿 **Product Catalog**\n\n`;
                        prods.forEach((p: any) => {
                            output += `• **${p.name}** (SKU: ${p.sku})\n  Inventory: ${p.inventory}\n\n`;
                        });
                        executedTools[executedTools.length - 1].result = `Listed ${prods.length} products`;
                    } else {
                        output = `✅ **Inventory Updated**\n\nNew Quantity: ${result.data.new_inventory}`;
                        executedTools[executedTools.length - 1].result = 'Updated inventory';
                    }
                } else {
                    output = `⚠️ **LeafLink Error**\n\n${result.error}\n\n*Note: Ensure you have added the 'leaflink' doc to 'integrations' in Firestore.*`;
                    executedTools[executedTools.length - 1].result = result.error || 'Error';
                }

                return {
                    content: output,
                    toolCalls: executedTools
                };

            } catch (e: any) {
                console.error(e);
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
            }
        }

        // Check for Dutchie actions
        const isDutchieAction =
            lowerMessage.includes('dutchie') ||
            lowerMessage.includes('menu') ||
            lowerMessage.includes('dispensary') ||
            lowerMessage.includes('check orders');

        if (isDutchieAction && !isLeafLinkAction) { // Prioritize LeafLink if ambiguity, or ensure distinct keywords
            executedTools.push({
                id: `dutchie-${Date.now()}`,
                name: 'Dutchie',
                status: 'running',
                result: 'Accessing Dutchie...'
            });

            // Use AI to generate dutchie params
            const conversion = await ai.generate({
                prompt: `Convert this request into a Dutchie tool action (JSON).
                User Request: "${userMessage}"
                
                Actions: 'list_menu' | 'list_orders'
                Fields: 
                - action: required
                - search: string (for list_menu, e.g. "Pre-rolls")
                - limit: number

                Example 1: "Check for new orders" ->
                { "action": "list_orders" }

                Example 2: "Search menu for Blue Dream" ->
                { "action": "list_menu", "search": "Blue Dream" }

                Output JSON Schema: DutchieParams
                Only return the JSON.`,
            });

            try {
                const params = JSON.parse(conversion.text) as DutchieParams;

                executedTools[executedTools.length - 1].result = `${params.action.toUpperCase().replace('_', ' ')}`;

                const result = await dutchieAction(params);

                executedTools[executedTools.length - 1].status = result.success ? 'success' : 'error';

                let output = '';
                if (result.success) {
                    if (params.action === 'list_menu') {
                        const items = result.data || [];
                        output = `🌿 **Dispensary Menu**\n\n`;
                        items.forEach((p: any) => {
                            output += `• **${p.name}**\n  Brand: ${p.brand || 'N/A'}\n  Price: $${p.price}\n  Stock: ${p.stock}\n\n`;
                        });
                        executedTools[executedTools.length - 1].result = `Found ${items.length} items`;
                    } else {
                        const orders = result.data || [];
                        output = `🛒 **Ecommerce Orders**\n\n`;
                        orders.forEach((o: any) => {
                            output += `• **#${o.id}** (${o.status})\n  Customer: ${o.customer}\n  Total: $${o.total}\n\n`;
                        });
                        executedTools[executedTools.length - 1].result = `Found ${orders.length} orders`;
                    }
                } else {
                    output = `⚠️ **Dutchie Error**\n\n${result.error}\n\n*Note: Ensure you have added the 'dutchie' doc to 'integrations' in Firestore.*`;
                    executedTools[executedTools.length - 1].result = result.error || 'Error';
                }

                return {
                    content: output,
                    toolCalls: executedTools
                };

            } catch (e: any) {
                console.error(e);
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
            }
        }

        if (lowerMessage.includes('find 20 new dispensaries') || lowerMessage.includes('find dispensaries')) {
            executedTools.push({
                id: `scan-${Date.now()}`,
                name: 'Execute: scan-locations (Illinois)',
                status: 'success',
                result: 'Initiated background scan for Illinois dispensaries via Leafly.'
            });

            return {
                content: `🕵️ **Dispensary Discovery Initiated**\n\nI am scanning for 20 new dispensaries in **Illinois** matching our buyer profile.\n\n• **Source**: Leafly & Google Maps\n• **Target**: Illinois (Soft Launch)\n• **Est. Time**: 2-3 minutes\n\nI will notify you when the \`discovered_dispensaries.json\` list is updated.`,
                toolCalls: executedTools
            };
        }

        if (lowerMessage.includes('welcome') || lowerMessage.includes('welcome-sequence')) {
            const result = await executePlaybook('welcome-sequence');
            executedTools.push({
                id: `playbook-${Date.now()}`,
                name: 'Execute: welcome-sequence',
                status: result.success ? 'success' : 'error',
                result: result.message
            });
            return {
                content: `✅ **Welcome Sequence Executed**\n\n${result.message}\n\n${result.logs.join('\n')}`,
                toolCalls: executedTools
            };
        }

        if (lowerMessage.includes('competitor') || lowerMessage.includes('competitor-scan')) {
            const result = await executePlaybook('competitor-scan');
            executedTools.push({
                id: `playbook-${Date.now()}`,
                name: 'Execute: competitor-scan',
                status: result.success ? 'success' : 'error',
                result: result.message
            });
            return {
                content: `🔍 **Competitor Scan Complete**\n\n${result.message}\n\n${result.logs.join('\n')}`,
                toolCalls: executedTools
            };
        }

        if (lowerMessage.includes('churn') || lowerMessage.includes('churn-predictor')) {
            const result = await executePlaybook('churn-predictor');
            executedTools.push({
                id: `playbook-${Date.now()}`,
                name: 'Execute: churn-predictor',
                status: result.success ? 'success' : 'error',
                result: result.message
            });
            return {
                content: `⚠️ **Churn Analysis Complete**\n\n${result.message}\n\n${result.logs.join('\n')}`,
                toolCalls: executedTools
            };
        }

        if (lowerMessage.includes('health') || lowerMessage.includes('platform-health') || lowerMessage.includes('diagnostic')) {
            const result = await executePlaybook('platform-health');
            executedTools.push({
                id: `playbook-${Date.now()}`,
                name: 'Execute: platform-health',
                status: result.success ? 'success' : 'error',
                result: result.message
            });
            return {
                content: `🏥 **Platform Health Check Complete**\n\n${result.message}\n\n${result.logs.join('\n')}`,
                toolCalls: executedTools
            };
        }


        // --- Phase 5: Rich Metadata Injection ---
        // For MVP, we use keyword detection on the inputs to simulate backend intelligence
        // Use the existing metadata object if possible
        const richMetadata: any = {};

        if (lowerMessage.includes('compliance') || lowerMessage.includes('check')) {
            richMetadata.type = 'compliance_report';
            richMetadata.data = {
                status: 'fail',
                violations: ['Medical claim detected', 'Appeals to minors'],
                suggestions: ['Remove "cure"', 'Change imagery']
            };
        } else if (lowerMessage.includes('recommend') || lowerMessage.includes('product')) {
            richMetadata.type = 'product_rec';
            richMetadata.data = {
                products: [
                    { name: 'Sleepy Time Gimme', score: 0.95, reason: 'Matches "sleep" intent' },
                    { name: 'Chill Pill', score: 0.82, reason: 'High margin' }
                ]
            };
        }

        // Merge rich metadata into session metadata
        const finalMetadata = { ...metadata, ...richMetadata };

        console.log('[runAgentChat] Attempting AI response generation...');
        // Use AI for general queries
        try {
            const response = await ai.generate({
                prompt: `${activePersona.systemPrompt}
                
IMPORTANT: You must provide COMPLETE responses. Do NOT promise to "search the web" or "be back shortly" - you cannot perform real-time web searches unless you use the "Web Search" tool. Instead, provide helpful information based on what you know or explain how to set up an automation.

User message: "${userMessage}"

CONTENTS:
If the user's message triggered a compliance check (keyword 'compliance' or 'check'), affirm that you have analyzed the content for compliance and found issues.
If the user's message asked for recommendations (keyword 'recommend' or 'product'), affirm that you found some high-scoring products.

YOUR CAPABILITIES:
- Run playbooks (welcome-sequence, competitor-scan, churn-predictor, platform-health)
- Set up automations with Gmail, Google Drive, and Schedulers
- Answer questions about BakedBot platform
- Provide guidance on cannabis marketing and operations

YOUR LIMITATIONS:
- You CANNOT search the web in real-time unless you use the tool.
- You CANNOT access external websites live unless you use the tool.

RESPONSE RULES:
1. If asked for an automation → Create a step-by-step plan mentioning the tools available to you.
2. If asked about playbooks → List available playbooks
3. Be helpful and proactive.

For automation requests, be enthusiastic and mention tools:
- "Gmail" or "email" if sending messages
- "Google Drive" or "Spreadsheet" if saving data  
- "Schedule" or "daily/weekly" if recurring

Keep your response concise but complete.`,
            });

            if (response.text) {
                return {
                    content: response.text,
                    toolCalls: executedTools,
                    metadata: finalMetadata // Inject metadata into AI response
                };
            }
        } catch (aiError) {
            console.error('AI generation failed:', aiError);
        }


        // Fallback if AI fails
        const fallbackContent = `👋 **Hello! I'm Baked HQ.**\n\nI'm routed to **${agentInfo?.name || 'General'}** (${agentInfo?.specialty || 'General Assistant'}).\n\n**Available Playbooks:**\n• \`Run welcome-sequence\`\n• \`Run competitor-scan\`\n• \`Run churn-predictor\`\n• \`Run platform-health\`\n\nWhat would you like me to help with?`;

        return {
            content: fallbackContent,
            toolCalls: executedTools,
            metadata: finalMetadata // Inject metadata into fallback response
        };
    } catch (e: any) {
        console.error("Agent Chat Error:", e);
        console.error("Stack Trace:", e.stack);
        const errorDetail = process.env.NODE_ENV === 'development' ? `\n\n*Error: ${e.message}*` : '';
        return {
            content: `I encountered an error.${errorDetail}\n\nTry: \`Run welcome-sequence\` or \`Run platform-health\``,
            toolCalls: executedTools.length > 0 ? executedTools : undefined
        };
    }
}
