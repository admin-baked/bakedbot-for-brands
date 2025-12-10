'use server';

import { runAgent } from '@/server/agents/harness';
import { persistence } from '@/server/agents/persistence';
import { craigAgent } from '@/server/agents/craig';
import { smokeyAgent } from '@/server/agents/smokey';
import { popsAgent } from '@/server/agents/pops';
import { ezalAgent } from '@/server/agents/ezal';
import { moneyMikeAgent } from '@/server/agents/money-mike';
import { mrsParkerAgent } from '@/server/agents/mrs-parker';
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

    // Adapter for the loader interface to match persistence signature
    const loaderAdapter = {
        loadBrandMemory: persistence.loadBrandMemory,
        loadAgentMemory: (bId: string, aName: string) => persistence.loadAgentMemory(bId, aName, {} as any), // Schema passed as any since harness treats it generically, but we might need stricter typing in real app
        saveAgentMemory: persistence.saveAgentMemory,
        appendLog: persistence.appendLog,
    };

    try {
        // In TS, the harness expects <T> but since we have a map of different T's, 
        // we might need to cast or use a more flexible harness signature.
        // For this Server Action, we assume valid types.
        await runAgent(brandId, loaderAdapter as any, agentImpl as any);

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
