/**
 * Intuition OS - Nightly Dream Cycle
 * 
 * Offline consolidation job that strengthens agent intuition.
 * 
 * Runs at 3 AM daily:
 * - Consolidate memories
 * - Discover patterns
 * - Run simulations
 * - Prune stale data
 * - Update readiness scores
 */

import { updateMemoryFromEvents, getPatternClusters, assignCustomerToCluster } from './customer-memory';
import { runHeuristicEvolutionJob, analyzeSystemPerformance } from './outcomes';
import { cleanupExpiredMessages } from './agent-bus';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';

// --- Dream Cycle Configuration ---

export interface DreamCycleConfig {
    memoryConsolidationEnabled: boolean;
    patternDiscoveryEnabled: boolean;
    simulationsEnabled: boolean;
    dataRetentionDays: number;
}

const DEFAULT_CONFIG: DreamCycleConfig = {
    memoryConsolidationEnabled: true,
    patternDiscoveryEnabled: true,
    simulationsEnabled: false, // V2 feature
    dataRetentionDays: 90,
};

// --- Dream Cycle Results ---

export interface DreamCycleResult {
    tenantId: string;
    startedAt: string;
    completedAt: string;
    memoriesConsolidated: number;
    patternsDiscovered: number;
    eventsArchived: number;
    messagesCleanedUp: number;
    heuristicsEvolved: {
        analyzed: number;
        flaggedForReview: number;
        autoDisabled: number;
    };
    systemPerformance: {
        fastPathUsage: number;
        avgConfidenceScore: number;
        totalRevenue: number;
    };
    readinessScore: number;
}

// --- Memory Consolidation ---

/**
 * Consolidates customer memories from recent events.
 */
async function consolidateMemoriesTask(tenantId: string): Promise<number> {
    logger.info(`[DreamCycle] Consolidating memories for ${tenantId}`);

    try {
        const { firestore } = await createServerClient();

        // Get customers with recent activity
        const recentEvents = await firestore
            .collection(`tenants/${tenantId}/agentEvents`)
            .where('customerId', '!=', null)
            .orderBy('customerId')
            .orderBy('createdAt', 'desc')
            .limit(500)
            .get();

        // Get unique customer IDs
        const customerIds = new Set<string>();
        for (const doc of recentEvents.docs) {
            const customerId = doc.data().customerId;
            if (customerId) customerIds.add(customerId);
        }

        // Update memory for each customer
        let consolidated = 0;
        for (const customerId of Array.from(customerIds)) {
            try {
                await updateMemoryFromEvents(tenantId, customerId);
                await assignCustomerToCluster(tenantId, customerId);
                consolidated++;
            } catch (error) {
                logger.warn(`[DreamCycle] Failed to consolidate memory for ${customerId}`);
            }
        }

        return consolidated;
    } catch (error) {
        logger.error('[DreamCycle] Memory consolidation failed',
            error instanceof Error ? error : new Error(String(error)));
        return 0;
    }
}

// --- Pattern Discovery ---

/**
 * Discovers new customer patterns through clustering.
 * V1: Simple effect-based clustering
 * V2: Would use k-means on embeddings
 */
async function discoverPatternsTask(tenantId: string): Promise<number> {
    logger.info(`[DreamCycle] Discovering patterns for ${tenantId}`);

    try {
        const { firestore } = await createServerClient();

        // Get all customer memories
        const memories = await firestore
            .collection(`tenants/${tenantId}/agentMemories`)
            .where('interactionCount', '>=', 5) // Only active customers
            .get();

        // Aggregate effects across customers
        const effectCounts: Map<string, number> = new Map();

        for (const doc of memories.docs) {
            const memory = doc.data();
            for (const effect of memory.favoriteEffects || []) {
                effectCounts.set(effect, (effectCounts.get(effect) || 0) + 1);
            }
        }

        // Identify significant effects (mentioned by >10% of customers)
        const threshold = memories.size * 0.1;
        const significantEffects = Array.from(effectCounts.entries())
            .filter(([, count]) => count >= threshold)
            .map(([effect]) => effect);

        // Check if we need new clusters
        const existingClusters = await getPatternClusters(tenantId, 'customer_cluster');
        const existingLabels = new Set(existingClusters.map(c => c.label.toLowerCase()));

        let patternsCreated = 0;

        for (const effect of significantEffects) {
            const clusterLabel = `${effect}_lovers`;

            if (!existingLabels.has(clusterLabel.toLowerCase())) {
                // Create new cluster
                await firestore
                    .collection(`tenants/${tenantId}/patterns`)
                    .add({
                        id: `pattern_${Date.now()}_${effect}`,
                        tenantId,
                        label: clusterLabel,
                        type: 'customer_cluster',
                        supportCount: effectCounts.get(effect) || 0,
                        topProducts: [],
                        topEffects: [effect],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });

                patternsCreated++;
            }
        }

        return patternsCreated;
    } catch (error) {
        logger.error('[DreamCycle] Pattern discovery failed',
            error instanceof Error ? error : new Error(String(error)));
        return 0;
    }
}

// --- Data Archival ---

/**
 * Archives old events to reduce storage costs.
 */
