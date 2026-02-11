// @ts-nocheck - WIP: MERIDIAN integration
/**
 * Memory Gardening Service (MERIDIAN-Enhanced)
 *
 * Implements MERIDIAN_Brain's memory gardening protocol:
 * - Auto-cleanup of outdated context to prevent logic drift
 * - Conflict detection (contradictory facts)
 * - Relevance scoring and pruning
 * - Memory health tracking
 *
 * Inspired by: https://github.com/mattvideoproductions/MERIDIAN_Brain
 * BakedBot adaptation: Integrated with Letta Memory + Firestore
 */

import { logger } from '@/lib/logger';
import { lettaClient } from './client';
import { lettaBlockManager } from './block-manager';
import { ai } from '@/ai/genkit';
import {
    MemoryConflict,
    MemoryGardeningReport,
    MemoryHealthMetrics,
    MemoryConfidence,
    MemoryEvidence,
} from './memory-types';
import { getAdminFirestore } from '@/firebase/admin';

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface MemoryGardeningConfig {
    /** Maximum age of memories before review (days) */
    maxAgeBeforeReview: number;
    /** Minimum relevance score to keep (0-1) */
    relevanceThreshold: number;
    /** How to resolve conflicts */
    conflictResolution: 'newest' | 'most_confident' | 'user_preference';
    /** Run verification checks */
    enableVerification: boolean;
    /** Maximum memories to scan per run */
    maxMemoriesPerRun: number;
}

const DEFAULT_CONFIG: MemoryGardeningConfig = {
    maxAgeBeforeReview: 30,  // 30 days
    relevanceThreshold: 0.3,  // Keep if > 30% relevant
    conflictResolution: 'most_confident',
    enableVerification: true,
    maxMemoriesPerRun: 1000,
};

// =============================================================================
// MEMORY GARDENING SERVICE
// =============================================================================

export class MemoryGardeningService {
    private config: MemoryGardeningConfig;
    private db = getAdminFirestore();

