/**
 * Sleep-Time Agent Service
 *
 * Implements Letta's Sleep-Time architecture for background memory consolidation.
 * Sleep-time agents run asynchronously to process accumulated data and distill
 * insights into shared memory blocks.
 *
 * Key concept: While the primary agent handles user interactions, the sleep-time
 * agent reflects on raw data to generate "learned context" - synthesized insights.
 *
 * Reference: https://docs.letta.com/guides/agents/architectures/sleeptime
 */

import { logger } from '@/lib/logger';
import { lettaClient, LettaAgent } from './client';
import { lettaBlockManager, BLOCK_LABELS } from './block-manager';
import { SleepTimeConsolidation } from './memory-types';
import { ai } from '@/ai/genkit';

// =============================================================================
// SLEEP-TIME CONFIGURATION
// =============================================================================

export interface SleepTimeConfig {
    /** Number of messages between sleep-time triggers */
    triggerFrequency: number;
    /** Maximum tokens to process per consolidation */
    maxTokensPerRun: number;
    /** Block labels to update during consolidation */
    targetBlocks: string[];
    /** System prompt for the sleep-time agent */
    systemPrompt: string;
}

const DEFAULT_CONFIG: SleepTimeConfig = {
    triggerFrequency: 5,
    maxTokensPerRun: 4000,
    targetBlocks: [BLOCK_LABELS.CUSTOMER_INSIGHTS, BLOCK_LABELS.BRAND_CONTEXT],
    systemPrompt: `You are a background memory consolidation agent. Your job is to:
1. Review recent conversation history and accumulated data
2. Extract key insights, patterns, and learnings
3. Update memory blocks with distilled, actionable knowledge
4. Identify important facts to archive for long-term storage

Be concise. Focus on what matters. Discard noise.`,
};

// =============================================================================
// SLEEP-TIME AGENT SERVICE
// =============================================================================

export class SleepTimeAgentService {
    private config: SleepTimeConfig;
    private messageCounters: Map<string, number> = new Map();

