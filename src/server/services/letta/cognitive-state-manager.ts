/**
 * Cognitive State Manager (BakedBot Intelligence - LiveHud Backend)
 *
 * Manages real-time agent cognitive state updates for the LiveHud dashboard.
 * Tracks agent status, behavior settings, context usage, and performance metrics.
 *
 * Part of BakedBot Intelligence, inspired by: https://github.com/mattvideoproductions/MERIDIAN_Brain
 * BakedBot adaptation: Multi-agent state management with Firestore persistence
 */

import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';

const getFirestore = getAdminFirestore;
import {
    AgentCognitiveState,
    AgentStateUpdate,
    AgentPersonalityMode,
    AgentBehaviorSliders,
    SLIDER_PRESETS,
    PERSONALITY_MODE_DEFINITIONS,
} from '@/types/agent-cognitive-state';
import { memoryGardeningService } from './memory-gardening';

// =============================================================================
// COGNITIVE STATE MANAGER
// =============================================================================

export class CognitiveStateManager {
    private db = getFirestore();
    private stateCache: Map<string, AgentCognitiveState> = new Map();
    private cacheTTL = 60000; // 1 minute cache

    /**
     * Get current cognitive state for an agent
     */
    async getState(agentId: string, tenantId: string): Promise<AgentCognitiveState | null> {
        const cacheKey = `${agentId}-${tenantId}`;
        const cached = this.stateCache.get(cacheKey);

        if (cached && Date.now() - cached.updatedAt.getTime() < this.cacheTTL) {
            return cached;
        }

        try {
            const doc = await this.db
                .collection('agent_cognitive_states')
                .doc(cacheKey)
                .get();

            if (!doc.exists) {
                return null;
            }

            const data = doc.data();
            const state: AgentCognitiveState = {
                ...data,
                lastActive: new Date(data!.lastActive),
                contextWindow: {
                    ...data!.contextWindow,
                },
                memoryHealth: {
                    ...data!.memoryHealth,
                    lastGardeningRun: data!.memoryHealth.lastGardeningRun
                        ? new Date(data!.memoryHealth.lastGardeningRun)
                        : null,
                },
                updatedAt: new Date(data!.updatedAt),
            } as AgentCognitiveState;

            this.stateCache.set(cacheKey, state);
            return state;
        } catch (e: unknown) {
            logger.error('[CognitiveState] Failed to get state', e as Record<string, any>);
            return null;
        }
    }

    /**
     * Initialize cognitive state for a new agent
     */
    async initializeState(
        agentId: string,
        agentName: string,
        tenantId: string,
        initialMode: AgentPersonalityMode = 'base'
    ): Promise<AgentCognitiveState> {
        const cacheKey = `${agentId}-${tenantId}`;

        // Get suggested sliders for this mode
        const modeDefinition = PERSONALITY_MODE_DEFINITIONS[initialMode];

        const state: AgentCognitiveState = {
            agentId,
            agentName,
            tenantId,
            status: 'idle',
            lastActive: new Date(),
            uptime: 0,
            personalityMode: initialMode,
            behaviorSliders: modeDefinition.suggestedSliders,
            contextWindow: {
                messagesLoaded: 0,
                tokensUsed: 0,
                tokensAvailable: 100000,
                utilizationPercent: 0,
                memoryRetrievals: 0,
                lastMemoryGarden: null,
            },
            cognitiveLoad: {
                currentLoad: 'idle',
                activeToolCalls: 0,
                queuedRequests: 0,
                avgResponseTimeMs: 0,
                lastResponseTimeMs: 0,
            },
            lastResponseConfidence: null,
            averageConfidence: 0.75,
            completenessScore: 1.0,
            memoryHealth: {
                totalMemories: 0,
                staleMemories: 0,
                conflictsDetected: 0,
                lastGardeningRun: null,
                healthScore: 100,
            },
            updatedAt: new Date(),
        };

        await this.saveState(state);
        this.stateCache.set(cacheKey, state);

        logger.info(`[CognitiveState] Initialized state for ${agentName} (${agentId})`);
        return state;
    }