    constructor(config: Partial<MemoryGardeningConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Run memory gardening for a specific agent
     * This is the main entry point for scheduled cleanup
     */
    async gardenAgentMemory(
        agentId: string,
        tenantId: string
    ): Promise<MemoryGardeningReport> {
        const reportId = `mgr-${Date.now()}`;
        const startTime = new Date();

        logger.info(`[MemoryGardening] Starting gardening ${reportId} for agent ${agentId}`);

        const report: MemoryGardeningReport = {
            id: reportId,
            agentId,
            tenantId,
            startedAt: startTime,
            status: 'running',
            memoriesScanned: 0,
            scanCriteria: {
                minAge: this.config.maxAgeBeforeReview,
                maxRelevanceScore: this.config.relevanceThreshold,
                includeUnverified: true,
            },
            memoriesRemoved: 0,
            memoriesMerged: 0,
            conflictsDetected: 0,
            conflictsResolved: 0,
            factsExpired: 0,
            removedMemoryIds: [],
            conflictReports: [],
            spaceReclaimed: 0,
            healthScoreBefore: 0,
            healthScoreAfter: 0,
            recommendations: [],
        };

        try {
            // 1. Get health metrics BEFORE gardening
            report.healthScoreBefore = await this.calculateHealthScore(agentId, tenantId);

            // 2. Retrieve all archival memories (Letta's semantic memory)
            const memories = await lettaClient.getArchivalMemory(
                agentId,
                this.config.maxMemoriesPerRun
            );
            report.memoriesScanned = memories.length;

            if (memories.length === 0) {
                report.status = 'completed';
                report.completedAt = new Date();
                return report;
            }

            // 3. Score memories by relevance
            const scored = await this.scoreMemoryRelevance(memories, agentId, tenantId);

            // 4. Detect conflicts (contradictory facts)
            const conflicts = await this.detectConflicts(scored, tenantId);
            report.conflictsDetected = conflicts.length;
            report.conflictReports = conflicts;

            // 5. Resolve conflicts
            for (const conflict of conflicts) {
                const resolved = await this.resolveConflict(conflict, agentId, tenantId);
                if (resolved) {
                    report.conflictsResolved++;
                }
            }

            // 6. Prune low-value memories
            const toRemove = scored.filter(
                (m) => m.relevanceScore < this.config.relevanceThreshold
            );

            for (const memory of toRemove) {
                try {
                    await lettaClient.deleteArchivalMemory(agentId, memory.id);
                    report.memoriesRemoved++;
                    report.removedMemoryIds.push(memory.id);
                    // Estimate tokens saved (rough: 1 memory = 100 tokens)
                    report.spaceReclaimed += memory.content.length;
                } catch (e: unknown) {
                    logger.warn(`[MemoryGardening] Failed to remove memory ${memory.id}`, e as Record<string, any>);
                }
            }

            // 7. Expire outdated facts
            const expired = await this.expireOutdatedFacts(scored, agentId, tenantId);
            report.factsExpired = expired;

            // 8. Generate recommendations
            report.recommendations = await this.generateRecommendations(
                report,
                scored.length - toRemove.length
            );

            // 9. Get health metrics AFTER gardening
            report.healthScoreAfter = await this.calculateHealthScore(agentId, tenantId);

            // 10. Save report to Firestore
            await this.saveGardeningReport(report);

            report.status = 'completed';
            report.completedAt = new Date();

            logger.info(
                `[MemoryGardening] Completed ${reportId}: removed ${report.memoriesRemoved}, ` +
                `resolved ${report.conflictsResolved} conflicts, health ${report.healthScoreBefore} → ${report.healthScoreAfter}`
            );

            return report;
        } catch (e: unknown) {
            logger.error('[MemoryGardening] Gardening failed:', e as Record<string, any>);
            report.status = 'failed';
            report.completedAt = new Date();
            await this.saveGardeningReport(report);
            throw e;
        }
    }

    /**
     * Score memories by relevance using AI
     */
    private async scoreMemoryRelevance(
        memories: Array<{ id: string; content: string; created_at: string }>,
        agentId: string,
        tenantId: string
    ): Promise<
        Array<{
            id: string;
            content: string;
            created_at: string;
            relevanceScore: number;
            recencyScore: number;
            finalScore: number;
        }>
    > {
        // Get agent's current context to determine relevance
        const agentContext = await this.getAgentContext(agentId, tenantId);

        const scored = await Promise.all(
            memories.map(async (memory) => {
                // Recency score (exponential decay, 1 week half-life)
                const ageHours =
                    (Date.now() - new Date(memory.created_at).getTime()) / (1000 * 60 * 60);
                const recencyScore = Math.exp(-ageHours / 168); // 168 hours = 1 week

                // Relevance score via AI (expensive, batch if needed)
                // For now, simple keyword matching (TODO: use embeddings)
                const relevanceScore = await this.calculateSemanticRelevance(
                    memory.content,
                    agentContext
                );

                // Final score (weighted combination)
                const finalScore =
                    relevanceScore * 0.5 + // Relevance
                    recencyScore * 0.3 + // Recency
                    0.2; // Base importance (TODO: calculate from references)

                return {
                    ...memory,
                    relevanceScore,
                    recencyScore,
                    finalScore,
                };
            })
        );

        return scored.sort((a, b) => b.finalScore - a.finalScore);
    }

    /**
     * Detect conflicting memories (MERIDIAN Safety Protocol)
     */
    private async detectConflicts(
        memories: Array<{ id: string; content: string }>,
        tenantId: string
    ): Promise<MemoryConflict[]> {
        const conflicts: MemoryConflict[] = [];

        // Use AI to detect contradictions
        // For efficiency, batch compare similar topics
        const grouped = this.groupByTopic(memories);

        for (const [topic, topicMemories] of Object.entries(grouped)) {
            if (topicMemories.length < 2) continue;

            // Ask AI to find contradictions within this topic
            const prompt = `Analyze these memory entries for contradictions:

${topicMemories.map((m, i) => `[${i}] ${m.content}`).join('\n')}

Identify any direct contradictions or conflicting claims. Return JSON array:
[
  {
    "index1": 0,
    "index2": 1,
    "conflictType": "direct_contradiction" | "outdated_superseded" | "partial_overlap" | "source_disagreement",
    "severity": "critical" | "warning" | "minor",
    "explanation": "Why these conflict"
  }
]`;

            try {
                const response = await ai.generate({
                    model: 'googleai/gemini-2.5-flash',
                    prompt,
                    output: { format: 'json' },
                });

                const detected = JSON.parse(response.text);
                for (const conflict of detected) {
                    conflicts.push({
                        id: `conflict-${Date.now()}-${Math.random()}`,
                        memoryId1: topicMemories[conflict.index1].id,
                        memoryId2: topicMemories[conflict.index2].id,
                        conflictType: conflict.conflictType,
                        severity: conflict.severity,
                        detectedAt: new Date(),
                        detectedBy: 'MemoryGardeningService',
                        resolution: 'unresolved',
                    });
                }
            } catch (e: unknown) {
                logger.warn(`[MemoryGardening] Conflict detection failed for topic ${topic}`, e as Record<string, any>);
            }
        }

        return conflicts;
    }

    /**
     * Resolve a detected memory conflict
     */
    private async resolveConflict(
        conflict: MemoryConflict,
        agentId: string,
        tenantId: string
    ): Promise<boolean> {
        // Get both memories
        const [mem1, mem2] = await Promise.all([
            lettaClient.getArchivalMemoryById(agentId, conflict.memoryId1),
            lettaClient.getArchivalMemoryById(agentId, conflict.memoryId2),
        ]);

        if (!mem1 || !mem2) return false;

        switch (this.config.conflictResolution) {
            case 'newest':
                // Keep the newer memory
                const older = new Date(mem1.created_at) < new Date(mem2.created_at) ? mem1 : mem2;
                await lettaClient.deleteArchivalMemory(agentId, older.id);
                conflict.resolution = 'keep_newer';
                break;

            case 'most_confident':
                // TODO: Get confidence scores from metadata
                // For now, mark for manual review
                conflict.resolution = 'manual_review';
                await this.saveConflictForReview(conflict, tenantId);
                break;

            case 'user_preference':
                // Save conflict for user to review in dashboard
                conflict.resolution = 'manual_review';
                await this.saveConflictForReview(conflict, tenantId);
                break;
        }

        conflict.resolvedAt = new Date();
        conflict.resolvedBy = 'MemoryGardeningService';
        return true;
    }

    /**
     * Expire facts that are past their validUntil date
     */
    private async expireOutdatedFacts(
        memories: Array<{ id: string; content: string }>,
        agentId: string,
        tenantId: string
    ): Promise<number> {
        let expired = 0;

        // Check for facts with expiration dates in metadata
        // This would require enhanced Letta API to store/retrieve metadata
        // For now, placeholder implementation

        return expired;
    }

    /**
     * Calculate memory health score (0-100)
     */
    private async calculateHealthScore(agentId: string, tenantId: string): Promise<number> {
        try {
            const metrics = await this.getHealthMetrics(agentId, tenantId);

            // Health score factors:
            // - High average confidence: +30 points
            // - Low conflict ratio: +25 points
            // - Fresh memories (low average age): +25 points
            // - Low stale memory count: +20 points

            const confidenceScore = metrics.averageConfidence * 30;
            const conflictScore = Math.max(0, 25 - metrics.conflictsDetected * 2);
            const freshnessScore = Math.max(0, 25 - metrics.averageAgeHours / 100);
            const staleScore = Math.max(0, 20 - metrics.staleMemories / 10);

            return Math.min(100, confidenceScore + conflictScore + freshnessScore + staleScore);
        } catch {
            return 50; // Default mid-score if calculation fails
        }
    }

    /**
     * Get memory health metrics for an agent
     */
    async getHealthMetrics(agentId: string, tenantId: string): Promise<MemoryHealthMetrics> {
        const memories = await lettaClient.getArchivalMemory(agentId, 1000);

        const now = Date.now();
        const ageThresholdMs = this.config.maxAgeBeforeReview * 24 * 60 * 60 * 1000;

        let totalAge = 0;
        let staleCount = 0;

        for (const memory of memories) {
            const age = now - new Date(memory.created_at).getTime();
            totalAge += age;
            if (age > ageThresholdMs) {
                staleCount++;
            }
        }

        const averageAgeHours = memories.length > 0 ? totalAge / memories.length / (1000 * 60 * 60) : 0;

        // Get conflicts from Firestore
        const conflictsSnapshot = await this.db
            .collection('memory_conflicts')
            .where('tenantId', '==', tenantId)
            .where('agentId', '==', agentId)
            .get();

        const conflicts = conflictsSnapshot.docs;
        const resolvedConflicts = conflicts.filter(
            (d) => d.data().resolution !== 'unresolved'
        );

        return {
            agentId,
            tenantId,
            timestamp: new Date(),
            totalMemories: memories.length,
            byType: {
                episodic: 0, // TODO: query Letta for message count
                semantic: memories.length,
                procedural: 0, // TODO: query procedural memory
                associative: 0, // TODO: query graph edges
            },
            averageConfidence: 0.75, // TODO: calculate from metadata
            factVsSpeculationRatio: 0.8, // TODO: calculate from evidence types
            conflictsDetected: conflicts.length,
            conflictsResolved: resolvedConflicts.length,
            staleMemories: staleCount,
            expiredFacts: 0, // TODO: implement
            averageAgeHours,
            retrievalsLast24h: 0, // TODO: track in Firestore
            gardeningRecommended: staleCount > 10 || conflicts.length > 5,
        };
    }

    /**
     * Generate recommendations for next gardening run
     */
    private async generateRecommendations(
        report: MemoryGardeningReport,
        remainingMemories: number
    ): Promise<string[]> {
        const recommendations: string[] = [];

        if (report.conflictsDetected > 0 && report.conflictsResolved === 0) {
            recommendations.push(
                `${report.conflictsDetected} memory conflicts need manual review`
            );
        }

        if (report.memoriesRemoved > remainingMemories * 0.2) {
            recommendations.push(
                'High removal rate - consider increasing relevance threshold'
            );
        }

        if (report.healthScoreAfter < 60) {
            recommendations.push('Memory health below threshold - schedule more frequent gardening');
        }

        if (report.memoriesScanned >= this.config.maxMemoriesPerRun) {
            recommendations.push('Hit scan limit - schedule additional gardening run for remaining memories');
        }

        return recommendations;
    }

    /**
     * Helper: Get agent context for relevance scoring
     */
    private async getAgentContext(agentId: string, tenantId: string): Promise<string> {
        try {
            // Get key memory blocks for this agent
            const blocks = await lettaBlockManager.listBlocks(tenantId);
            const agentBlocks = blocks.filter((b) => b.label.includes(agentId.split('-')[0]));

            return agentBlocks.map((b) => b.value).join('\n');
        } catch {
            return '';
        }
    }

    /**
     * Helper: Calculate semantic relevance (simplified)
     */
    private async calculateSemanticRelevance(
        memoryContent: string,
        agentContext: string
    ): Promise<number> {
        if (!agentContext) return 0.5; // Default mid-relevance

        // Simple keyword overlap (TODO: use embeddings for better accuracy)
        const memoryWords = new Set(memoryContent.toLowerCase().split(/\s+/));
        const contextWords = new Set(agentContext.toLowerCase().split(/\s+/));

        const overlap = [...memoryWords].filter((w) => contextWords.has(w)).length;
        const total = Math.max(memoryWords.size, contextWords.size);

        return total > 0 ? overlap / total : 0;
    }

    /**
     * Helper: Group memories by topic
     */
    private groupByTopic(
        memories: Array<{ id: string; content: string }>
    ): Record<string, Array<{ id: string; content: string }>> {
        const grouped: Record<string, Array<{ id: string; content: string }>> = {};

        // Simple topic extraction (first 3 words)
        for (const memory of memories) {
            const topic = memory.content.split(/\s+/).slice(0, 3).join(' ').toLowerCase();
            if (!grouped[topic]) grouped[topic] = [];
            grouped[topic].push(memory);
        }

        return grouped;
    }

    /**
     * Save conflict for manual review
     */
    private async saveConflictForReview(
        conflict: MemoryConflict,
        tenantId: string
    ): Promise<void> {
        await this.db.collection('memory_conflicts').doc(conflict.id).set({
            ...conflict,
            detectedAt: conflict.detectedAt.toISOString(),
            resolvedAt: conflict.resolvedAt?.toISOString(),
        });
    }

    /**
     * Save gardening report to Firestore
     */
    private async saveGardeningReport(report: MemoryGardeningReport): Promise<void> {
        await this.db.collection('memory_gardening_reports').doc(report.id).set({
            ...report,
            startedAt: report.startedAt.toISOString(),
            completedAt: report.completedAt?.toISOString(),
            conflictReports: report.conflictReports.map((c) => ({
                ...c,
                detectedAt: c.detectedAt.toISOString(),
                resolvedAt: c.resolvedAt?.toISOString(),
            })),
        });
    }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const memoryGardeningService = new MemoryGardeningService();
