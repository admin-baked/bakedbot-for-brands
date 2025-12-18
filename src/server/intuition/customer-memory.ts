/**
 * Intuition OS - Customer Memory Service
 * 
 * Loop 2: Summarize & Cluster
 * 
 * Aggregates raw agent events into structured customer memories.
 * These memories enable "this feels like last time" intuition.
 */

import {
    CustomerMemoryProfile,
    AgentEvent,
    PatternCluster,
    PotencyTolerance,
    AgentEventType
} from './schema';
import { getRecentEvents } from './agent-events';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// --- Collection Paths ---

function getMemoriesCollection(tenantId: string) {
    return `tenants/${tenantId}/agentMemories`;
}

function getPatternsCollection(tenantId: string) {
    return `tenants/${tenantId}/patterns`;
}

// --- Memory CRUD ---

/**
 * Gets or creates a customer memory profile.
 */
export async function getCustomerMemory(
    tenantId: string,
    customerId: string
): Promise<CustomerMemoryProfile | null> {
    try {
        const { firestore } = await createServerClient();
        const doc = await firestore
            .collection(getMemoriesCollection(tenantId))
            .doc(`customer_${customerId}`)
            .get();

        if (!doc.exists) {
            return null;
        }

        return doc.data() as CustomerMemoryProfile;
    } catch (error) {
        logger.error('[CustomerMemory] Failed to get memory',
            error instanceof Error ? error : new Error(String(error)));
        return null;
    }
}

/**
 * Creates a new customer memory profile.
 */
export async function createCustomerMemory(
    tenantId: string,
    customerId: string,
    initialData?: Partial<CustomerMemoryProfile>
): Promise<CustomerMemoryProfile> {
    const { firestore } = await createServerClient();
    const now = new Date().toISOString();

    const memory: CustomerMemoryProfile = {
        id: `customer_${customerId}`,
        tenantId,
        customerId,
        favoriteEffects: [],
        avoidEffects: [],
        preferredFormats: [],
        favoriteDispensaryIds: [],
        potencyTolerance: 'medium',
        lastProducts: [],
        interactionCount: 0,
        clusters: [],
        similarCustomerIds: [],
        lastUpdated: now,
        createdAt: now,
        ...initialData,
    };

    await firestore
        .collection(getMemoriesCollection(tenantId))
        .doc(memory.id)
        .set(memory);

    logger.info(`[CustomerMemory] Created profile for customer ${customerId}`);
    return memory;
}

/**
 * Updates an existing customer memory profile.
 */
export async function updateCustomerMemory(
    tenantId: string,
    customerId: string,
    updates: Partial<CustomerMemoryProfile>
): Promise<CustomerMemoryProfile | null> {
    try {
        const { firestore } = await createServerClient();
        const docRef = firestore
            .collection(getMemoriesCollection(tenantId))
            .doc(`customer_${customerId}`);

        await docRef.update({
            ...updates,
            lastUpdated: new Date().toISOString(),
        });

        const updated = await docRef.get();
        return updated.data() as CustomerMemoryProfile;
    } catch (error) {
        logger.error('[CustomerMemory] Failed to update memory',
            error instanceof Error ? error : new Error(String(error)));
        return null;
    }
}

// --- Memory Aggregation (Event → Memory) ---

interface AggregationResult {
    effectsLiked: Map<string, number>;
    effectsDisliked: Map<string, number>;
    formatsUsed: Map<string, number>;
    productsViewed: string[];
    productsPurchased: string[];
    feedbackPositive: number;
    feedbackNegative: number;
    totalEvents: number;
}

/**
 * Aggregates raw events into memory signals.
 */