    /**
     * Update agent cognitive state
     */
    async updateState(update: AgentStateUpdate): Promise<AgentCognitiveState> {
        const existing = await this.getState(update.agentId, update.tenantId);

        if (!existing) {
            throw new Error(`No cognitive state found for agent ${update.agentId}`);
        }

        const {
            behaviorSliders: _behaviorSliderUpdates,
            contextWindow: _contextWindowUpdates,
            cognitiveLoad: _cognitiveLoadUpdates,
            ...topLevelUpdates
        } = update.updates;

        const updated: AgentCognitiveState = {
            ...existing,
            ...topLevelUpdates,
            updatedAt: update.timestamp,
        };

        // Merge partial updates (filter out undefined values)
        if (update.updates.behaviorSliders) {
            const sliderUpdates = Object.fromEntries(
                Object.entries(update.updates.behaviorSliders).filter(([_, v]) => v !== undefined)
            ) as Partial<AgentBehaviorSliders>;

            updated.behaviorSliders = {
                ...existing.behaviorSliders,
                ...sliderUpdates,
            };
        }

        if (update.updates.contextWindow) {
            updated.contextWindow = {
                ...existing.contextWindow,
                ...update.updates.contextWindow,
            };
        }

        if (update.updates.cognitiveLoad) {
            updated.cognitiveLoad = {
                ...existing.cognitiveLoad,
                ...update.updates.cognitiveLoad,
            };
        }

        await this.saveState(updated);
        this.stateCache.set(`${update.agentId}-${update.tenantId}`, updated);

        return updated;
    }

    /**
     * Update personality mode (triggers slider changes)
     */
    async setPersonalityMode(
        agentId: string,
        tenantId: string,
        mode: AgentPersonalityMode
    ): Promise<AgentCognitiveState> {
        const modeDefinition = PERSONALITY_MODE_DEFINITIONS[mode];

        return this.updateState({
            agentId,
            tenantId,
            updates: {
                personalityMode: mode,
                behaviorSliders: modeDefinition.suggestedSliders,
            },
            timestamp: new Date(),
        });
    }

    /**
     * Update behavior sliders (user customization)
     */
    async updateSliders(
        agentId: string,
        tenantId: string,
        sliders: Partial<AgentBehaviorSliders>
    ): Promise<AgentCognitiveState> {
        return this.updateState({
            agentId,
            tenantId,
            updates: {
                behaviorSliders: sliders,
            },
            timestamp: new Date(),
        });
    }

    /**
     * Apply a slider preset
     */
    async applyPreset(
        agentId: string,
        tenantId: string,
        presetName: keyof typeof SLIDER_PRESETS
    ): Promise<AgentCognitiveState> {
        const preset = SLIDER_PRESETS[presetName];

        if (!preset) {
            throw new Error(`Unknown preset: ${presetName}`);
        }

        return this.updateState({
            agentId,
            tenantId,
            updates: {
                behaviorSliders: preset,
            },
            timestamp: new Date(),
        });
    }

    /**
     * Update context window usage
     */
    async updateContextWindow(
        agentId: string,
        tenantId: string,
        tokensUsed: number,
        messagesLoaded: number,
        memoryRetrievals?: number
    ): Promise<void> {
        const existing = await this.getState(agentId, tenantId);
        if (!existing) return;

        const tokensAvailable = 100000; // TODO: Get from model config
        const utilizationPercent = (tokensUsed / tokensAvailable) * 100;

        await this.updateState({
            agentId,
            tenantId,
            updates: {
                contextWindow: {
                    messagesLoaded,
                    tokensUsed,
                    tokensAvailable,
                    utilizationPercent,
                    memoryRetrievals: memoryRetrievals ?? existing.contextWindow.memoryRetrievals,
                },
            },
            timestamp: new Date(),
        });
    }

    /**
     * Update cognitive load (during processing)
     */
    async updateCognitiveLoad(
        agentId: string,
        tenantId: string,
        activeToolCalls: number,
        queuedRequests: number,
        lastResponseTimeMs: number
    ): Promise<void> {
        const existing = await this.getState(agentId, tenantId);
        if (!existing) return;

        // Calculate average response time
        const avgResponseTimeMs =
            existing.cognitiveLoad.avgResponseTimeMs > 0
                ? (existing.cognitiveLoad.avgResponseTimeMs + lastResponseTimeMs) / 2
                : lastResponseTimeMs;

        // Determine load level
        let currentLoad: 'idle' | 'light' | 'moderate' | 'heavy' | 'overloaded';
        if (activeToolCalls === 0 && queuedRequests === 0) {
            currentLoad = 'idle';
        } else if (activeToolCalls <= 2 && queuedRequests <= 1) {
            currentLoad = 'light';
        } else if (activeToolCalls <= 5 && queuedRequests <= 3) {
            currentLoad = 'moderate';
        } else if (activeToolCalls <= 10 && queuedRequests <= 5) {
            currentLoad = 'heavy';
        } else {
            currentLoad = 'overloaded';
        }

        await this.updateState({
            agentId,
            tenantId,
            updates: {
                cognitiveLoad: {
                    currentLoad,
                    activeToolCalls,
                    queuedRequests,
                    avgResponseTimeMs,
                    lastResponseTimeMs,
                },
            },
            timestamp: new Date(),
        });
    }

