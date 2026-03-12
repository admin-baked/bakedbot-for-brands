/**
 * Playbook Run Coordinator
 *
 * Orchestrates the execution of a Playbook run through the deterministic
 * state machine defined in playbook-v2.ts.
 *
 * Responsibilities:
 *   - Create run records
 *   - Transition run states via getNextRunStatus()
 *   - Dispatch stages to Cloud Tasks
 *   - Record stage results and artifacts
 *   - Invoke the validation harness
 *   - Route for approval or auto-deliver
 *
 * This is the Runtime Service from Build Package §1.
 *
 * Firestore collections:
 *   playbook_runs/{runId}
 *   playbook_runs/{runId}/stages/{stageName_attempt}
 */

import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import {
    getNextRunStatus,
    RUN_STAGE_ORDER,
    type OrderedRunStage,
    type StageExecutionInput,
    type StageExecutionResult,
    type StageExecutor,
    type CompiledPlaybookSpec,
    type PlaybookArtifact,
    type PolicyBundle,
    type ValidationReport,
    type PlaybookJobPayload,
} from '@/types/playbook-v2';
import type { RunStatus, StageStatus } from '@/types/playbook';

// ---------------------------------------------------------------------------
// Run Record (matches Firestore doc shape)
// ---------------------------------------------------------------------------

export interface PlaybookRunRecord {
    id: string;
    playbookId: string;
    playbookVersion: number;
    status: RunStatus;
    triggerEvent: Record<string, unknown>;
    resolvedScope?: Record<string, unknown>;
    confidence?: number;
    deliveryStatus?: string;
    requiresApproval: boolean;
    retryCount: number;
    artifactIds: string[];
    stageStatuses: Record<string, StageStatus>;
    validationReport?: ValidationReport;
    startedAt: string;
    completedAt?: string;
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Stage Record (matches Firestore subcollection doc)
// ---------------------------------------------------------------------------

export interface StageRecord {
    runId: string;
    stageName: string;
    attempt: number;
    status: StageStatus;
    stateIn?: Record<string, unknown>;
    stateOut?: Record<string, unknown>;
    confidence?: number;
    errorCode?: string;
    errorMessage?: string;
    durationMs?: number;
    artifactIds: string[];
    metrics?: {
        durationMs: number;
        tokenInput?: number;
        tokenOutput?: number;
        toolCalls?: number;
    };
    startedAt?: string;
    completedAt?: string;
}

// ---------------------------------------------------------------------------
// Run Repository Interface (Firestore adapter)
// ---------------------------------------------------------------------------

export interface RunRepository {
    createRun(run: PlaybookRunRecord): Promise<void>;
    getRun(runId: string): Promise<PlaybookRunRecord | null>;
    updateRun(runId: string, patch: Partial<PlaybookRunRecord>): Promise<void>;
    appendStage(stage: StageRecord): Promise<void>;
    getStages(runId: string): Promise<StageRecord[]>;
}

// ---------------------------------------------------------------------------
// Playbook Repository Interface
// ---------------------------------------------------------------------------

export interface PlaybookRepository {
    getCompiledSpec(playbookId: string, version?: number): Promise<CompiledPlaybookSpec | null>;
    getPolicyBundle(bundleId: string): Promise<PolicyBundle | null>;
}

// ---------------------------------------------------------------------------
// Task Dispatcher Interface (Cloud Tasks adapter)
// ---------------------------------------------------------------------------

export interface TaskDispatcher {
    enqueueStage(payload: PlaybookJobPayload): Promise<void>;
}

// ---------------------------------------------------------------------------
// Run Coordinator
// ---------------------------------------------------------------------------

export class PlaybookRunCoordinator {
    constructor(
        private readonly runRepo: RunRepository,
        private readonly playbookRepo: PlaybookRepository,
        private readonly taskDispatcher: TaskDispatcher,
    ) { }

    /**
     * Create a new run and enqueue the first stage.
     */
    async startRun(input: {
        playbookId: string;
        playbookVersion: number;
        triggerEvent: Record<string, unknown>;
    }): Promise<{ runId: string }> {
        const now = new Date().toISOString();
        const runId = `run_${randomUUID()}`;

        const run: PlaybookRunRecord = {
            id: runId,
            playbookId: input.playbookId,
            playbookVersion: input.playbookVersion,
            status: 'queued',
            triggerEvent: input.triggerEvent,
            requiresApproval: false,
            retryCount: 0,
            artifactIds: [],
            stageStatuses: {},
            startedAt: now,
            createdAt: now,
        };

        await this.runRepo.createRun(run);

        // Transition to first stage
        const nextStatus = getNextRunStatus({ currentStatus: 'queued' });
        await this.runRepo.updateRun(runId, { status: nextStatus });

        // Enqueue first stage
        await this.taskDispatcher.enqueueStage({
            runId,
            playbookId: input.playbookId,
            stageName: 'resolving_scope',
            attempt: 1,
            triggerEvent: input.triggerEvent,
        });

        logger.info('[RunCoordinator] Run started', { runId, playbookId: input.playbookId });

        return { runId };
    }

