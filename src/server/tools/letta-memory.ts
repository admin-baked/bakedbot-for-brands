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

export const lettaMemoryTools = [lettaSaveFact, lettaAsk];
