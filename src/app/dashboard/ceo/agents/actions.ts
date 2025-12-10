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

const AGENT_MAP = {
    craig: craigAgent,
    smokey: smokeyAgent,
    pops: popsAgent,
    ezal: ezalAgent,
    money_mike: moneyMikeAgent,
    mrs_parker: mrsParkerAgent,
};


// --- Tools Implementation (Mocks/Stubs for Phase 6) ---

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
        // Use real Deebo checking
        // For now assume first jurisdiction or default
        const jurisdiction = jurisdictions[0] || 'IL';
        return await deebo.checkContent(jurisdiction, 'sms', content);
    },
    sendSms: async (to: string, body: string) => {
        // Stub: Log it
        console.log(`[Tool:SMS] Sending to ${to}: ${body}`);
        return true;
    },
    getCampaignMetrics: async (campaignId: string) => {
        // Stub: Random improvement
        return { kpi: Math.random() }; // Random 0-1
    }
};


export async function triggerAgentRun(agentName: string) {
    const brandId = 'demo-brand-123'; // Hardcoded for demo

    const agentImpl = AGENT_MAP[agentName as keyof typeof AGENT_MAP];
    if (!agentImpl) {
        throw new Error(`Unknown agent: ${agentName}`);
    }

    // Adapter is now the persistence object itself
    // Tools Injection
    let tools: any = {};
    if (agentName === 'craig') {
        tools = defaultCraigTools;
    } else {
        tools = {};
    }


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
