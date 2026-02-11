/**
 * Memory Health Heartbeat Checks (MERIDIAN)
 *
 * Monitors agent memory health and triggers automatic gardening.
 * Part of Heartbeat System - runs proactively to maintain memory quality.
 */

import { HeartbeatCheckResult } from '@/types/heartbeat';
import { cognitiveStateManager, memoryGardeningService } from '@/server/services/letta';
import { logger } from '@/lib/logger';

/**
 * Check memory health for all agents
 * Triggers alerts if health scores are low or conflicts detected
 */
export async function checkMemoryHealth(tenantId: string): Promise<HeartbeatCheckResult[]> {
    const results: HeartbeatCheckResult[] = [];

    try {
        // Get all agent states for this tenant
        const agents = await cognitiveStateManager.getAllAgentStates(tenantId);

        for (const agent of agents) {
            const healthScore = agent.memoryHealth.healthScore;
            const staleMemories = agent.memoryHealth.staleMemories;
            const conflicts = agent.memoryHealth.conflictsDetected;

            // Alert if health score is low (< 60)
            if (healthScore < 60) {
                results.push({
                    checkId: `memory-health-low-${agent.agentId}` as any,
                    agent: agent.agentId as any,
                    status: 'alert',
                    priority: healthScore < 40 ? 'high' : 'high',
                    title: `${agent.agentName} Memory Health Low`,
                    message: `Memory health score: ${healthScore}/100. ${staleMemories} stale memories, ${conflicts} conflicts detected.`,
                    actionLabel: 'Run Gardening',
                    actionUrl: `/dashboard/ceo?tab=meridian&agent=${agent.agentId}&view=memory`,
                    timestamp: new Date(),
                    data: {
                        agentId: agent.agentId,
                        agentName: agent.agentName,
                        healthScore,
                        staleMemories,
                        conflicts,
                    },
                });
            }

            // Alert if too many stale memories (> 50)
            else if (staleMemories > 50) {
                results.push({
                    checkId: `memory-stale-${agent.agentId}` as any,
                    agent: agent.agentId as any,
                    status: 'warning',
                    priority: 'medium',
                    title: `${agent.agentName} Has Stale Memories`,
                    message: `${staleMemories} stale memories detected. Consider running memory gardening.`,
                    actionLabel: 'View Details',
                    actionUrl: `/dashboard/ceo?tab=meridian&agent=${agent.agentId}&view=memory`,
                    timestamp: new Date(),
                    data: {
                        agentId: agent.agentId,
                        agentName: agent.agentName,
                        staleMemories,
                    },
                });
            }

            // Alert if unresolved conflicts (> 5)
            else if (conflicts > 5) {
                results.push({
                    checkId: `memory-conflicts-${agent.agentId}` as any,
                    agent: agent.agentId as any,
                    status: 'warning',
                    priority: 'high',
                    title: `${agent.agentName} Has Memory Conflicts`,
                    message: `${conflicts} unresolved memory conflicts need manual review.`,
                    actionLabel: 'Resolve Conflicts',
                    actionUrl: `/dashboard/ceo?tab=meridian&agent=${agent.agentId}&view=memory&tab=conflicts`,
                    timestamp: new Date(),
                    data: {
                        agentId: agent.agentId,
                        agentName: agent.agentName,
                        conflicts,
                    },
                });
            }

            // All clear message (health > 80, low stale memories)
            else if (healthScore > 80 && staleMemories < 10 && conflicts === 0) {
                results.push({
                    checkId: `memory-health-good-${agent.agentId}` as any,
                    agent: agent.agentId as any,
                    status: 'ok',
                    priority: 'low',
                    title: `${agent.agentName} Memory Healthy`,
                    message: `Health score: ${healthScore}/100. System is clean and optimized.`,
                    timestamp: new Date(),
                    data: {
                        agentId: agent.agentId,
                        agentName: agent.agentName,
                        healthScore,
                    },
                });
            }
        }
    } catch (error) {
        logger.error('[Heartbeat] Memory health check failed', { error, tenantId });
        results.push({
            checkId: 'platform_health' as any,
            agent: 'linus' as any,
            status: 'error',
            priority: 'medium',
            title: 'Memory Health Check Failed',
            message: 'Unable to check memory health. Please check logs.',
            timestamp: new Date(),
        });
    }

    return results;
}

/**
 * Run scheduled memory gardening for agents that need it
 * Called by Heartbeat cron job (weekly)
 */
