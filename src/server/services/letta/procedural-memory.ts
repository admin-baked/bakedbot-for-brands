/**
 * Procedural Memory Service
 *
 * Stores and retrieves workflow trajectories - the "how to do things" memory.
 * When an agent successfully completes a multi-step task, the trajectory
 * is stored so it can be recalled for similar future tasks.
 *
 * This is Richmond Alake's "Workflow Memory" concept:
 * - Step 1 → Step 2 → Step 3 → Outcome
 * - Enables agents to learn which paths succeed/fail
 *
 * Reference: Stanford "Generative Agents" paper
 */

import { logger } from '@/lib/logger';
import { lettaClient } from './client';
import {
    ProceduralMemory,
    WorkflowStepSchema,
    MemorySearchResult,
} from './memory-types';
import { z } from 'zod';

// =============================================================================
// WORKFLOW TRAJECTORY STORAGE
// =============================================================================

export interface WorkflowStep {
    stepNumber: number;
    toolName: string;
    args: Record<string, unknown>;
    result?: unknown;
    success: boolean;
    duration_ms?: number;
}

export interface WorkflowTrajectory {
    taskDescription: string;
    steps: WorkflowStep[];
    outcome: 'success' | 'partial' | 'failure';
    totalDuration_ms?: number;
    agentId: string;
    tenantId: string;
}

export class ProceduralMemoryService {
    private readonly PROCEDURAL_TAG = '_procedural_memory';

