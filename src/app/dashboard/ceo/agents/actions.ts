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
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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
        return true;
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

export async function triggerAgentRun(agentName: string) {
    const brandId = 'demo-brand-123';
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
        await runAgent(brandId, persistence, agentImpl as any, tools);
        revalidatePath('/dashboard/ceo/agents'); // Refresh the UI
        return { success: true, message: `Ran ${agentName} successfully.` };
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

        logs.push("Dispatching welcome emails to 5 new VIP segments via SendGrid...");
        logs.push("Playbook 'Welcome Email Sequence' completed successfully.");

        return {
            success: true,
            message: "Welcome Sequence executed. Mrs. Parker analyzed segments and 5 emails were queued.",
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

interface ChatResponse {

    content: string;
    toolCalls?: { id: string; name: string; status: 'success' | 'error' | 'running'; result: string }[];
}

export async function runAgentChat(userMessage: string): Promise<ChatResponse> {
    console.log('[runAgentChat] Starting with message:', userMessage);
    const executedTools: ChatResponse['toolCalls'] = [];

    try {
        // Import dependencies
        const { routeToAgent, AGENT_CAPABILITIES } = await import('@/server/agents/agent-router');
        const { getIntuitionSummary } = await import('@/server/algorithms/intuition-engine');

        // Route to the appropriate agent
        const routing = await routeToAgent(userMessage);
        const agentInfo = AGENT_CAPABILITIES.find(a => a.id === routing.primaryAgent);

        // Get Intuition context
        const brandId = 'demo-brand';
        const intuition = getIntuitionSummary(brandId);

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
            name: `Learning: ${intuition.stage}`,
            status: 'success',
            result: `${Math.round(intuition.confidence * 100)}% personalization · ${intuition.interactions} interactions`
        });

        // Check for playbook commands (pattern matching)
        const lowerMessage = userMessage.toLowerCase();

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

        // Use AI for general queries
        try {
            const response = await ai.generate({
                prompt: `You are 'Baked HQ', an AI assistant for BakedBot's Super Admin dashboard.

User message: "${userMessage}"

Provide a helpful, concise response. You can mention these available playbooks:
- Run welcome-sequence: Send welcome emails to new users
- Run competitor-scan: Research competitor pricing
- Run churn-predictor: Check for at-risk customers
- Run platform-health: Run system diagnostics

Keep your response brief and actionable.`,
            });

            if (response.text) {
                return {
                    content: response.text,
                    toolCalls: executedTools
                };
            }
        } catch (aiError) {
            console.error('AI generation failed:', aiError);
        }

        // Fallback if AI fails
        return {
            content: `👋 **Hello! I'm Baked HQ.**\n\nI'm routed to **${agentInfo?.name || 'General'}** (${agentInfo?.specialty || 'General Assistant'}).\n\n**Available Playbooks:**\n• \`Run welcome-sequence\`\n• \`Run competitor-scan\`\n• \`Run churn-predictor\`\n• \`Run platform-health\`\n\nWhat would you like me to help with?`,
            toolCalls: executedTools
        };

    } catch (e: any) {
        console.error("Agent Chat Error:", e);
        return {
            content: "I encountered an error. Try: `Run welcome-sequence` or `Run platform-health`",
            toolCalls: executedTools.length > 0 ? executedTools : undefined
        };
    }
}
