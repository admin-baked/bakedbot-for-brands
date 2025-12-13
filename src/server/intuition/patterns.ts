/**
 * Intuition OS - Patterns Engine
 * 
 * Loop 2b: Offline Learning (Clustering)
 * 
 * Manages "Pattern Clusters" which are learned groupings of:
 * - Customers (Tribes)
 * - Products (Substitutes/Complements)
 * - Behaviors (Journeys)
 * 
 * These clusters are usually updated by offline jobs (Cloud Run / Scheduled),
 * not real-time events.
 */

import {
    PatternCluster,
    AgentEventType
} from './schema';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// --- Collection Paths ---

function getPatternsCollection(tenantId: string) {
    return `tenants/${tenantId}/patterns`;
}

// --- Pattern CRUD ---

/**
 * Creates or overwrites a pattern cluster.
 */
export async function savePatternCluster(
    tenantId: string,
    cluster: Omit<PatternCluster, 'createdAt' | 'updatedAt'>
): Promise<string> {
    const { firestore } = await createServerClient();
    const now = new Date().toISOString();

    // Check if exists to preserve createdAt
    const docRef = firestore.collection(getPatternsCollection(tenantId)).doc(cluster.id);
    const doc = await docRef.get();

    const fullCluster: PatternCluster = {
        ...cluster,
        createdAt: doc.exists ? (doc.data() as PatternCluster).createdAt : now,
        updatedAt: now,
    };

    await docRef.set(fullCluster);
    logger.info(`[Patterns] Saved cluster: ${cluster.label} (${cluster.type})`);
    return cluster.id;
}

/**
 * Retrieves specific pattern clusters by type.
 */
export async function getPatternsByType(
    tenantId: string,
    type: PatternCluster['type']
): Promise<PatternCluster[]> {
    try {
        const { firestore } = await createServerClient();
        const snapshot = await firestore
            .collection(getPatternsCollection(tenantId))
            .where('type', '==', type)
            .orderBy('supportCount', 'desc') // usually want biggest clusters first
            .get();

        return snapshot.docs.map(doc => doc.data() as PatternCluster);
    } catch (error) {
        logger.error('[Patterns] Failed to get patterns',
            error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}

/**
 * Deletes a pattern cluster (rare, usually for cleanup).
 */
export async function deletePatternCluster(
    tenantId: string,
    clusterId: string
): Promise<void> {
    const { firestore } = await createServerClient();
    await firestore.collection(getPatternsCollection(tenantId)).doc(clusterId).delete();
    logger.info(`[Patterns] Deleted cluster: ${clusterId}`);
}

// --- Pattern Logic Helpers ---

/**
 * Updates pattern metadata/stats (e.g. increase support count).
 */
export async function incrementPatternSupport(
    tenantId: string,
    clusterId: string,
    incrementBy: number = 1
): Promise<void> {
    try {
        const { firestore } = await createServerClient();
        const docRef = firestore.collection(getPatternsCollection(tenantId)).doc(clusterId);

        await firestore.runTransaction(async (t) => {
            const doc = await t.get(docRef);
            if (!doc.exists) return; // Silent fail if gone

            const current = doc.data() as PatternCluster;
            t.update(docRef, {
                supportCount: current.supportCount + incrementBy,
                updatedAt: new Date().toISOString()
            });
        });
    } catch (error) {
        logger.error('[Patterns] Failed to increment support',
            error instanceof Error ? error : new Error(String(error)));
    }
}
