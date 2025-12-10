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
    orient(brandMemory: BrandDomainMemory, agentMemory: TMemory): Promise<string | null>;

    // 3. Act
    // Now accepts tools explicitly injected by the harness/caller
    act(
        brandMemory: BrandDomainMemory,
        agentMemory: TMemory,
        targetId: string,
        tools: TTools
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
    tools: TTools // Dependency Injection for effects
): Promise<void> {

    const { agentName } = implementation;
    logger.info(`[Harness] Starting ${agentName} for brand ${brandId}`);

    try {
        // A. Load State
        const brandMemory = await adapter.loadBrandMemory(brandId);
        let agentMemory = await adapter.loadAgentMemory<TMemory>(brandId, agentName);

        // B. Initialize
        agentMemory = await implementation.initialize(brandMemory, agentMemory);

        // C. Orient
        const targetId = await implementation.orient(brandMemory, agentMemory);

        if (!targetId) {
            logger.info(`[Harness] ${agentName}: No work target selected. Exiting.`);
            return;
        }

        logger.info(`[Harness] ${agentName}: Selected target ${targetId}`);

        // D. Act
        const result = await implementation.act(brandMemory, agentMemory, targetId, tools);

        // E. Persist
        await adapter.saveAgentMemory(brandId, agentName, result.updatedMemory);

        const logEntry: AgentLogEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            agent_name: agentName,
            target_id: targetId,
            ...result.logEntry
        };

        await adapter.appendLog(brandId, agentName, logEntry);

        logger.info(`[Harness] ${agentName}: Cycle complete. Target ${targetId} processed.`);

    } catch (error) {
        logger.error(`[Harness] ${agentName} failed:`, error as any);
        throw error;
    }
}

