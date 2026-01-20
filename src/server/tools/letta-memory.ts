import { z } from 'zod';
import { tool } from 'genkit';
import { lettaClient } from '../services/letta/client';
import { episodicMemoryService } from '../services/letta/episodic-memory';
import { proceduralMemoryService } from '../services/letta/procedural-memory';
import { associativeMemoryService } from '../services/letta/associative-memory';
import { archivalTagsService, CATEGORY_TAGS } from '../services/letta/archival-tags';

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

// ----------------------------------------------------------------------------
// EPISODIC MEMORY TOOLS (Conversation Search)
// ----------------------------------------------------------------------------

export const lettaSearchConversations = tool({
    name: 'letta_search_conversations',
    description: 'Search past conversations and interactions (episodic memory). Use this to recall "what did we discuss last week?" or "what did the customer say about X?"',
    inputSchema: z.object({
        query: z.string().describe('The search query for conversation content.'),
        daysBack: z.number().optional().describe('How many days back to search (default: 7)'),
        limit: z.number().optional().describe('Max results to return (default: 5)')
    }),
    outputSchema: z.string(),
}, async ({ query, daysBack = 7, limit = 5 }) => {
    try {
        const agent = await getOrCreateResearchAgent();
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);

        const results = await episodicMemoryService.searchConversations(
            agent.id,
            query,
            { limit, startDate, endDate }
        );

        if (results.length === 0) {
            return "No relevant conversations found in that time period.";
        }

        // Apply weighted scoring for better relevance
        const scored = episodicMemoryService.applyWeightedScoring(results);

        return `Found ${scored.length} conversations:\n${scored
            .map((r, i) => `${i + 1}. [${r.memory.timestamp.toLocaleDateString()}] ${r.memory.content.slice(0, 200)}...`)
            .join('\n')}`;
    } catch (e: any) {
        return `Error searching conversations: ${e.message}`;
    }
});

export const lettaGetRecentContext = tool({
    name: 'letta_get_recent_context',
    description: 'Get the most recent conversation messages for context. Use this to "resume where we left off" with a customer or task.',
    inputSchema: z.object({
        messageCount: z.number().optional().describe('Number of recent messages to retrieve (default: 10)')
    }),
    outputSchema: z.string(),
}, async ({ messageCount = 10 }) => {
    try {
        const agent = await getOrCreateResearchAgent();
        const messages = await episodicMemoryService.getRecentContext(agent.id, messageCount);

        if (messages.length === 0) {
            return "No recent conversation context found.";
        }

        return `Recent context (${messages.length} messages):\n${messages
            .map(m => `[${m.role}]: ${m.content.slice(0, 150)}...`)
            .join('\n')}`;
    } catch (e: any) {
        return `Error getting recent context: ${e.message}`;
    }
});

// ----------------------------------------------------------------------------
// PROCEDURAL MEMORY TOOLS (Workflow Trajectories)
// ----------------------------------------------------------------------------

export const lettaFindWorkflow = tool({
    name: 'letta_find_workflow',
    description: 'Search for past successful workflows that might help with the current task. Use this to learn from previous successful executions.',
    inputSchema: z.object({
        taskDescription: z.string().describe('Description of the task you want to accomplish.'),
        limit: z.number().optional().describe('Max workflows to return (default: 3)')
    }),
    outputSchema: z.string(),
}, async ({ taskDescription, limit = 3 }) => {
    try {
        const agent = await getOrCreateResearchAgent();
        const workflows = await proceduralMemoryService.findRelevantWorkflows(
            agent.id,
            taskDescription,
            limit
        );

        if (workflows.length === 0) {
            return "No relevant past workflows found. This may be a new type of task.";
        }

        return `Found ${workflows.length} relevant workflows:\n${workflows
            .map((w, i) => {
                const toolChain = w.steps.map(s => s.toolName).join(' → ');
                return `${i + 1}. Task: ${w.taskDescription.slice(0, 100)}\n   Tools: ${toolChain}\n   Outcome: ${w.outcome}`;
            })
            .join('\n\n')}`;
    } catch (e: any) {
        return `Error finding workflows: ${e.message}`;
    }
});

export const lettaGetBestPractice = tool({
    name: 'letta_get_best_practice',
    description: 'Find the most successful way to use a combination of tools. Use this before executing a multi-step task.',
    inputSchema: z.object({
        toolNames: z.array(z.string()).describe('List of tool names you plan to use.')
    }),
    outputSchema: z.string(),
}, async ({ toolNames }) => {
    try {
        const agent = await getOrCreateResearchAgent();
        const bestPractice = await proceduralMemoryService.findBestPractice(
            agent.id,
            toolNames
        );

        if (!bestPractice) {
            return `No established best practice found for: ${toolNames.join(', ')}. Proceed with your own judgment.`;
        }

        const stepGuide = bestPractice.steps
            .map((s, i) => `  ${i + 1}. ${s.toolName}(${JSON.stringify(s.args).slice(0, 50)}...)`)
            .join('\n');

        return `Best practice for ${toolNames.join(' + ')}:\nTask: ${bestPractice.taskDescription}\nSteps:\n${stepGuide}\nOutcome: ${bestPractice.outcome}`;
    } catch (e: any) {
        return `Error finding best practice: ${e.message}`;
    }
});

// ----------------------------------------------------------------------------
// ASSOCIATIVE MEMORY TOOLS (Graph Relationships)
// ----------------------------------------------------------------------------

