import { z } from 'zod';
import { tool } from 'genkit';
import { lettaClient } from '../services/letta/client';

// We'll use a specific agent name for the shared "Research Memory"
// In a real scenario, we might map this to the specific user or brand
const RESEARCH_MEMORY_AGENT_NAME = 'BakedBot Research Memory';

async function getOrCreateResearchAgent() {
    try {
        const agents = await lettaClient.listAgents();
        const existing = agents.find(a => a.name === RESEARCH_MEMORY_AGENT_NAME);
        
        if (existing) {
            return existing;
        }

        console.log(`Creating new Letta agent: ${RESEARCH_MEMORY_AGENT_NAME}`);
        return await lettaClient.createAgent(
            RESEARCH_MEMORY_AGENT_NAME,
            "You are the long-term memory for BakedBot. Your job is to store and recall facts about brands, competitors, and market trends. Be concise and precise."
        );
    } catch (error) {
        console.error('Failed to get/create Letta agent:', error);
        throw error;
    }
}

export const lettaSaveFact = tool({
    name: 'letta_save_fact',
    description: 'Save a persistent fact or finding into long-term memory via Letta. Use this for important information that should be remembered forever.',
    inputSchema: z.object({
        fact: z.string().describe('The fact or finding to store.'),
        category: z.string().optional().describe('Optional category (e.g., "Competitor", "Pricing").')
    }),
    outputSchema: z.string(),
}, async ({ fact, category }) => {
    try {
        const agent = await getOrCreateResearchAgent();
        const message = category 
            ? `Remember this fact under user-defined category '${category}': ${fact}`
            : `Remember this fact: ${fact}`;
            
        // Sending a message with "Remember this" triggers Letta's internal memory management module
        const response = await lettaClient.sendMessage(agent.id, message);
        return `Fact saved to Letta memory: ${fact}`;
    } catch (error: any) {
        return `Error saving to Letta: ${error.message}`;
    }
});

export const lettaAsk = tool({
    name: 'letta_ask',
    description: 'Ask the long-term memory a question to retrieve facts. Use this to recall info about brands, past research, etc.',
    inputSchema: z.object({
        question: z.string().describe('The question to ask the memory system.')
    }),
    outputSchema: z.string(),
}, async ({ question }) => {
    try {
        const agent = await getOrCreateResearchAgent();
        // Since `sendMessage` in our minimal client returns the raw API response, 
        // we'd typically need to parse the 'messages' array from the result.
        // For this MVP, we assume the API returns the updated state/messages.
        const response: any = await lettaClient.sendMessage(agent.id, question);
        
        // Letta API structure varies, assuming standard list of messages back
        // We really want the *last* assistant message
        if (response.messages && Array.isArray(response.messages)) {
            const lastMsg = response.messages
                .filter((m: any) => m.role === 'assistant')
                .pop();
            return lastMsg ? lastMsg.content : "No new information retrieved.";
        }
        
        return "Memory queried, but response format was unexpected.";
    } catch (error: any) {
        return `Error querying Letta: ${error.message}`;
    }
});

// ----------------------------------------------------------------------------
// INTER-AGENT & SHARED MEMORY TOOLS
// ----------------------------------------------------------------------------

export const lettaMessageAgent = tool({
    name: 'letta_message_agent',
    description: 'Send a direct message to another agent. Use this to delegate tasks, ask questions, or share findings with your squad.',
    inputSchema: z.object({
        toAgent: z.string().describe('The name of the target agent (e.g., "Jack", "Linus").'),
        message: z.string().describe('The content of the message.')
    }),
    outputSchema: z.string(),
}, async ({ toAgent, message }) => {
    try {
        const { lettaClient } = await import('@/server/services/letta/client');
        const agents = await lettaClient.listAgents();
        // Fuzzy match agent name
        const target = agents.find(a => a.name.toLowerCase().includes(toAgent.toLowerCase()));
        
        if (!target) {
            return `Failed: Agent '${toAgent}' not found in Letta.`;
        }

        // Send async message (we assume 'self' or a system sender for now)
        await lettaClient.sendAsyncMessage('system', target.id, `[Incoming Message]: ${message}`);
        return `Message sent to ${target.name} (ID: ${target.id}).`;
    } catch (e: any) {
        return `Error sending message: ${e.message}`;
    }
});

export const lettaReadSharedBlock = tool({
    name: 'letta_read_shared_block',
    description: 'Read a specific Shared Memory Block. Use this to access "Strategy", "ComplianceRules", or "WeeklyKPIs" shared by the Boardroom.',
    inputSchema: z.object({
        blockLabel: z.string().describe('The label of the shared block (e.g., "Strategy", "KPIs").')
    }),
    outputSchema: z.string(),
}, async ({ blockLabel }) => {
    try {
        const { lettaBlockManager } = await import('@/server/services/letta/block-manager');
        // We assume a 'global' or 'boardroom' tenant ID for shared context if not provided
        const tenantId = (global as any).currentTenantId || 'boardroom_shared';
        
        const content = await lettaBlockManager.readBlock(tenantId, blockLabel as any);
        return content || "Block is empty or does not exist.";
    } catch (e: any) {
        return `Error reading shared block: ${e.message}`;
    }
});


export const lettaSearchMemory = tool({
    name: 'letta_search_memory',
    description: 'Semantically search your long-term archival memory. Use this to recall specific details, facts, or past research findings that are not in your active context.',
    inputSchema: z.object({
        query: z.string().describe('The search query (e.g., "competitor pricing strategy", "user preference for email").')
    }),
    outputSchema: z.string(),
}, async ({ query }) => {
    try {
        const agent = await getOrCreateResearchAgent();
        const results = await lettaClient.searchPassages(agent.id, query, 5);
        
        if (results.length === 0) {
            return "No relevant memories found.";
        }
        
        return `Found ${results.length} memories:\n- ${results.join('\n- ')}`;
    } catch (e: any) {
        return `Error searching memory: ${e.message}`;
    }
});

export const lettaUpdateCoreMemory = tool({
    name: 'letta_update_core_memory',
    description: 'Update your own Core Memory (Persona). Use this to permanently change how you behave or remember critical user preferences.',
    inputSchema: z.object({
        section: z.enum(['persona', 'human']).describe('The section of core memory to update. "persona" updates who YOU are. "human" updates what you know about the USER.'),
        content: z.string().describe('The new content for this section. Be careful, this overwrites the previous section content.')
    }),
    outputSchema: z.string(),
}, async ({ section, content }) => {
    try {
        const agent = await getOrCreateResearchAgent();
        // Determine the core memory key based on section
        // Letta typically uses 'persona' and 'human' as block labels in the core memory
        await lettaClient.updateCoreMemory(agent.id, section, content);
        return `Core Memory (${section}) updated successfully.`;
    } catch (e: any) {
        return `Error updating core memory: ${e.message}`;
    }
});

export const lettaMemoryTools = [lettaSaveFact, lettaAsk, lettaMessageAgent, lettaReadSharedBlock, lettaSearchMemory, lettaUpdateCoreMemory];

