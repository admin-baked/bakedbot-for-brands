'use server';

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

export async function triggerAgentRun(agentName: string) {
    const brandId = 'demo-brand-123'; // Hardcoded for demo

    const agentImpl = AGENT_MAP[agentName as keyof typeof AGENT_MAP];
    if (!agentImpl) {
        throw new Error(`Unknown agent: ${agentName}`);
    }

    // Adapter is now the persistence object itself
    // We pass a dummy tools object for now, or specific tools if we have them
    const tools = {};

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
