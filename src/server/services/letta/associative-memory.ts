/**
 * Associative Memory Service
 *
 * Implements graph-based memory relationships for pattern-triggered recall.
 * When you think "rose" and remember "blood" - that's associative memory.
 *
 * Use cases:
 * - "Something like what I got last time" → graph traversal to find related purchases
 * - "That competitor we discussed" → follow reference edges
 * - Detecting contradictions between memories
 * - Building knowledge graphs from facts
 *
 * Reference: Richmond Alake's Memory Engineering Framework
 */

import { logger } from '@/lib/logger';
import { MemoryEdge, MemoryEdgeSchema, MemoryUnit } from './memory-types';
import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// =============================================================================
// MEMORY GRAPH STORAGE
// =============================================================================

const EDGES_COLLECTION = 'memory_edges';

export type RelationType =
    | 'similar_to'
    | 'followed_by'
    | 'caused'
    | 'referenced_in'
    | 'contradicts'
    | 'supersedes';

export interface CreateEdgeParams {
    fromMemoryId: string;
    toMemoryId: string;
    relation: RelationType;
    strength?: number;
    createdBy: string;
    tenantId: string;
}

export class AssociativeMemoryService {
    /**
     * Create an edge (relationship) between two memories.
     */
    async createEdge(params: CreateEdgeParams): Promise<MemoryEdge> {
        const edge: MemoryEdge = {
            id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            fromMemoryId: params.fromMemoryId,
            toMemoryId: params.toMemoryId,
            relation: params.relation,
            strength: params.strength ?? 0.5,
            createdAt: new Date(),
            createdBy: params.createdBy,
        };

        // Validate
        MemoryEdgeSchema.parse(edge);

        // Store in Firestore
        const db = getAdminFirestore();
        await db
            .collection(EDGES_COLLECTION)
            .doc(edge.id)
            .set({
                ...edge,
                createdAt: FieldValue.serverTimestamp(),
                tenantId: params.tenantId,
            });

        logger.info(
            `[AssociativeMemory] Created edge: ${params.fromMemoryId} -[${params.relation}]-> ${params.toMemoryId}`
        );

        return edge;
    }

    /**
     * Find all memories related to a given memory.
     * Performs single-hop graph traversal.
     */
    async findRelated(
        memoryId: string,
        tenantId: string,
        options?: {
            relations?: RelationType[];
            minStrength?: number;
            limit?: number;
        }
    ): Promise<Array<{ edge: MemoryEdge; direction: 'outgoing' | 'incoming' }>> {
        const results: Array<{ edge: MemoryEdge; direction: 'outgoing' | 'incoming' }> = [];
        const db = getAdminFirestore();

        // Find outgoing edges (this memory → other)
        let outgoingQuery = db
            .collection(EDGES_COLLECTION)
            .where('tenantId', '==', tenantId)
            .where('fromMemoryId', '==', memoryId);

        if (options?.relations?.length) {
            outgoingQuery = outgoingQuery.where('relation', 'in', options.relations);
        }

        const outgoingSnap = await outgoingQuery.limit(options?.limit || 20).get();

        for (const doc of outgoingSnap.docs) {
            const data = doc.data();
            if (options?.minStrength && data.strength < options.minStrength) continue;

            results.push({
                edge: {
                    id: doc.id,
                    fromMemoryId: data.fromMemoryId,
                    toMemoryId: data.toMemoryId,
                    relation: data.relation,
                    strength: data.strength,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    createdBy: data.createdBy,
                },
                direction: 'outgoing',
            });
        }

        // Find incoming edges (other → this memory)
        let incomingQuery = db
            .collection(EDGES_COLLECTION)
            .where('tenantId', '==', tenantId)
            .where('toMemoryId', '==', memoryId);

        if (options?.relations?.length) {
            incomingQuery = incomingQuery.where('relation', 'in', options.relations);
        }

        const incomingSnap = await incomingQuery.limit(options?.limit || 20).get();

        for (const doc of incomingSnap.docs) {
            const data = doc.data();
            if (options?.minStrength && data.strength < options.minStrength) continue;

            results.push({
                edge: {
                    id: doc.id,
                    fromMemoryId: data.fromMemoryId,
                    toMemoryId: data.toMemoryId,
                    relation: data.relation,
                    strength: data.strength,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    createdBy: data.createdBy,
                },
                direction: 'incoming',
            });
        }

        // Sort by strength descending
        return results.sort((a, b) => b.edge.strength - a.edge.strength);
    }

    /**
     * Find path between two memories (multi-hop traversal).
     * Useful for understanding how concepts are connected.
     */
    async findPath(
        fromMemoryId: string,
        toMemoryId: string,
        tenantId: string,
        maxHops: number = 3
    ): Promise<MemoryEdge[] | null> {
        // BFS to find shortest path
        const visited = new Set<string>();
        const queue: Array<{ memoryId: string; path: MemoryEdge[] }> = [
            { memoryId: fromMemoryId, path: [] },
        ];

        while (queue.length > 0) {
            const current = queue.shift()!;

            if (current.memoryId === toMemoryId) {
                return current.path;
            }

            if (current.path.length >= maxHops) {
                continue;
            }

            if (visited.has(current.memoryId)) {
                continue;
            }
            visited.add(current.memoryId);

            // Get all outgoing edges
            const related = await this.findRelated(current.memoryId, tenantId, {
                limit: 10,
            });

            for (const { edge, direction } of related) {
                const nextMemoryId =
                    direction === 'outgoing' ? edge.toMemoryId : edge.fromMemoryId;

                if (!visited.has(nextMemoryId)) {
                    queue.push({
                        memoryId: nextMemoryId,
                        path: [...current.path, edge],
                    });
                }
            }
        }

        return null; // No path found
    }