export async function aggregateCustomerEvents(
    tenantId: string,
    customerId: string,
    lookbackDays: number = 90
): Promise<AggregationResult> {
    const result: AggregationResult = {
        effectsLiked: new Map(),
        effectsDisliked: new Map(),
        formatsUsed: new Map(),
        productsViewed: [],
        productsPurchased: [],
        feedbackPositive: 0,
        feedbackNegative: 0,
        totalEvents: 0,
    };

    try {
        const events = await getRecentEvents(tenantId, {
            customerId,
            limit: 1000,
        });

        for (const event of events) {
            result.totalEvents++;
            const { payload } = event;

            switch (event.type) {
                case 'product_clicked':
                    if (payload.productId) {
                        result.productsViewed.push(payload.productId);
                    }
                    if (payload.effects && Array.isArray(payload.effects)) {
                        for (const effect of payload.effects) {
                            result.effectsLiked.set(effect, (result.effectsLiked.get(effect) || 0) + 1);
                        }
                    }
                    if (payload.form) {
                        result.formatsUsed.set(payload.form, (result.formatsUsed.get(payload.form) || 0) + 1);
                    }
                    break;

                case 'order_completed':
                    if (payload.products && Array.isArray(payload.products)) {
                        result.productsPurchased.push(...payload.products);
                    }
                    // Derive format preferences from orders implicitly in V2 with product catalog lookup
                    break;

                case 'feedback':
                    if (payload.feedbackType === 'thumbs_up') {
                        result.feedbackPositive++;
                        if (payload.effects && Array.isArray(payload.effects)) {
                            for (const effect of payload.effects) {
                                result.effectsLiked.set(effect, (result.effectsLiked.get(effect) || 0) + 2);
                            }
                        }
                    } else if (payload.feedbackType === 'thumbs_down') {
                        result.feedbackNegative++;
                        if (payload.effects && Array.isArray(payload.effects)) {
                            for (const effect of payload.effects) {
                                result.effectsDisliked.set(effect, (result.effectsDisliked.get(effect) || 0) + 1);
                            }
                        }
                    }
                    break;
            }
        }
    } catch (error) {
        logger.error('[CustomerMemory] Failed to aggregate events',
            error instanceof Error ? error : new Error(String(error)));
    }

    return result;
}

/**
 * Infers potency tolerance from purchase history.
 */
function inferPotencyTolerance(
    productsPurchased: string[],
    productThcLevels: Map<string, number>
): PotencyTolerance {
    if (productsPurchased.length === 0) return 'medium';

    const thcLevels = productsPurchased
        .map(p => productThcLevels.get(p))
        .filter((t): t is number => t !== undefined);

    if (thcLevels.length === 0) return 'medium';

    const avgThc = thcLevels.reduce((a, b) => a + b, 0) / thcLevels.length;

    if (avgThc <= 15) return 'low';
    if (avgThc >= 25) return 'high';
    return 'medium';
}

/**
 * Updates customer memory from aggregated events.
 */
export async function updateMemoryFromEvents(
    tenantId: string,
    customerId: string,
    productThcLevels?: Map<string, number>
): Promise<CustomerMemoryProfile | null> {
    // Get or create memory
    let memory = await getCustomerMemory(tenantId, customerId);
    if (!memory) {
        memory = await createCustomerMemory(tenantId, customerId);
    }

    // Aggregate recent events
    const aggregation = await aggregateCustomerEvents(tenantId, customerId);

    // Build updates
    const topEffects = Array.from(aggregation.effectsLiked.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([effect]) => effect);

    const avoidEffects = Array.from(aggregation.effectsDisliked.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([effect]) => effect);

    const topFormats = Array.from(aggregation.formatsUsed.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([format]) => format);

    const lastProducts = aggregation.productsPurchased.slice(-10);

    const potencyTolerance = productThcLevels
        ? inferPotencyTolerance(aggregation.productsPurchased, productThcLevels)
        : memory.potencyTolerance;

    // Update memory
    return updateCustomerMemory(tenantId, customerId, {
        favoriteEffects: topEffects,
        avoidEffects,
        preferredFormats: topFormats,
        lastProducts,
        potencyTolerance,
        interactionCount: memory.interactionCount + aggregation.totalEvents,
    });
}

