import { logger } from '@/lib/logger';
import { AgentMemory, AgentLogEntry, BrandDomainMemory } from './schemas';

// Define the shape of an Agent implementation
export interface AgentImplementation<TMemory extends AgentMemory> {
    agentName: string;

    // 1. Initialize & Sanity Checks
    // Returns updated memory if repairs were needed, or just same memory
    initialize(brandMemory: BrandDomainMemory, agentMemory: TMemory): Promise<TMemory>;

    // 2. Orient
    // Pick a target ID (task, experiment, backlog item) to work on
    orient(brandMemory: BrandDomainMemory, agentMemory: TMemory): Promise<string | null>;

    // 3. Act
    // Perform work on the target. Returns a result object and log data.
    act(
        brandMemory: BrandDomainMemory,
        agentMemory: TMemory,
        targetId: string
    ): Promise<{
        updatedMemory: TMemory;
        logEntry: Omit<AgentLogEntry, 'id' | 'timestamp' | 'agent_name'>
    }>;
}

/**
 * The Standard Agent Harness
 * 
 * Orchestrates the lifecycle:
 * Load -> Initialize -> Orient -> Act -> Update -> Log
 */
export async function runAgent<TMemory extends AgentMemory>(
    brandId: string,
    loader: {
        loadBrandMemory: (brandId: string) => Promise<BrandDomainMemory>;
        loadAgentMemory: (brandId: string, agentName: string) => Promise<TMemory>;
        saveAgentMemory: (brandId: string, agentName: string, memory: TMemory) => Promise<void>;
        appendLog: (brandId: string, agentName: string, entry: AgentLogEntry) => Promise<void>;
    },
    implementation: AgentImplementation<TMemory>
): Promise<void> {

    const { agentName } = implementation;
    logger.info(`[Harness] Starting ${agentName} for brand ${brandId}`);

    try {
        // A. Load State
        const brandMemory = await loader.loadBrandMemory(brandId);
        let agentMemory = await loader.loadAgentMemory(brandId, agentName);

        // B. Initialize
        agentMemory = await implementation.initialize(brandMemory, agentMemory);

        // C. Orient
        const targetId = await implementation.orient(brandMemory, agentMemory);

        if (!targetId) {
            logger.info(`[Harness] ${agentName}: No work target selected. Exiting.`);
            return; // No work to do
        }

        logger.info(`[Harness] ${agentName}: Selected target ${targetId}`);

        // D. Act
        const result = await implementation.act(brandMemory, agentMemory, targetId);

        // E. Persist
        await loader.saveAgentMemory(brandId, agentName, result.updatedMemory);

        const logEntry: AgentLogEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date(), // serialized by schema
            agent_name: agentName,
            target_id: targetId,
            ...result.logEntry
        };

        await loader.appendLog(brandId, agentName, logEntry);

        logger.info(`[Harness] ${agentName}: Cycle complete. Target ${targetId} processed.`);

    } catch (error) {
        logger.error(`[Harness] ${agentName} failed:`, error);
        // In a real system, we might want to write a "failure" log entry here
        throw error;
    }
}
