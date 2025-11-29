// Task Engine - orchestrates multi-step task execution with agents and tools

import type { Task, TaskStep, ToolExecution, TaskExecutionEvent } from '@/types/task';
import { getToolRegistry } from '@/server/tools/tool-registry';
import { getAgentConfigLoader } from '@/ai/agent-config-loader';
import type { ToolContext } from '@/types/tool';

import { logger } from '@/lib/logger';
/**
 * Task Engine
 * Executes tasks by coordinating agents and tools across multiple steps
 */
export class TaskEngine {
    private toolRegistry = getToolRegistry();
    private agentLoader = getAgentConfigLoader();

    // Event listeners for real-time updates
    private eventListeners: Array<(event: TaskExecutionEvent) => void> = [];

    constructor() {
        // Load agents on initialization
        this.agentLoader.loadAll().catch(err => {
            logger.error('Failed to load agent configurations:', err);
        });
    }

    /**
     * Execute a complete task
     */
    async executeTask(task: Task): Promise<Task> {
        // Mark task as running
        task.status = 'running';
        task.updatedAt = new Date();

        this.emitEvent({
            type: 'task_started',
            taskId: task.id,
            timestamp: new Date(),
            data: { message: `Starting task: ${task.name}` }
        });

        try {
            // Execute steps in order, respecting dependencies
            for (let i = 0; i < task.steps.length; i++) {
                const step = task.steps[i];

                // Check if dependencies are met
                if (!this.areDependenciesMet(step, task.steps)) {
                    task.status = 'failed';
                    throw new Error(`Step ${step.stepNumber} dependencies not met`);
                }

                // Execute the step
                task.currentStepIndex = i;
                await this.executeStep(step, task);

                // Check if step failed
                if (step.status === 'failed') {
                    task.status = 'failed';
                    task.metrics.failedSteps++;
                    break;
                }

                task.metrics.completedSteps++;
            }

            // Mark task as complete if all steps succeeded
            if (task.status !== 'failed') {
                task.status = 'completed';
                task.completedAt = new Date();
            }

        } catch (error) {
            task.status = 'failed';
            this.emitEvent({
                type: 'task_failed',
                taskId: task.id,
                timestamp: new Date(),
                data: { error: error instanceof Error ? error.message : 'Unknown error' }
            });
        }

        task.updatedAt = new Date();

        this.emitEvent({
            type: 'task_completed',
            taskId: task.id,
            timestamp: new Date(),
            data: {
                status: task.status,
                completedSteps: task.metrics.completedSteps,
                failedSteps: task.metrics.failedSteps
            }
        });

        return task;
    }

