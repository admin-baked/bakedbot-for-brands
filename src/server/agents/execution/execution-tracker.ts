/**
 * Execution Tracker - Step-by-Step Transparency
 * 
 * Tracks and exposes agent execution steps for "Worked for Xs" UI pattern.
 * Inspired by Tasklet.ai's execution transparency feature.
 */

import { logger } from '@/lib/logger';

export type ExecutionStepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface ExecutionStep {
    step: number;
    action: string;
    status: ExecutionStepStatus;
    startedAt?: Date;
    completedAt?: Date;
    durationMs?: number;
    result?: string;
    error?: string;
}

export interface ExecutionTrace {
    id: string;
    agentId: string;
    agentName: string;
    prompt: string;
    startedAt: Date;
    completedAt?: Date;
    totalDurationMs?: number;
    status: 'running' | 'completed' | 'failed';
    steps: ExecutionStep[];
    metadata?: Record<string, unknown>;
}

/**
 * Execution Tracker class for managing agent execution traces
 */
export class ExecutionTracker {
    private trace: ExecutionTrace;
    private currentStep: number = 0;

    constructor(agentId: string, agentName: string, prompt: string) {
        this.trace = {
            id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            agentId,
            agentName,
            prompt,
            startedAt: new Date(),
            status: 'running',
            steps: [],
        };
    }

    /**
     * Add a new step to the execution trace
     */
    addStep(action: string): number {
        this.currentStep++;
        this.trace.steps.push({
            step: this.currentStep,
            action,
            status: 'pending',
        });
        return this.currentStep;
    }

    /**
     * Mark a step as running
     */
    startStep(stepNumber: number): void {
        const step = this.trace.steps.find(s => s.step === stepNumber);
        if (step) {
            step.status = 'running';
            step.startedAt = new Date();
        }
    }

    /**
     * Mark a step as completed
     */
    completeStep(stepNumber: number, result?: string): void {
        const step = this.trace.steps.find(s => s.step === stepNumber);
        if (step) {
            step.status = 'done';
            step.completedAt = new Date();
            step.result = result;
            if (step.startedAt) {
                step.durationMs = step.completedAt.getTime() - step.startedAt.getTime();
            }
        }
    }

    /**
     * Mark a step as failed
     */
    failStep(stepNumber: number, error: string): void {
        const step = this.trace.steps.find(s => s.step === stepNumber);
        if (step) {
            step.status = 'failed';
            step.completedAt = new Date();
            step.error = error;
            if (step.startedAt) {
                step.durationMs = step.completedAt.getTime() - step.startedAt.getTime();
            }
        }
    }

    /**
     * Skip a step
     */
    skipStep(stepNumber: number, reason?: string): void {
        const step = this.trace.steps.find(s => s.step === stepNumber);
        if (step) {
            step.status = 'skipped';
            step.result = reason || 'Skipped';
        }
    }

    /**
     * Complete the entire execution
     */
    complete(metadata?: Record<string, unknown>): ExecutionTrace {
        this.trace.completedAt = new Date();
        this.trace.status = 'completed';
        this.trace.totalDurationMs = this.trace.completedAt.getTime() - this.trace.startedAt.getTime();
        if (metadata) {
            this.trace.metadata = metadata;
        }
        return this.trace;
    }

    /**
     * Mark execution as failed
     */
    fail(error: string): ExecutionTrace {
        this.trace.completedAt = new Date();
        this.trace.status = 'failed';
        this.trace.totalDurationMs = this.trace.completedAt.getTime() - this.trace.startedAt.getTime();
        this.trace.metadata = { error };
        return this.trace;
    }

    /**
     * Get the current trace state
     */
    getTrace(): ExecutionTrace {
        return { ...this.trace };
    }

    /**
     * Persist the trace to Firestore for durability and queryability.
     * Path: tenants/{tenantId}/execution_traces/{trace.id}
     * Fire-and-forget — never throws to avoid blocking the caller.
     */
    async saveTrace(tenantId: string): Promise<void> {
        try {
            const { getAdminFirestore } = await import('@/firebase/admin');
            const firestore = getAdminFirestore();
            await firestore
                .collection(`tenants/${tenantId}/execution_traces`)
                .doc(this.trace.id)
                .set({
                    ...this.trace,
                    startedAt: this.trace.startedAt.toISOString(),
                    completedAt: this.trace.completedAt?.toISOString() ?? null,
                    steps: this.trace.steps.map(s => ({
                        ...s,
                        startedAt: s.startedAt?.toISOString() ?? null,
                        completedAt: s.completedAt?.toISOString() ?? null,
                    })),
                    savedAt: new Date().toISOString(),
                }, { merge: true });
        } catch (e) {
            logger.error('[ExecutionTracker] Failed to persist trace', { traceId: this.trace.id, error: e });
        }
    }

    /**
     * Get elapsed time in seconds
     */
    getElapsedSeconds(): number {
        const now = this.trace.completedAt || new Date();
        return Math.round((now.getTime() - this.trace.startedAt.getTime()) / 1000);
    }

    /**
     * Format trace for UI display
     */
    formatForUI(): {
        title: string;
        elapsed: string;
        steps: Array<{ icon: string; text: string; status: string }>;
    } {
        const statusIcons: Record<ExecutionStepStatus, string> = {
            pending: '⏱️',
            running: '⏳',
            done: '✅',
            failed: '❌',
            skipped: '⏭️',
        };

        return {
            title: `Episodic Thinking (${this.getElapsedSeconds()}s)`,
            elapsed: `${this.getElapsedSeconds()}s`,
            steps: this.trace.steps.map(step => ({
                icon: statusIcons[step.status],
                text: step.action,
                status: step.status,
            })),
        };
    }
}

/**
 * Create a new execution tracker
 */
export function createExecutionTracker(
    agentId: string,
    agentName: string,
    prompt: string
): ExecutionTracker {
    return new ExecutionTracker(agentId, agentName, prompt);
}

/**
 * Helper to run a step with automatic tracking
 */
export async function runTrackedStep<T>(
    tracker: ExecutionTracker,
    action: string,
    fn: () => Promise<T>
): Promise<T> {
    const stepNumber = tracker.addStep(action);
    tracker.startStep(stepNumber);
    
    try {
        const result = await fn();
        tracker.completeStep(stepNumber, typeof result === 'string' ? result : 'Completed');
        return result;
    } catch (error) {
        tracker.failStep(stepNumber, error instanceof Error ? error.message : 'Unknown error');
        throw error;
    }
}