// --- Pattern Clustering ---

/**
 * Gets all pattern clusters for a tenant.
 */
export async function getPatternClusters(
    tenantId: string,
    type?: PatternCluster['type']
): Promise<PatternCluster[]> {
    try {
        const { firestore } = await createServerClient();
        let query = firestore.collection(getPatternsCollection(tenantId));

        if (type) {
            query = query.where('type', '==', type) as any;
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => doc.data() as PatternCluster);
    } catch (error) {
        logger.error('[CustomerMemory] Failed to get patterns',
            error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}

/**
 * Assigns a customer to the best-matching cluster.
 */
export async function assignCustomerToCluster(
    tenantId: string,
    customerId: string
): Promise<string[]> {
    const memory = await getCustomerMemory(tenantId, customerId);
    if (!memory) return [];

    const clusters = await getPatternClusters(tenantId, 'customer_cluster');
    if (clusters.length === 0) return [];

    // Simple matching based on effect overlap
    const matchedClusters: Array<{ cluster: PatternCluster; score: number }> = [];

    for (const cluster of clusters) {
        let score = 0;

        // Score based on effect overlap
        for (const effect of memory.favoriteEffects) {
            if (cluster.topEffects.includes(effect)) {
                score += 2;
            }
        }

        if (score > 0) {
            matchedClusters.push({ cluster, score });
        }
    }

    // Sort by score and take top 3
    matchedClusters.sort((a, b) => b.score - a.score);
    const topClusters = matchedClusters.slice(0, 3).map(m => m.cluster.label);

    // Update memory with cluster assignments
    if (topClusters.length > 0) {
        await updateCustomerMemory(tenantId, customerId, {
            clusters: topClusters,
        });
    }

    return topClusters;
}

// --- Similar Customer Lookup ---

/**
 * Finds customers with similar preferences.
 */
export async function findSimilarCustomers(
    tenantId: string,
    customerId: string,
    limit: number = 10
): Promise<string[]> {
    const memory = await getCustomerMemory(tenantId, customerId);
    if (!memory || memory.favoriteEffects.length === 0) return [];

    try {
        const { firestore } = await createServerClient();

        // Query customers in same clusters
        const snapshot = await firestore
            .collection(getMemoriesCollection(tenantId))
            .where('clusters', 'array-contains-any', memory.clusters.slice(0, 3).length > 0 ? memory.clusters.slice(0, 3) : ['default'])
            .limit(limit + 1)
            .get();

        const similarIds = snapshot.docs
            .map(doc => doc.data() as CustomerMemoryProfile)
            .filter(m => m.customerId !== customerId)
            .map(m => m.customerId)
            .slice(0, limit);

        // Update memory with similar customers
        if (similarIds.length > 0) {
            await updateCustomerMemory(tenantId, customerId, {
                similarCustomerIds: similarIds,
            });
        }

        return similarIds;
    } catch (error) {
        logger.error('[CustomerMemory] Failed to find similar customers',
            error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}

// --- Memory Retrieval for Agents ---

/**
 * Gets a customer's memory context for agent use.
 * This is the main entry point for agents to access customer intuition.
 */
export async function getCustomerContext(
    tenantId: string,
    customerId: string
): Promise<{
    memory: CustomerMemoryProfile | null;
    isNewCustomer: boolean;
    confidence: number;
    clusterLabels: string[];
}> {
    const memory = await getCustomerMemory(tenantId, customerId);

    if (!memory) {
        return {
            memory: null,
            isNewCustomer: true,
            confidence: 0,
            clusterLabels: [],
        };
    }

    // Calculate confidence based on interaction count
    const confidence = Math.min(1, memory.interactionCount / 50);

    return {
        memory,
        isNewCustomer: memory.interactionCount < 3,
        confidence,
        clusterLabels: memory.clusters,
    };
}