    /**
     * Execute a single step
     */
    private async executeStep(step: TaskStep, task: Task): Promise<void> {
        step.status = 'running';
        step.startedAt = new Date();

        this.emitEvent({
            type: 'step_started',
            taskId: task.id,
            timestamp: new Date(),
            data: {
                stepId: step.id,
                stepNumber: step.stepNumber,
                agentId: step.agentId,
                description: step.description
            }
        });

        try {
            // Get agent configuration
            const agentConfig = this.agentLoader.get(step.agentId);
            if (!agentConfig) {
                throw new Error(`Agent ${step.agentId} not found`);
            }

            // Execute each required tool
            for (const toolId of step.requiredTools) {
                const tool = this.toolRegistry.getById(toolId);
                if (!tool) {
                    logger.warn(`Tool ${toolId} not found, skipping`);
                    continue;
                }

                // Create tool execution record
                const toolExecution: ToolExecution = {
                    id: `${step.id}-${toolId}-${Date.now()}`,
                    stepId: step.id,
                    toolId: tool.id,
                    toolName: tool.name,
                    toolCategory: tool.category,
                    status: 'running',
                    input: {}, // TODO: Extract from step context
                    output: null,
                    startTime: new Date(),
                    visible: tool.visible,
                    metadata: {}
                };

                step.toolExecutions.push(toolExecution);
                task.metrics.totalToolExecutions++;

                this.emitEvent({
                    type: 'tool_started',
                    taskId: task.id,
                    timestamp: new Date(),
                    data: {
                        stepId: step.id,
                        toolExecutionId: toolExecution.id,
                        tool: tool.name
                    }
                });

                try {
                    // Build tool context
                    const context: ToolContext = {
                        userId: task.createdBy,
                        brandId: task.brandId,
                        taskId: task.id,
                        stepId: step.id,
                        agentId: step.agentId,
                        previousResults: this.getPreviousResults(step, task.steps),
                        sharedData: {}
                    };

                    // Execute tool
                    const result = await tool.execute(toolExecution.input, context);

                    // Update tool execution
                    toolExecution.status = result.success ? 'success' : 'error';
                    toolExecution.output = result.data;
                    toolExecution.error = result.error?.message;
                    toolExecution.endTime = new Date();
                    toolExecution.duration = toolExecution.endTime.getTime() - toolExecution.startTime.getTime();
                    toolExecution.displayData = result.displayData;
                    toolExecution.metadata = result.metadata;

                    if (result.success) {
                        task.metrics.successfulToolExecutions++;
                    } else {
                        task.metrics.failedToolExecutions++;
                    }

                    this.emitEvent({
                        type: 'tool_completed',
                        taskId: task.id,
                        timestamp: new Date(),
                        data: {
                            stepId: step.id,
                            toolExecutionId: toolExecution.id,
                            success: result.success,
                            displayData: result.displayData
                        }
                    });

                } catch (error) {
                    toolExecution.status = 'error';
                    toolExecution.error = error instanceof Error ? error.message : 'Unknown error';
                    toolExecution.endTime = new Date();
                    task.metrics.failedToolExecutions++;

                    this.emitEvent({
                        type: 'tool_failed',
                        taskId: task.id,
                        timestamp: new Date(),
                        data: {
                            stepId: step.id,
                            toolExecutionId: toolExecution.id,
                            error: toolExecution.error
                        }
                    });
                }
            }

            // Mark step as complete
            step.status = 'completed';
            step.completedAt = new Date();
            step.duration = step.completedAt.getTime() - step.startedAt!.getTime();

            this.emitEvent({
                type: 'step_completed',
                taskId: task.id,
                timestamp: new Date(),
                data: {
                    stepId: step.id,
                    duration: step.duration,
                    toolExecutions: step.toolExecutions.length
                }
            });

        } catch (error) {
            step.status = 'failed';
            step.error = error instanceof Error ? error.message : 'Unknown error';
            step.completedAt = new Date();

            this.emitEvent({
                type: 'step_failed',
                taskId: task.id,
                timestamp: new Date(),
                data: {
                    stepId: step.id,
                    error: step.error
                }
            });
        }
    }

    /**
     * Check if step dependencies are met
     */
    private areDependenciesMet(step: TaskStep, allSteps: TaskStep[]): boolean {
        if (!step.dependsOn || step.dependsOn.length === 0) {
            return true;
        }

        for (const depId of step.dependsOn) {
            const depStep = allSteps.find(s => s.id === depId);
            if (!depStep || depStep.status !== 'completed') {
                return false;
            }
        }

        return true;
    }

    /**
     * Get results from previous steps
     */
    private getPreviousResults(currentStep: TaskStep, allSteps: TaskStep[]): any[] {
        const previousSteps = allSteps.filter(s =>
            s.stepNumber < currentStep.stepNumber && s.status === 'completed'
        );

        return previousSteps.map(s => s.output).filter(o => o !== undefined);
    }

    /**
     * Subscribe to task execution events
     */
    onEvent(listener: (event: TaskExecutionEvent) => void): () => void {
        this.eventListeners.push(listener);

        // Return unsubscribe function
        return () => {
            const index = this.eventListeners.indexOf(listener);
            if (index > -1) {
                this.eventListeners.splice(index, 1);
            }
        };
    }

    /**
     * Emit an event to all listeners
     */
    private emitEvent(event: TaskExecutionEvent): void {
        for (const listener of this.eventListeners) {
            try {
                listener(event);
            } catch (error) {
                logger.error('Error in event listener:', error);
            }
        }
    }

    /**
     * Pause task execution
     */
    async pauseTask(taskId: string): Promise<void> {
        // Implementation for pausing
        logger.info(`Pausing task ${taskId}`);
    }

    /**
     * Resume task execution
     */
    async resumeTask(task: Task): Promise<Task> {
        // Implementation for resuming
        logger.info(`Resuming task ${task.id}`);
        return this.executeTask(task);
    }

    /**
     * Cancel task execution
     */
    async cancelTask(taskId: string): Promise<void> {
        // Implementation for cancelling
        logger.info(`Cancelling task ${taskId}`);
    }
}

// Singleton instance
let engine: TaskEngine | null = null;

/**
 * Get the singleton task engine
 */
export function getTaskEngine(): TaskEngine {
    if (!engine) {
        engine = new TaskEngine();
    }
    return engine;
}