    constructor(config: Partial<SleepTimeConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Check if sleep-time consolidation should trigger for an agent.
     * Call this after each message is processed.
     */
    shouldTrigger(agentId: string): boolean {
        const count = (this.messageCounters.get(agentId) || 0) + 1;
        this.messageCounters.set(agentId, count);

        if (count >= this.config.triggerFrequency) {
            this.messageCounters.set(agentId, 0);
            return true;
        }
        return false;
    }

    /**
     * Run sleep-time consolidation for an agent.
     * This processes recent messages and updates memory blocks.
     */
    async runConsolidation(
        primaryAgentId: string,
        tenantId: string
    ): Promise<SleepTimeConsolidation> {
        const consolidationId = `stc-${Date.now()}`;
        const startTime = new Date();

        logger.info(`[SleepTime] Starting consolidation ${consolidationId} for agent ${primaryAgentId}`);

        const result: SleepTimeConsolidation = {
            id: consolidationId,
            agentId: primaryAgentId,
            tenantId,
            triggeredAt: startTime,
            status: 'running',
            inputMessages: 0,
            outputInsights: [],
            blocksUpdated: [],
            newArchivalEntries: 0,
        };

        try {
            // 1. Gather recent messages
            const messages = await lettaClient.getMessages(primaryAgentId, 50);
            result.inputMessages = messages.length;

            if (messages.length === 0) {
                result.status = 'completed';
                result.completedAt = new Date();
                return result;
            }

            // 2. Prepare context for consolidation
            const conversationContext = messages
                .map(m => `[${m.role}]: ${m.content}`)
                .join('\n');

            // 3. Get current block states
            const blockStates: Record<string, string> = {};
            for (const label of this.config.targetBlocks) {
                try {
                    const content = await lettaBlockManager.readBlock(tenantId, label as any);
                    blockStates[label] = content;
                } catch {
                    blockStates[label] = '';
                }
            }

            // 4. Run consolidation with Gemini (fast, cost-effective)
            const consolidationPrompt = `
${this.config.systemPrompt}

## RECENT CONVERSATION HISTORY
${conversationContext.slice(0, this.config.maxTokensPerRun * 4)}

## CURRENT MEMORY BLOCKS
${Object.entries(blockStates)
    .map(([label, content]) => `### ${label}\n${content}`)
    .join('\n\n')}

## YOUR TASK
1. Identify the top 3-5 insights from the conversation that should be remembered.
2. For each target block, suggest updates (if any). Be specific about what to add/change.
3. List any facts that should be archived for long-term storage.

Respond in JSON format:
{
    "insights": ["insight 1", "insight 2", ...],
    "blockUpdates": {
        "block_label": "content to append or 'NO_CHANGE'",
        ...
    },
    "archivalFacts": ["fact 1", "fact 2", ...]
}`;

            const response = await ai.generate({
                model: 'googleai/gemini-2.5-flash',
                prompt: consolidationPrompt,
                output: {
                    format: 'json',
                },
            });

            // 5. Parse and apply consolidation results
            let consolidationResult: {
                insights: string[];
                blockUpdates: Record<string, string>;
                archivalFacts: string[];
            };

            try {
                consolidationResult = JSON.parse(response.text);
            } catch {
                // If JSON parsing fails, extract what we can
                consolidationResult = {
                    insights: [],
                    blockUpdates: {},
                    archivalFacts: [],
                };
            }

            result.outputInsights = consolidationResult.insights || [];

            // 6. Apply block updates
            for (const [label, update] of Object.entries(consolidationResult.blockUpdates || {})) {
                if (update && update !== 'NO_CHANGE') {
                    try {
                        await lettaBlockManager.appendToBlock(
                            tenantId,
                            label as any,
                            update,
                            'SleepTimeAgent'
                        );
                        result.blocksUpdated.push(label);
                    } catch (e: unknown) {
                        logger.warn(`[SleepTime] Failed to update block ${label}:`, e as Record<string, any>);
                    }
                }
            }

            // 7. Archive facts
            for (const fact of consolidationResult.archivalFacts || []) {
                try {
                    await lettaClient.insertPassage(primaryAgentId, fact);
                    result.newArchivalEntries++;
                } catch (e: unknown) {
                    logger.warn(`[SleepTime] Failed to archive fact:`, e as Record<string, any>);
                }
            }

            result.status = 'completed';
            result.completedAt = new Date();

            logger.info(
                `[SleepTime] Consolidation complete: ${result.outputInsights.length} insights, ` +
                `${result.blocksUpdated.length} blocks updated, ${result.newArchivalEntries} facts archived`
            );

            return result;
        } catch (error: unknown) {
            logger.error('[SleepTime] Consolidation failed:', error as Record<string, any>);
            result.status = 'failed';
            result.completedAt = new Date();
            return result;
        }
    }

    /**
     * Create a dedicated sleep-time agent for a tenant.
     * This agent shares memory blocks with the primary agents.
     */
    async createSleepTimeAgent(
        tenantId: string,
        primaryAgentId: string
    ): Promise<LettaAgent> {
        const agentName = `${tenantId}_sleeptime`;

        // Get blocks from primary agent
        const primaryBlocks = await lettaClient.getAgentBlocks(primaryAgentId);
        const blockIds = primaryBlocks.map(b => b.id);

        // Create sleep-time agent with same blocks (shared memory)
        const sleepAgent = await lettaClient.createAgent(
            agentName,
            this.config.systemPrompt,
            blockIds
        );

        logger.info(`[SleepTime] Created sleep-time agent ${agentName} with ${blockIds.length} shared blocks`);

        return sleepAgent;
    }

    /**
     * Run consolidated analysis across multiple agents for a tenant.
     * Useful for end-of-day or weekly rollups.
     */
    async runTenantWideConsolidation(
        tenantId: string,
        agentIds: string[]
    ): Promise<SleepTimeConsolidation[]> {
        const results: SleepTimeConsolidation[] = [];

        for (const agentId of agentIds) {
            try {
                const result = await this.runConsolidation(agentId, tenantId);
                results.push(result);
            } catch (error: unknown) {
                logger.error(`[SleepTime] Failed consolidation for ${agentId}:`, error as Record<string, any>);
            }
        }

        return results;
    }
}

export const sleepTimeService = new SleepTimeAgentService();

// =============================================================================
// CRON INTEGRATION
// =============================================================================

/**
 * Call from /api/cron/tick or similar scheduled endpoint
 * to run background memory consolidation.
 */
export async function runScheduledConsolidation(tenantId: string): Promise<void> {
    logger.info(`[SleepTime] Running scheduled consolidation for tenant ${tenantId}`);

    try {
        // Get all agents for tenant (would need to be implemented)
        const agents = await lettaClient.listAgents();
        const tenantAgents = agents.filter(a => a.name.startsWith(tenantId));

        if (tenantAgents.length === 0) {
            logger.info(`[SleepTime] No agents found for tenant ${tenantId}`);
            return;
        }

        const results = await sleepTimeService.runTenantWideConsolidation(
            tenantId,
            tenantAgents.map(a => a.id)
        );

        const totalInsights = results.reduce((sum, r) => sum + r.outputInsights.length, 0);
        const totalArchived = results.reduce((sum, r) => sum + r.newArchivalEntries, 0);

        logger.info(
            `[SleepTime] Scheduled consolidation complete: ${results.length} agents, ` +
            `${totalInsights} insights, ${totalArchived} facts archived`
        );
    } catch (error: unknown) {
        logger.error('[SleepTime] Scheduled consolidation failed:', error as Record<string, any>);
    }
}