    /**
     * Handle completion of a stage and transition to the next.
     */
    async handleStageCompletion(input: {
        runId: string;
        stageName: OrderedRunStage;
        result: StageExecutionResult;
        validationReport?: ValidationReport;
    }): Promise<void> {
        const run = await this.runRepo.getRun(input.runId);
        if (!run) throw new Error(`Run ${input.runId} not found`);

        // Record stage result
        const stageRecord: StageRecord = {
            runId: input.runId,
            stageName: input.stageName,
            attempt: 1,
            status: input.result.status === 'completed' ? 'completed' : 'failed',
            stateOut: input.result.stageOutput as Record<string, unknown> | undefined,
            confidence: input.result.confidence,
            errorCode: input.result.error?.code,
            errorMessage: input.result.error?.message,
            metrics: input.result.metrics,
            artifactIds: (input.result.artifactsCreated || []).map(a => a.id),
            completedAt: new Date().toISOString(),
        };

        await this.runRepo.appendStage(stageRecord);

        // Update run with new artifact IDs
        const newArtifactIds = (input.result.artifactsCreated || []).map(a => a.id);
        const allArtifactIds = [...run.artifactIds, ...newArtifactIds];

        // Handle failure
        if (input.result.status === 'failed') {
            if (input.result.error?.retryable && run.retryCount < 3) {
                await this.runRepo.updateRun(input.runId, {
                    retryCount: run.retryCount + 1,
                    stageStatuses: { ...run.stageStatuses, [input.stageName]: 'failed' },
                });
                await this.taskDispatcher.enqueueStage({
                    runId: input.runId,
                    playbookId: run.playbookId,
                    stageName: input.stageName,
                    attempt: run.retryCount + 2,
                    triggerEvent: run.triggerEvent,
                });
                return;
            }

            await this.runRepo.updateRun(input.runId, {
                status: 'failed',
                artifactIds: allArtifactIds,
                stageStatuses: { ...run.stageStatuses, [input.stageName]: 'failed' },
                completedAt: new Date().toISOString(),
            });
            return;
        }

        // Determine next status
        const nextStatus = getNextRunStatus({
            currentStatus: input.stageName as RunStatus,
            validation: input.validationReport,
            approvalResolved: false,
            deliverySucceeded: input.stageName === 'delivering',
        });

        // Update run
        const runPatch: Partial<PlaybookRunRecord> = {
            status: nextStatus,
            artifactIds: allArtifactIds,
            confidence: input.result.confidence ?? run.confidence,
            stageStatuses: { ...run.stageStatuses, [input.stageName]: 'completed' },
        };

        if (input.validationReport) {
            runPatch.validationReport = input.validationReport;
            runPatch.requiresApproval = input.validationReport.requiresApproval;
        }

        if (input.stageName === 'resolving_scope' && input.result.stageOutput) {
            runPatch.resolvedScope = input.result.stageOutput as Record<string, unknown>;
        }

        if (nextStatus === 'completed' || nextStatus === 'failed') {
            runPatch.completedAt = new Date().toISOString();
        }

        await this.runRepo.updateRun(input.runId, runPatch);

        // Enqueue next stage if needed
        if (nextStatus !== 'completed' && nextStatus !== 'failed' && nextStatus !== 'awaiting_approval') {
            const nextStageName = nextStatus as OrderedRunStage;
            if (RUN_STAGE_ORDER.includes(nextStageName)) {
                await this.taskDispatcher.enqueueStage({
                    runId: input.runId,
                    playbookId: run.playbookId,
                    stageName: nextStageName,
                    attempt: 1,
                    triggerEvent: run.triggerEvent,
                });
            }
        }

        logger.info('[RunCoordinator] Stage completed, transitioned', {
            runId: input.runId,
            stageName: input.stageName,
            nextStatus,
        });
    }

    /**
     * Handle approval resolution — transitions from awaiting_approval to delivering.
     */
    async handleApproval(input: {
        runId: string;
        approved: boolean;
        reviewerId: string;
        notes?: string;
    }): Promise<void> {
        const run = await this.runRepo.getRun(input.runId);
        if (!run) throw new Error(`Run ${input.runId} not found`);
        if (run.status !== 'awaiting_approval') {
            throw new Error(`Run ${input.runId} is not awaiting approval (status: ${run.status})`);
        }

        if (!input.approved) {
            await this.runRepo.updateRun(input.runId, {
                status: 'failed',
                completedAt: new Date().toISOString(),
            });
            return;
        }

        const nextStatus = getNextRunStatus({
            currentStatus: 'awaiting_approval',
            approvalResolved: true,
        });

        await this.runRepo.updateRun(input.runId, { status: nextStatus });

        // Enqueue delivery
        await this.taskDispatcher.enqueueStage({
            runId: input.runId,
            playbookId: run.playbookId,
            stageName: 'delivering',
            attempt: 1,
            triggerEvent: run.triggerEvent,
        });

        logger.info('[RunCoordinator] Approval resolved', {
            runId: input.runId,
            approved: input.approved,
            nextStatus,
        });
    }
}