async function archiveOldEventsTask(
    tenantId: string,
    retentionDays: number
): Promise<number> {
    logger.info(`[DreamCycle] Archiving events older than ${retentionDays} days`);

    try {
        const { firestore } = await createServerClient();
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

        const oldEvents = await firestore
            .collection(`tenants/${tenantId}/agentEvents`)
            .where('createdAt', '<', cutoffDate.toISOString())
            .limit(500) // Process in batches
            .get();

        if (oldEvents.empty) return 0;

        const batch = firestore.batch();
        for (const doc of oldEvents.docs) {
            batch.delete(doc.ref);
        }
        await batch.commit();

        return oldEvents.size;
    } catch (error) {
        logger.error('[DreamCycle] Event archival failed',
            error instanceof Error ? error : new Error(String(error)));
        return 0;
    }
}

// --- Readiness Score ---

/**
 * Calculates agent readiness score for a tenant.
 * 0-100 score based on data quality and coverage.
 */
async function calculateReadinessScore(tenantId: string): Promise<number> {
    try {
        const { firestore } = await createServerClient();

        // Check data completeness
        const [memories, heuristics, patterns, events] = await Promise.all([
            firestore.collection(`tenants/${tenantId}/agentMemories`).limit(1).get(),
            firestore.collection(`tenants/${tenantId}/heuristics`).limit(1).get(),
            firestore.collection(`tenants/${tenantId}/patterns`).limit(1).get(),
            firestore.collection(`tenants/${tenantId}/agentEvents`).limit(100).get(),
        ]);

        let score = 0;

        // Has customer memories
        if (!memories.empty) score += 20;

        // Has heuristics configured
        if (!heuristics.empty) score += 25;

        // Has pattern clusters
        if (!patterns.empty) score += 15;

        // Has sufficient events
        const eventCount = events.size;
        if (eventCount >= 100) score += 20;
        else if (eventCount >= 50) score += 15;
        else if (eventCount >= 10) score += 10;

        // Has recent activity (events in last 24h)
        if (events.size > 0) {
            const recentEvent = events.docs[0].data();
            const eventDate = new Date(recentEvent.createdAt);
            const hoursSince = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60);

            if (hoursSince < 24) score += 20;
            else if (hoursSince < 72) score += 10;
        }

        return Math.min(100, score);
    } catch (error) {
        return 0;
    }
}

// --- Main Dream Cycle ---

/**
 * Runs the full nightly dream cycle for a tenant.
 */
export async function runDreamCycle(
    tenantId: string,
    config: Partial<DreamCycleConfig> = {}
): Promise<DreamCycleResult> {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const startedAt = new Date().toISOString();

    logger.info(`[DreamCycle] Starting for tenant ${tenantId}`);

    // 1. Consolidate memories
    let memoriesConsolidated = 0;
    if (cfg.memoryConsolidationEnabled) {
        memoriesConsolidated = await consolidateMemoriesTask(tenantId);
    }

    // 2. Discover patterns
    let patternsDiscovered = 0;
    if (cfg.patternDiscoveryEnabled) {
        patternsDiscovered = await discoverPatternsTask(tenantId);
    }

    // 3. Evolve heuristics
    const heuristicsEvolved = await runHeuristicEvolutionJob(tenantId);

    // 4. Archive old events
    const eventsArchived = await archiveOldEventsTask(tenantId, cfg.dataRetentionDays);

    // 5. Cleanup expired messages
    const messagesCleanedUp = await cleanupExpiredMessages(tenantId);

    // 6. Analyze system performance
    const performance = await analyzeSystemPerformance(tenantId, 24);

    // 7. Calculate readiness
    const readinessScore = await calculateReadinessScore(tenantId);

    const result: DreamCycleResult = {
        tenantId,
        startedAt,
        completedAt: new Date().toISOString(),
        memoriesConsolidated,
        patternsDiscovered,
        eventsArchived,
        messagesCleanedUp,
        heuristicsEvolved,
        systemPerformance: {
            fastPathUsage: performance.fastPathUsage,
            avgConfidenceScore: performance.avgConfidenceScore,
            totalRevenue: performance.totalRevenue,
        },
        readinessScore,
    };

    logger.info(`[DreamCycle] Completed for ${tenantId}. Readiness: ${readinessScore}%`);

    return result;
}

/**
 * Runs dream cycle for all tenants.
 * This would be called by a Cloud Scheduler.
 */
export async function runGlobalDreamCycle(): Promise<DreamCycleResult[]> {
    logger.info('[DreamCycle] Starting global dream cycle');

    try {
        const { firestore } = await createServerClient();

        // Get all tenants with recent activity
        const tenants = await firestore
            .collection('tenants')
            .get();

        const results: DreamCycleResult[] = [];

        for (const tenant of tenants.docs) {
            try {
                const result = await runDreamCycle(tenant.id);
                results.push(result);
            } catch (error) {
                logger.error(`[DreamCycle] Failed for tenant ${tenant.id}`,
                    error instanceof Error ? error : new Error(String(error)));
            }
        }

        logger.info(`[DreamCycle] Global cycle complete. Processed ${results.length} tenants`);
        return results;
    } catch (error) {
        logger.error('[DreamCycle] Global cycle failed',
            error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}