    /**
     * Auto-detect and create similarity edges when new memories are added.
     * Call this after inserting a new memory to build the graph.
     */
    async autoLinkSimilar(
        newMemory: MemoryUnit,
        existingMemories: MemoryUnit[],
        tenantId: string,
        agentId: string,
        similarityThreshold: number = 0.7
    ): Promise<MemoryEdge[]> {
        const createdEdges: MemoryEdge[] = [];

        // Skip if no embeddings
        if (!newMemory.embedding || newMemory.embedding.length === 0) {
            return createdEdges;
        }

        for (const existing of existingMemories) {
            if (!existing.embedding || existing.embedding.length === 0) continue;
            if (existing.id === newMemory.id) continue;

            // Calculate cosine similarity
            const similarity = this.cosineSimilarity(
                newMemory.embedding,
                existing.embedding
            );

            if (similarity >= similarityThreshold) {
                const edge = await this.createEdge({
                    fromMemoryId: newMemory.id,
                    toMemoryId: existing.id,
                    relation: 'similar_to',
                    strength: similarity,
                    createdBy: agentId,
                    tenantId,
                });
                createdEdges.push(edge);
            }
        }

        if (createdEdges.length > 0) {
            logger.info(
                `[AssociativeMemory] Auto-linked ${createdEdges.length} similar memories for ${newMemory.id}`
            );
        }

        return createdEdges;
    }

    /**
     * Mark a memory as superseding another (newer info replaces old).
     */
    async markSupersedes(
        newMemoryId: string,
        oldMemoryId: string,
        tenantId: string,
        agentId: string
    ): Promise<MemoryEdge> {
        return this.createEdge({
            fromMemoryId: newMemoryId,
            toMemoryId: oldMemoryId,
            relation: 'supersedes',
            strength: 1.0,
            createdBy: agentId,
            tenantId,
        });
    }

    /**
     * Mark two memories as contradictory.
     */
    async markContradiction(
        memoryId1: string,
        memoryId2: string,
        tenantId: string,
        agentId: string
    ): Promise<MemoryEdge> {
        return this.createEdge({
            fromMemoryId: memoryId1,
            toMemoryId: memoryId2,
            relation: 'contradicts',
            strength: 1.0,
            createdBy: agentId,
            tenantId,
        });
    }

    /**
     * Get memories that contradict a given memory.
     * Useful for fact-checking and consistency.
     */
    async findContradictions(
        memoryId: string,
        tenantId: string
    ): Promise<string[]> {
        const related = await this.findRelated(memoryId, tenantId, {
            relations: ['contradicts'],
        });

        return related.map(r =>
            r.direction === 'outgoing' ? r.edge.toMemoryId : r.edge.fromMemoryId
        );
    }

    /**
     * Strengthen an edge (when the relationship is reinforced).
     */
    async reinforceEdge(edgeId: string, increment: number = 0.1): Promise<void> {
        const db = getAdminFirestore();
        const edgeRef = db.collection(EDGES_COLLECTION).doc(edgeId);
        const doc = await edgeRef.get();

        if (!doc.exists) return;

        const currentStrength = doc.data()?.strength || 0.5;
        const newStrength = Math.min(currentStrength + increment, 1.0);

        await edgeRef.update({ strength: newStrength });

        logger.debug(`[AssociativeMemory] Reinforced edge ${edgeId}: ${currentStrength} -> ${newStrength}`);
    }

    /**
     * Weaken an edge (decay over time or explicit downweight).
     */
    async weakenEdge(edgeId: string, decrement: number = 0.1): Promise<void> {
        const db = getAdminFirestore();
        const edgeRef = db.collection(EDGES_COLLECTION).doc(edgeId);
        const doc = await edgeRef.get();

        if (!doc.exists) return;

        const currentStrength = doc.data()?.strength || 0.5;
        const newStrength = Math.max(currentStrength - decrement, 0);

        if (newStrength <= 0) {
            // Remove edge if strength reaches 0
            await edgeRef.delete();
            logger.debug(`[AssociativeMemory] Removed weak edge ${edgeId}`);
        } else {
            await edgeRef.update({ strength: newStrength });
        }
    }

    /**
     * Get graph statistics for a tenant.
     */
    async getGraphStats(tenantId: string): Promise<{
        totalEdges: number;
        edgesByRelation: Record<string, number>;
        avgStrength: number;
    }> {
        const db = getAdminFirestore();
        const snapshot = await db
            .collection(EDGES_COLLECTION)
            .where('tenantId', '==', tenantId)
            .get();

        const edgesByRelation: Record<string, number> = {};
        let totalStrength = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            edgesByRelation[data.relation] = (edgesByRelation[data.relation] || 0) + 1;
            totalStrength += data.strength || 0;
        }

        return {
            totalEdges: snapshot.size,
            edgesByRelation,
            avgStrength: snapshot.size > 0 ? totalStrength / snapshot.size : 0,
        };
    }

    // ==========================================================================
    // PRIVATE HELPERS
    // ==========================================================================

    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator === 0 ? 0 : dotProduct / denominator;
    }
}

export const associativeMemoryService = new AssociativeMemoryService();