export async function runScheduledMemoryGardening(tenantId: string): Promise<void> {
    try {
        logger.info('[Heartbeat] Running scheduled memory gardening', { tenantId });

        // Get all agent states
        const agents = await cognitiveStateManager.getAllAgentStates(tenantId);

        for (const agent of agents) {
            // Run gardening if:
            // 1. Health score < 70 (needs cleanup)
            // 2. Stale memories > 30
            // 3. Conflicts > 3
            // 4. Last gardening > 7 days ago

            const needsGardening =
                agent.memoryHealth.healthScore < 70 ||
                agent.memoryHealth.staleMemories > 30 ||
                agent.memoryHealth.conflictsDetected > 3 ||
                !agent.memoryHealth.lastGardeningRun ||
                (new Date().getTime() - new Date(agent.memoryHealth.lastGardeningRun).getTime()) >
                    7 * 24 * 60 * 60 * 1000; // 7 days

            if (needsGardening) {
                logger.info('[Heartbeat] Running gardening for agent', {
                    agentId: agent.agentId,
                    agentName: agent.agentName,
                    reason: {
                        healthScore: agent.memoryHealth.healthScore,
                        staleMemories: agent.memoryHealth.staleMemories,
                        conflicts: agent.memoryHealth.conflictsDetected,
                        daysSinceLastGarden: agent.memoryHealth.lastGardeningRun
                            ? Math.floor(
                                  (new Date().getTime() -
                                      new Date(agent.memoryHealth.lastGardeningRun).getTime()) /
                                      (24 * 60 * 60 * 1000)
                              )
                            : null,
                    },
                });

                try {
                    const report = await memoryGardeningService.gardenAgentMemory(
                        agent.agentId,
                        tenantId
                    );

                    logger.info('[Heartbeat] Gardening completed', {
                        agentId: agent.agentId,
                        memoriesRemoved: report.memoriesRemoved,
                        conflictsResolved: report.conflictsResolved,
                        healthImprovement: report.healthScoreAfter - report.healthScoreBefore,
                    });

                    // Update memory health metrics
                    await cognitiveStateManager.updateMemoryHealth(agent.agentId, tenantId);
                } catch (error) {
                    logger.error('[Heartbeat] Gardening failed for agent', {
                        error,
                        agentId: agent.agentId,
                    });
                }
            }
        }

        logger.info('[Heartbeat] Scheduled memory gardening complete', { tenantId });
    } catch (error) {
        logger.error('[Heartbeat] Scheduled memory gardening failed', { error, tenantId });
    }
}

/**
 * Check completeness metrics for agents
 * Alerts if completeness scores are consistently low
 */
export async function checkCompletenessMetrics(tenantId: string): Promise<HeartbeatCheckResult[]> {
    const results: HeartbeatCheckResult[] = [];

    try {
        const agents = await cognitiveStateManager.getAllAgentStates(tenantId);

        for (const agent of agents) {
            const completenessScore = agent.completenessScore;

            // Alert if completeness is consistently low (< 0.7)
            if (completenessScore < 0.7) {
                results.push({
                    checkId: `completeness-low-${agent.agentId}` as any,
                    agent: agent.agentId as any,
                    status: 'warning',
                    priority: 'medium',
                    title: `${agent.agentName} Completeness Issues`,
                    message: `Average completeness score: ${(completenessScore * 100).toFixed(0)}%. Agent may be missing user intents.`,
                    actionLabel: 'View Logs',
                    actionUrl: `/dashboard/ceo?tab=meridian&agent=${agent.agentId}`,
                    timestamp: new Date(),
                    data: {
                        agentId: agent.agentId,
                        agentName: agent.agentName,
                        completenessScore,
                    },
                });
            }

            // All clear
            else if (completenessScore >= 0.9) {
                results.push({
                    checkId: `completeness-good-${agent.agentId}` as any,
                    agent: agent.agentId as any,
                    status: 'ok',
                    priority: 'low',
                    title: `${agent.agentName} Completeness Excellent`,
                    message: `Average completeness: ${(completenessScore * 100).toFixed(0)}%. All user intents being addressed.`,
                    timestamp: new Date(),
                    data: {
                        agentId: agent.agentId,
                        agentName: agent.agentName,
                        completenessScore,
                    },
                });
            }
        }
    } catch (error) {
        logger.error('[Heartbeat] Completeness metrics check failed', { error, tenantId });
        results.push({
            checkId: 'platform_health' as any,
            agent: 'linus' as any,
            status: 'error',
            priority: 'low',
            title: 'Completeness Check Failed',
            message: 'Unable to check completeness metrics.',
            timestamp: new Date(),
        });
    }

    return results;
}

/**
 * Check confidence scores for agents
 * Alerts if confidence is consistently low
 */
export async function checkConfidenceScores(tenantId: string): Promise<HeartbeatCheckResult[]> {
    const results: HeartbeatCheckResult[] = [];

    try {
        const agents = await cognitiveStateManager.getAllAgentStates(tenantId);

        for (const agent of agents) {
            const confidence = agent.averageConfidence;

            // Alert if confidence is low (< 0.6)
            if (confidence < 0.6) {
                results.push({
                    checkId: `confidence-low-${agent.agentId}` as any,
                    agent: agent.agentId as any,
                    status: 'warning',
                    priority: 'medium',
                    title: `${agent.agentName} Low Confidence`,
                    message: `Average confidence: ${(confidence * 100).toFixed(0)}%. Agent may need more training data or fact verification.`,
                    actionLabel: 'View Details',
                    actionUrl: `/dashboard/ceo?tab=meridian&agent=${agent.agentId}`,
                    timestamp: new Date(),
                    data: {
                        agentId: agent.agentId,
                        agentName: agent.agentName,
                        confidence,
                    },
                });
            }

            // All clear
            else if (confidence >= 0.85) {
                results.push({
                    checkId: `confidence-good-${agent.agentId}` as any,
                    agent: agent.agentId as any,
                    status: 'ok',
                    priority: 'low',
                    title: `${agent.agentName} High Confidence`,
                    message: `Average confidence: ${(confidence * 100).toFixed(0)}%. Agent responses are well-grounded.`,
                    timestamp: new Date(),
                    data: {
                        agentId: agent.agentId,
                        agentName: agent.agentName,
                        confidence,
                    },
                });
            }
        }
    } catch (error) {
        logger.error('[Heartbeat] Confidence scores check failed', { error, tenantId });
        results.push({
            checkId: 'platform_health' as any,
            agent: 'linus' as any,
            status: 'error',
            priority: 'low',
            title: 'Confidence Check Failed',
            message: 'Unable to check confidence scores.',
            timestamp: new Date(),
        });
    }

    return results;
}