    /**
     * Update memory health metrics
     */
    async updateMemoryHealth(agentId: string, tenantId: string): Promise<void> {
        try {
            const metrics = await memoryGardeningService.getHealthMetrics(agentId, tenantId);

            await this.updateState({
                agentId,
                tenantId,
                updates: {},
                timestamp: new Date(),
            });

            // Update the memory health separately
            const cacheKey = `${agentId}-${tenantId}`;
            const doc = await this.db
                .collection('agent_cognitive_states')
                .doc(cacheKey)
                .get();

            if (doc.exists) {
                await doc.ref.update({
                    'memoryHealth.totalMemories': metrics.totalMemories,
                    'memoryHealth.staleMemories': metrics.staleMemories,
                    'memoryHealth.conflictsDetected': metrics.conflictsDetected,
                    'memoryHealth.lastGardeningRun': metrics.lastGardeningRun
                        ? metrics.lastGardeningRun.toISOString()
                        : null,
                    'memoryHealth.healthScore': await memoryGardeningService['calculateHealthScore'](
                        agentId,
                        tenantId
                    ),
                });
            }

            // Invalidate cache
            this.stateCache.delete(cacheKey);
        } catch (e: unknown) {
            logger.error('[CognitiveState] Failed to update memory health', e as Record<string, any>);
        }
    }

    /**
     * Record response confidence (Receipts-Backed Protocol)
     */
    async recordResponseConfidence(
        agentId: string,
        tenantId: string,
        confidence: number
    ): Promise<void> {
        const existing = await this.getState(agentId, tenantId);
        if (!existing) return;

        // Update rolling average
        const avgConfidence =
            existing.averageConfidence > 0
                ? (existing.averageConfidence * 0.9 + confidence * 0.1) // Exponential moving average
                : confidence;

        await this.updateState({
            agentId,
            tenantId,
            updates: {
                lastResponseConfidence: confidence,
            },
            timestamp: new Date(),
        });

        // Update average separately
        const cacheKey = `${agentId}-${tenantId}`;
        await this.db
            .collection('agent_cognitive_states')
            .doc(cacheKey)
            .update({
                averageConfidence: avgConfidence,
            });
    }

    /**
     * Record completeness score (Completeness Doctrine)
     */
    async recordCompletenessScore(
        agentId: string,
        tenantId: string,
        score: number
    ): Promise<void> {
        const existing = await this.getState(agentId, tenantId);
        if (!existing) return;

        // Update rolling average
        const avgCompleteness =
            existing.completenessScore > 0
                ? (existing.completenessScore * 0.9 + score * 0.1)
                : score;

        await this.db
            .collection('agent_cognitive_states')
            .doc(`${agentId}-${tenantId}`)
            .update({
                completenessScore: avgCompleteness,
            });
    }

    /**
     * Get all agents for a tenant (for dashboard)
     */
    async getAllAgentStates(tenantId: string): Promise<AgentCognitiveState[]> {
        const snapshot = await this.db
            .collection('agent_cognitive_states')
            .where('tenantId', '==', tenantId)
            .get();

        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                ...data,
                lastActive: new Date(data.lastActive),
                contextWindow: {
                    ...data.contextWindow,
                },
                memoryHealth: {
                    ...data.memoryHealth,
                    lastGardeningRun: data.memoryHealth.lastGardeningRun
                        ? new Date(data.memoryHealth.lastGardeningRun)
                        : null,
                },
                updatedAt: new Date(data.updatedAt),
            } as AgentCognitiveState;
        });
    }

    /**
     * Save state to Firestore
     */
    private async saveState(state: AgentCognitiveState): Promise<void> {
        const cacheKey = `${state.agentId}-${state.tenantId}`;

        await this.db
            .collection('agent_cognitive_states')
            .doc(cacheKey)
            .set({
                ...state,
                lastActive: state.lastActive.toISOString(),
                contextWindow: {
                    ...state.contextWindow,
                    lastMemoryGarden: state.contextWindow.lastMemoryGarden?.toISOString() || null,
                },
                memoryHealth: {
                    ...state.memoryHealth,
                    lastGardeningRun: state.memoryHealth.lastGardeningRun?.toISOString() || null,
                },
                updatedAt: state.updatedAt.toISOString(),
            });
    }

    /**
     * Mark agent as active (heartbeat)
     */
    async markActive(agentId: string, tenantId: string): Promise<void> {
        await this.updateState({
            agentId,
            tenantId,
            updates: {
                status: 'active',
            },
            timestamp: new Date(),
        });
    }

    /**
     * Mark agent as idle
     */
    async markIdle(agentId: string, tenantId: string): Promise<void> {
        await this.updateState({
            agentId,
            tenantId,
            updates: {
                status: 'idle',
            },
            timestamp: new Date(),
        });
    }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const cognitiveStateManager = new CognitiveStateManager();