export const lettaFindRelatedMemories = tool({
    name: 'letta_find_related_memories',
    description: 'Find memories related to a given memory ID. Use this for "something like last time" or following chains of related information.',
    inputSchema: z.object({
        memoryId: z.string().describe('The ID of the memory to find relations for.'),
        relationTypes: z.array(z.string()).optional().describe('Filter by relation types: similar_to, followed_by, caused, referenced_in, contradicts, supersedes'),
        minStrength: z.number().optional().describe('Minimum relationship strength (0-1, default: 0.3)')
    }),
    outputSchema: z.string(),
}, async ({ memoryId, relationTypes, minStrength = 0.3 }) => {
    try {
        const tenantId = (global as any).currentTenantId || 'default';

        const related = await associativeMemoryService.findRelated(
            memoryId,
            tenantId,
            {
                relations: relationTypes as any[],
                minStrength,
                limit: 10
            }
        );

        if (related.length === 0) {
            return "No related memories found for this memory ID.";
        }

        return `Found ${related.length} related memories:\n${related
            .map((r, i) => {
                const targetId = r.direction === 'outgoing' ? r.edge.toMemoryId : r.edge.fromMemoryId;
                return `${i + 1}. [${r.edge.relation}] ${targetId} (strength: ${r.edge.strength.toFixed(2)})`;
            })
            .join('\n')}`;
    } catch (e: any) {
        return `Error finding related memories: ${e.message}`;
    }
});

export const lettaLinkMemories = tool({
    name: 'letta_link_memories',
    description: 'Create a relationship between two memories. Use this to build knowledge graphs and track how information connects.',
    inputSchema: z.object({
        fromMemoryId: z.string().describe('Source memory ID'),
        toMemoryId: z.string().describe('Target memory ID'),
        relation: z.enum(['similar_to', 'followed_by', 'caused', 'referenced_in', 'contradicts', 'supersedes'])
            .describe('Type of relationship'),
        strength: z.number().optional().describe('Relationship strength 0-1 (default: 0.5)')
    }),
    outputSchema: z.string(),
}, async ({ fromMemoryId, toMemoryId, relation, strength = 0.5 }) => {
    try {
        const tenantId = (global as any).currentTenantId || 'default';
        const agent = await getOrCreateResearchAgent();

        const edge = await associativeMemoryService.createEdge({
            fromMemoryId,
            toMemoryId,
            relation,
            strength,
            createdBy: agent.id,
            tenantId
        });

        return `Created relationship: ${fromMemoryId} -[${relation}]-> ${toMemoryId} (strength: ${strength})`;
    } catch (e: any) {
        return `Error linking memories: ${e.message}`;
    }
});

// ----------------------------------------------------------------------------
// ARCHIVAL TAGS TOOLS (Memory Organization)
// ----------------------------------------------------------------------------

export const lettaSaveWithTags = tool({
    name: 'letta_save_with_tags',
    description: 'Save a fact with tags for better organization and retrieval. Tags help categorize memories by topic, source, or priority.',
    inputSchema: z.object({
        content: z.string().describe('The content to save'),
        tags: z.array(z.string()).describe('Tags to apply. Use format "prefix:value" like "category:competitor", "priority:high", "agent:ezal"')
    }),
    outputSchema: z.string(),
}, async ({ content, tags }) => {
    try {
        const agent = await getOrCreateResearchAgent();
        const tenantId = (global as any).currentTenantId || 'default';

        const result = await archivalTagsService.insertWithTags(agent.id, {
            content,
            tags,
            agentId: agent.id,
            tenantId
        });

        return `Saved with tags: ${result.tags.join(', ')}`;
    } catch (e: any) {
        return `Error saving with tags: ${e.message}`;
    }
});

export const lettaSearchByTags = tool({
    name: 'letta_search_by_tags',
    description: 'Search memories by tags. Combine tag filtering with optional text search for precise retrieval.',
    inputSchema: z.object({
        tags: z.array(z.string()).describe('Tags to filter by'),
        query: z.string().optional().describe('Optional text query to combine with tag filter'),
        requireAllTags: z.boolean().optional().describe('If true, only return memories with ALL specified tags')
    }),
    outputSchema: z.string(),
}, async ({ tags, query, requireAllTags = false }) => {
    try {
        const agent = await getOrCreateResearchAgent();

        const results = await archivalTagsService.searchByTags(agent.id, tags, {
            query,
            requireAllTags,
            limit: 5
        });

        if (results.length === 0) {
            return `No memories found with tags: ${tags.join(', ')}`;
        }

        return `Found ${results.length} memories:\n${results
            .map((r, i) => `${i + 1}. ${r.slice(0, 200)}...`)
            .join('\n')}`;
    } catch (e: any) {
        return `Error searching by tags: ${e.message}`;
    }
});

export const lettaSuggestTags = tool({
    name: 'letta_suggest_tags',
    description: 'Get tag suggestions for content. Use this before saving to ensure consistent tagging.',
    inputSchema: z.object({
        content: z.string().describe('The content to analyze for tag suggestions')
    }),
    outputSchema: z.string(),
}, async ({ content }) => {
    try {
        const suggestions = archivalTagsService.suggestTags(content);
        return `Suggested tags: ${suggestions.join(', ')}`;
    } catch (e: any) {
        return `Error suggesting tags: ${e.message}`;
    }
});

export const lettaMemoryTools = [
    // Semantic Memory (Facts)
    lettaSaveFact,
    lettaAsk,
    lettaSearchMemory,
    lettaUpdateCoreMemory,
    // Shared Memory (Blocks)
    lettaMessageAgent,
    lettaReadSharedBlock,
    // Episodic Memory (Conversations)
    lettaSearchConversations,
    lettaGetRecentContext,
    // Procedural Memory (Workflows)
    lettaFindWorkflow,
    lettaGetBestPractice,
    // Associative Memory (Graph)
    lettaFindRelatedMemories,
    lettaLinkMemories,
    // Archival Tags (Organization)
    lettaSaveWithTags,
    lettaSearchByTags,
    lettaSuggestTags,
];