    /**
     * Store a successful workflow trajectory for future recall.
     * Only stores trajectories with >= 2 steps that succeeded.
     */
    async storeWorkflow(
        agentId: string,
        trajectory: WorkflowTrajectory
    ): Promise<string | null> {
        // Only store successful multi-step workflows
        if (trajectory.steps.length < 2) {
            logger.debug('[ProceduralMemory] Skipping single-step workflow');
            return null;
        }

        const successfulSteps = trajectory.steps.filter(s => s.success).length;
        const successRate = successfulSteps / trajectory.steps.length;

        if (successRate < 0.5) {
            logger.debug('[ProceduralMemory] Skipping low-success workflow');
            return null;
        }

        try {
            const memory: ProceduralMemory = {
                id: `proc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                content: this.summarizeWorkflow(trajectory),
                type: 'procedural',
                timestamp: new Date(),
                agent: agentId,
                tenantId: trajectory.tenantId,
                importance: this.calculateImportance(trajectory),
                tags: [this.PROCEDURAL_TAG, ...this.extractToolTags(trajectory)],
                references: [],
                taskDescription: trajectory.taskDescription,
                steps: trajectory.steps,
                outcome: trajectory.outcome,
                totalDuration_ms: trajectory.totalDuration_ms,
                reusable: true,
            };

            // Store in Letta archival with structured content
            const passage = JSON.stringify({
                _type: 'procedural',
                _version: 1,
                ...memory,
            });

            const result = await lettaClient.insertPassage(agentId, passage);

            logger.info(
                `[ProceduralMemory] Stored workflow: ${trajectory.taskDescription.slice(0, 50)}... (${trajectory.steps.length} steps)`
            );

            return result.id || memory.id;
        } catch (error: unknown) {
            logger.error('[ProceduralMemory] Failed to store workflow:', error as Record<string, any>);
            return null;
        }
    }

    /**
     * Search for relevant workflow trajectories given a task description.
     * Returns trajectories that might help accomplish a similar task.
     */
    async findRelevantWorkflows(
        agentId: string,
        taskDescription: string,
        limit: number = 5
    ): Promise<ProceduralMemory[]> {
        try {
            // Search archival memory for procedural memories
            const query = `${this.PROCEDURAL_TAG} ${taskDescription}`;
            const passages = await lettaClient.searchPassages(agentId, query, limit * 2);

            // Filter and parse procedural memories
            const workflows: ProceduralMemory[] = [];

            for (const passage of passages) {
                try {
                    const parsed = JSON.parse(passage);
                    if (parsed._type === 'procedural') {
                        workflows.push({
                            id: parsed.id,
                            content: parsed.content,
                            type: 'procedural',
                            timestamp: new Date(parsed.timestamp),
                            agent: parsed.agent,
                            tenantId: parsed.tenantId,
                            importance: parsed.importance || 0.5,
                            tags: parsed.tags || [],
                            references: parsed.references || [],
                            taskDescription: parsed.taskDescription,
                            steps: parsed.steps,
                            outcome: parsed.outcome,
                            totalDuration_ms: parsed.totalDuration_ms,
                            reusable: parsed.reusable ?? true,
                        });
                    }
                } catch {
                    // Not a procedural memory, skip
                }
            }

            return workflows.slice(0, limit);
        } catch (error: unknown) {
            logger.error('[ProceduralMemory] Search failed:', error as Record<string, any>);
            return [];
        }
    }

    /**
     * Get the most successful workflow for a specific tool combination.
     * "What's the best way to use searchWeb + lettaSaveFact together?"
     */
    async findBestPractice(
        agentId: string,
        toolNames: string[]
    ): Promise<ProceduralMemory | null> {
        try {
            const query = `${this.PROCEDURAL_TAG} ${toolNames.join(' ')}`;
            const passages = await lettaClient.searchPassages(agentId, query, 10);

            let bestWorkflow: ProceduralMemory | null = null;
            let bestScore = 0;

            for (const passage of passages) {
                try {
                    const parsed = JSON.parse(passage);
                    if (parsed._type !== 'procedural') continue;

                    // Score based on: outcome success, tool match, importance
                    const toolsUsed = new Set(parsed.steps.map((s: WorkflowStep) => s.toolName));
                    const toolMatchRate =
                        toolNames.filter(t => toolsUsed.has(t)).length / toolNames.length;
                    const outcomeScore = parsed.outcome === 'success' ? 1 : parsed.outcome === 'partial' ? 0.5 : 0;
                    const score = toolMatchRate * 0.5 + outcomeScore * 0.3 + (parsed.importance || 0.5) * 0.2;

                    if (score > bestScore) {
                        bestScore = score;
                        bestWorkflow = {
                            id: parsed.id,
                            content: parsed.content,
                            type: 'procedural',
                            timestamp: new Date(parsed.timestamp),
                            agent: parsed.agent,
                            tenantId: parsed.tenantId,
                            importance: parsed.importance || 0.5,
                            tags: parsed.tags || [],
                            references: parsed.references || [],
                            taskDescription: parsed.taskDescription,
                            steps: parsed.steps,
                            outcome: parsed.outcome,
                            totalDuration_ms: parsed.totalDuration_ms,
                            reusable: parsed.reusable ?? true,
                        };
                    }
                } catch {
                    // Skip invalid entries
                }
            }

            return bestWorkflow;
        } catch (error: unknown) {
            logger.error('[ProceduralMemory] Best practice search failed:', error as Record<string, any>);
            return null;
        }
    }

    /**
     * Update the importance of a workflow based on reuse.
     * Called when a workflow is successfully applied again.
     */
    async reinforceWorkflow(
        agentId: string,
        workflowId: string
    ): Promise<void> {
        // In a full implementation, we'd update the importance score
        // For now, we log the reinforcement for future batch processing
        logger.info(`[ProceduralMemory] Reinforcing workflow ${workflowId}`);
    }

    /**
     * Extract suggested next steps from a workflow trajectory.
     * Useful for guiding agents mid-task.
     */
    suggestNextStep(
        currentStep: number,
        trajectory: ProceduralMemory
    ): WorkflowStep | null {
        if (currentStep >= trajectory.steps.length - 1) {
            return null; // No more steps
        }
        return trajectory.steps[currentStep + 1];
    }

    // ==========================================================================
    // PRIVATE HELPERS
    // ==========================================================================

    private summarizeWorkflow(trajectory: WorkflowTrajectory): string {
        const toolChain = trajectory.steps.map(s => s.toolName).join(' → ');
        const successRate = (
            (trajectory.steps.filter(s => s.success).length / trajectory.steps.length) *
            100
        ).toFixed(0);

        return `Task: ${trajectory.taskDescription}\nTools: ${toolChain}\nOutcome: ${trajectory.outcome} (${successRate}% step success)`;
    }

    private calculateImportance(trajectory: WorkflowTrajectory): number {
        // Base importance on:
        // 1. Success rate of steps
        // 2. Number of steps (more complex = potentially more valuable)
        // 3. Outcome
        const successRate = trajectory.steps.filter(s => s.success).length / trajectory.steps.length;
        const complexityBonus = Math.min(trajectory.steps.length / 10, 0.2); // Max 0.2 bonus
        const outcomeMultiplier = trajectory.outcome === 'success' ? 1 : trajectory.outcome === 'partial' ? 0.7 : 0.3;

        return Math.min((successRate * 0.6 + complexityBonus) * outcomeMultiplier + 0.2, 1);
    }

    private extractToolTags(trajectory: WorkflowTrajectory): string[] {
        const tools = new Set(trajectory.steps.map(s => `tool:${s.toolName}`));
        return Array.from(tools);
    }
}

export const proceduralMemoryService = new ProceduralMemoryService();

// =============================================================================
// HARNESS INTEGRATION HELPER
// =============================================================================

/**
 * Call this from harness.ts after runMultiStepTask completes.
 * Automatically persists successful trajectories.
 */
export async function persistWorkflowFromHarness(
    agentId: string,
    tenantId: string,
    userQuery: string,
    steps: Array<{ tool: string; args: any; result: any }>,
    finalResult: string
): Promise<void> {
    // Convert harness steps to workflow steps
    const workflowSteps: WorkflowStep[] = steps.map((step, idx) => ({
        stepNumber: idx + 1,
        toolName: step.tool,
        args: step.args,
        result: step.result ?? null,
        success: !step.result?.error && !step.result?.blocked,
    }));

    // Determine outcome
    const errorCount = workflowSteps.filter(s => !s.success).length;
    const outcome: 'success' | 'partial' | 'failure' =
        errorCount === 0 ? 'success' : errorCount < workflowSteps.length / 2 ? 'partial' : 'failure';

    await proceduralMemoryService.storeWorkflow(agentId, {
        taskDescription: userQuery,
        steps: workflowSteps,
        outcome,
        agentId,
        tenantId,
    });
}
