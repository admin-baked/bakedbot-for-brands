import { logger } from '@/lib/logger';
import { AgentMemory, AgentLogEntry, BrandDomainMemory } from './schemas';
import { MemoryAdapter } from './persistence';

// Define the shape of an Agent implementation
// TTools: A specific type defining the external capabilities this agent is allowed to use.
export interface AgentImplementation<TMemory extends AgentMemory, TTools = any> {
    agentName: string;

    // 1. Initialize & Sanity Checks
    initialize(brandMemory: BrandDomainMemory, agentMemory: TMemory): Promise<TMemory>;

    // 2. Orient
    // Stimulus: Optional external trigger (e.g. Chat Message, Webhook Event)
    orient(brandMemory: BrandDomainMemory, agentMemory: TMemory, stimulus?: any): Promise<string | null>;

    // 3. Act
    // Now accepts tools explicitly injected by the harness/caller
    act(
        brandMemory: BrandDomainMemory,
        agentMemory: TMemory,
        targetId: string,
        tools: TTools,
        stimulus?: any
    ): Promise<{
        updatedMemory: TMemory;
        logEntry: Omit<AgentLogEntry, 'id' | 'timestamp' | 'agent_name'>
    }>;
}

/**
 * The Standard Agent Harness
 */
export async function runAgent<TMemory extends AgentMemory, TTools = any>(
    brandId: string,
    adapter: MemoryAdapter,
    implementation: AgentImplementation<TMemory, TTools>,
    tools: TTools, // Dependency Injection for effects
    stimulus?: any // Optional input (e.g. user message)
): Promise<AgentLogEntry | undefined> {

    const { agentName } = implementation;
    logger.info(`[Harness] Starting ${agentName} for brand ${brandId}`);

    try {
        // A. Load State
        const brandMemory = await adapter.loadBrandMemory(brandId);
        let agentMemory = await adapter.loadAgentMemory<TMemory>(brandId, agentName);

        // B. Initialize
        agentMemory = await implementation.initialize(brandMemory, agentMemory);

        // C. Orient
        // Check for urgent messages on the bus
        try {
            // Import dynamically to avoid circular deps
            const { getPendingMessages } = await import('../intuition/agent-bus');
            const messages = await getPendingMessages(brandId, agentName as any);
            if (messages.length > 0) {
                logger.info(`[Harness] ${agentName}: Has ${messages.length} pending messages. (Topic: ${messages[0].topic})`);
                // TODO: In future, inject these messages into 'stimulus' or 'agentMemory' context
            }
        } catch (e) {
            // Ignore bus errors, don't crash agent
        }

        const targetId = await implementation.orient(brandMemory, agentMemory, stimulus);

        if (!targetId) {
            logger.info(`[Harness] ${agentName}: No work target selected. Exiting.`);
            return;
        }

        logger.info(`[Harness] ${agentName}: Selected target ${targetId}`);

        // D. Act
        const result = await implementation.act(brandMemory, agentMemory, targetId, tools, stimulus);

        // E. Persist
        await adapter.saveAgentMemory(brandId, agentName, result.updatedMemory);

        const now = new Date(); // Capture time for consistency and type safety

        const logEntry: AgentLogEntry = {
            id: crypto.randomUUID(),
            timestamp: now,
            agent_name: agentName,
            target_id: targetId,
            stimulus: stimulus ? JSON.stringify(stimulus).slice(0, 100) : undefined,
            ...result.logEntry
        };

        await adapter.appendLog(brandId, agentName, logEntry);

        // --- Intuition OS Integration: Loop 1 (Log Everything) ---
        // Fire and forget logging to global event stream
        try {
            // Import dynamically to avoid circular deps if any (though clear here)
            const { logAgentEvent } = await import('../intuition/agent-events');

            await logAgentEvent({
                id: logEntry.id, // Align IDs for traceability
                tenantId: brandId,
                agent: agentName as any, // Cast to AgentName
                sessionId: 'harness_session', // TODO: Pass session ID through harness
                type: 'task_completed',
                payload: {
                    action: result.logEntry.action,
                    result: result.logEntry.result,
                    targetId,
                    stimulus: logEntry.stimulus,
                    ...(result.logEntry.metadata || {})
                },
                confidenceScore: result.logEntry.metadata?.confidence ? Number(result.logEntry.metadata.confidence) : undefined,
                systemMode: 'slow', // Harness runs are generally "System 2" / Offline / Slow
                createdAt: now.toISOString(),
            });
        } catch (e) {
            logger.warn(`[Harness] Failed to log intuition event: ${e}`);
        }

        logger.info(`[Harness] ${agentName}: Cycle complete. Target ${targetId} processed.`);
        return logEntry;

    } catch (error) {
        logger.error(`[Harness] ${agentName} failed:`, error as any);
        throw error;
    }
}

