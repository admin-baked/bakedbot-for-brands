/**
 * Episodic Memory Service
 *
 * Provides conversation search and temporal memory retrieval.
 * This is the "what did we discuss last week?" capability.
 *
 * Uses Letta's Conversation Search (Recall Memory) which is distinct
 * from Archival Memory (Semantic Memory).
 *
 * Reference: https://docs.letta.com/guides/agents/archival-search/
 */

import { logger } from '@/lib/logger';
import { lettaClient } from './client';
import {
    EpisodicMemory,
    MemorySearchResult,
    MemoryWeightingConfig,
    ConversationContext,
} from './memory-types';

// =============================================================================
// CONVERSATION SEARCH SERVICE
// =============================================================================

export class EpisodicMemoryService {
    private defaultWeights: MemoryWeightingConfig = {
        relevance_weight: 0.5,
        recency_weight: 0.3,
        importance_weight: 0.2,
        recency_decay_hours: 168, // 1 week
    };

    /**
     * Search conversation history with text query.
     * This is episodic memory - searching past interactions.
     */
    async searchConversations(
        agentId: string,
        query: string,
        options?: {
            limit?: number;
            startDate?: Date;
            endDate?: Date;
        }
    ): Promise<MemorySearchResult[]> {
        try {
            // Build query params
            const params = new URLSearchParams();
            params.set('query', query);
            params.set('limit', String(options?.limit || 10));

            if (options?.startDate) {
                params.set('start_datetime', options.startDate.toISOString());
            }
            if (options?.endDate) {
                params.set('end_datetime', options.endDate.toISOString());
            }

            // Use conversation search endpoint (different from archival)
            const response = await this.request(
                `/agents/${agentId}/messages/search?${params.toString()}`
            );

            return this.transformToMemoryResults(response, 'episodic');
        } catch (error) {
            logger.error('[EpisodicMemory] Conversation search failed:', error);
            return [];
        }
    }

    /**
     * Search by date range only (no text query).
     * "What happened last Tuesday?"
     */
    async searchByDateRange(
        agentId: string,
        startDate: Date,
        endDate: Date,
        limit: number = 20
    ): Promise<MemorySearchResult[]> {
        try {
            const params = new URLSearchParams();
            params.set('start_datetime', startDate.toISOString());
            params.set('end_datetime', endDate.toISOString());
            params.set('limit', String(limit));

            const response = await this.request(
                `/agents/${agentId}/messages/search?${params.toString()}`
            );

            return this.transformToMemoryResults(response, 'episodic');
        } catch (error) {
            logger.error('[EpisodicMemory] Date range search failed:', error);
            return [];
        }
    }

    /**
     * Get recent conversation context for an agent.
     * Useful for "resume where we left off" scenarios.
     */
    async getRecentContext(
        agentId: string,
        messageCount: number = 10
    ): Promise<EpisodicMemory[]> {
        try {
            const messages = await lettaClient.getMessages(agentId, messageCount);

            return messages.map((msg, idx) => ({
                id: msg.id,
                content: msg.content,
                type: 'episodic' as const,
                timestamp: new Date(msg.created_at),
                agent: agentId,
                tenantId: '', // Would need to be passed in
                role: msg.role,
                importance: 0.5,
                tags: [],
                references: [],
            }));
        } catch (error) {
            logger.error('[EpisodicMemory] Failed to get recent context:', error);
            return [];
        }
    }

    /**
     * Store an episodic memory explicitly.
     * Use this for important conversation moments worth remembering.
     */
    async storeEpisode(
        agentId: string,
        episode: Omit<EpisodicMemory, 'id' | 'timestamp' | 'type'>
    ): Promise<string> {
        try {
            // Store in archival with episodic tag
            const content = JSON.stringify({
                ...episode,
                _type: 'episodic',
                _timestamp: new Date().toISOString(),
            });

            const result = await lettaClient.insertPassage(agentId, content);
            return result.id || `ep-${Date.now()}`;
        } catch (error) {
            logger.error('[EpisodicMemory] Failed to store episode:', error);
            throw error;
        }
    }

    /**
     * Calculate recency decay score.
     * More recent memories score higher.
     */
    calculateRecencyScore(timestamp: Date, halfLifeHours: number = 168): number {
        const now = Date.now();
        const memoryTime = timestamp.getTime();
        const ageHours = (now - memoryTime) / (1000 * 60 * 60);

        // Exponential decay: score = 2^(-age/halfLife)
        return Math.pow(2, -ageHours / halfLifeHours);
    }

    /**
     * Apply weighted scoring to search results.
     * Combines relevance (from Letta), recency, and importance.
     */
    applyWeightedScoring(
        results: MemorySearchResult[],
        weights: Partial<MemoryWeightingConfig> = {}
    ): MemorySearchResult[] {
        const config = { ...this.defaultWeights, ...weights };

        return results
            .map(result => {
                const recencyScore = this.calculateRecencyScore(
                    result.memory.timestamp,
                    config.recency_decay_hours
                );

                const relevanceScore = result.scores.rrf_score || result.scores.vector_rank || 0.5;
                const importanceScore = result.memory.importance;

                const finalScore =
                    relevanceScore * config.relevance_weight +
                    recencyScore * config.recency_weight +
                    importanceScore * config.importance_weight;

                return {
                    ...result,
                    scores: {
                        ...result.scores,
                        recency_score: recencyScore,
                        importance_score: importanceScore,
                        final_score: finalScore,
                    },
                };
            })
            .sort((a, b) => b.scores.final_score - a.scores.final_score);
    }

    // ==========================================================================
    // PRIVATE HELPERS
    // ==========================================================================

    private async request(endpoint: string): Promise<any> {
        const LETTA_BASE_URL = process.env.LETTA_BASE_URL || 'https://api.letta.com/v1';
        const LETTA_API_KEY = process.env.LETTA_API_KEY;

        if (!LETTA_API_KEY) {
            throw new Error('LETTA_API_KEY is required');
        }

        const response = await fetch(`${LETTA_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${LETTA_API_KEY}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Letta API Error (${response.status}): ${errorText}`);
        }

        return response.json();
    }

    private transformToMemoryResults(
        response: any[],
        type: 'episodic' | 'semantic'
    ): MemorySearchResult[] {
        if (!Array.isArray(response)) return [];

        return response.map((item: any) => ({
            memory: {
                id: item.id || `mem-${Date.now()}`,
                content: item.content || item.text || '',
                type,
                timestamp: new Date(item.created_at || item.timestamp || Date.now()),
                agent: item.agent_id || '',
                tenantId: '',
                importance: 0.5,
                tags: item.tags || [],
                references: [],
            },
            scores: {
                rrf_score: item.rrf_score,
                vector_rank: item.vector_rank,
                fts_rank: item.fts_rank,
                final_score: item.rrf_score || item.vector_rank || 0.5,
            },
        }));
    }
}

export const episodicMemoryService = new EpisodicMemoryService();
