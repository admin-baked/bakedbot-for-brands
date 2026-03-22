import { randomUUID } from 'crypto';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { PlaybookArtifactMemoryService } from '@/server/services/playbook-artifact-memory';
import { getPlaybookArtifactRuntime } from '@/server/services/playbook-artifact-runtime';
import { playbookTelemetry } from '@/server/services/playbook-telemetry';
import {
    CloudTasksDispatcher,
    FirestorePlaybookAdapter,
} from '@/server/services/playbook-infra-adapters';
import {
    PlaybookRunCoordinator,
    type PlaybookRunRecord,
    type StageRecord,
} from '@/server/services/playbook-run-coordinator';
import { assembleContextExecutor } from '@/server/services/playbook-stages/assemble-context';
import { deliverExecutor } from '@/server/services/playbook-stages/deliver';
import { extractQuestionsExecutor } from '@/server/services/playbook-stages/extract-questions';
import { generateOutputExecutor } from '@/server/services/playbook-stages/generate-output';
import { resolveScopeExecutor } from '@/server/services/playbook-stages/resolve-scope';
import { validateExecutor } from '@/server/services/playbook-stages/validate';
import type {
    OrderedRunStage,
    PlaybookJobPayload,
    StageExecutionResult,
    StageExecutor,
    ValidationReport,
} from '@/types/playbook-v2';

const EXECUTORS: Record<OrderedRunStage, StageExecutor | undefined> = {
    resolving_scope: resolveScopeExecutor,
    extracting_questions: extractQuestionsExecutor,
    assembling_context: assembleContextExecutor,
    generating_output: generateOutputExecutor,
    validating: validateExecutor,
    awaiting_approval: undefined,
    delivering: deliverExecutor,
};

const { artifactService } = getPlaybookArtifactRuntime();
const artifactMemory = new PlaybookArtifactMemoryService(artifactService);

function isPlaybookJobPayload(value: unknown): value is PlaybookJobPayload & { isPlaybookStage: true } {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return (
        candidate.isPlaybookStage === true &&
        typeof candidate.runId === 'string' &&
        typeof candidate.playbookId === 'string' &&
        typeof candidate.stageName === 'string' &&
        typeof candidate.attempt === 'number' &&
        candidate.triggerEvent !== undefined
    );
}

async function appendRunningStage(run: PlaybookRunRecord, payload: PlaybookJobPayload): Promise<void> {
    const adapter = new FirestorePlaybookAdapter();
    const stageRecord: StageRecord = {
        runId: run.id,
        stageName: payload.stageName,
        attempt: payload.attempt,
        status: 'running',
        artifactIds: [],
        stateIn: {
            triggerEvent: payload.triggerEvent,
        },
        startedAt: new Date().toISOString(),
    };

    await adapter.appendStage(stageRecord);
}

async function persistDeliveryRecords(runId: string, deliveryManifest: Record<string, unknown>): Promise<void> {
    const destinations = Array.isArray(deliveryManifest.destinations)
        ? deliveryManifest.destinations
        : [];

    if (destinations.length === 0) {
        return;
    }

    const db = getAdminFirestore();
    const batch = db.batch();
    for (const destination of destinations) {
        const deliveryRef = db
            .collection('playbook_runs')
            .doc(runId)
            .collection('deliveries')
            .doc(`delivery_${randomUUID()}`);

        const record =
            destination && typeof destination === 'object'
                ? destination
                : { destination: String(destination), status: 'unknown' };

        batch.set(deliveryRef, {
            ...record,
            runId,
            createdAt: new Date().toISOString(),
        });
    }

    await batch.commit();
}

async function loadApprovalAndDeliveries(runId: string): Promise<{
    approval: Record<string, unknown> | null;
    deliveries: Array<Record<string, unknown>>;
}> {
    const db = getAdminFirestore();
    const [approvalSnap, deliveriesSnap] = await Promise.all([
        db.collection('playbook_runs').doc(runId).collection('approval').doc('current').get(),
        db.collection('playbook_runs').doc(runId).collection('deliveries').get(),
    ]);

    return {
        approval: approvalSnap.exists ? (approvalSnap.data() as Record<string, unknown>) : null,
        deliveries: deliveriesSnap.docs.map((doc) => doc.data() as Record<string, unknown>),
    };
}

export async function handlePlaybookStageJob(context: unknown): Promise<void> {
    if (!isPlaybookJobPayload(context)) {
        throw new Error('Invalid playbook stage payload');
    }

    const payload: PlaybookJobPayload = {
        runId: context.runId,
        playbookId: context.playbookId,
        stageName: context.stageName as OrderedRunStage,
        attempt: context.attempt,
        triggerEvent: context.triggerEvent,
    };

    const executor = EXECUTORS[payload.stageName];
    if (!executor) {
        throw new Error(`No executor registered for ${payload.stageName}`);
    }

    const adapter = new FirestorePlaybookAdapter();
    const dispatcher = new CloudTasksDispatcher();
    const coordinator = new PlaybookRunCoordinator(adapter, adapter, dispatcher, artifactMemory);

    const run = await adapter.getRun(payload.runId);
    if (!run) {
        throw new Error(`Run not found: ${payload.runId}`);
    }

    const spec = await adapter.getCompiledSpec(payload.playbookId, run.playbookVersion);
    if (!spec) {
        throw new Error(`Compiled spec not found for ${payload.playbookId}`);
    }

    const policyBundle = spec.policyBundleId
        ? await adapter.getPolicyBundle(spec.policyBundleId)
        : null;
    const priorArtifacts = await adapter.listByRun(payload.runId);

    await appendRunningStage(run, payload);

    // Phase checkpoint — write a lightweight artifact immediately after the stage
    // transitions to 'running', before the executor fires.  This gives operators
    // visibility into which stage a long run is in, and gives Cloud Tasks retries
    // a resumable-state anchor they can inspect before re-running expensive work.
    const stageStartedAt = new Date().toISOString();
    await artifactMemory.safePersist('persistStageCheckpoint', () =>
        artifactMemory.persistStageCheckpoint({
            run,
            stageName: payload.stageName,
            attempt: payload.attempt,
            startedAt: stageStartedAt,
        })
    );

    const startedAt = Date.now();
    let result: StageExecutionResult;
    try {
        result = await executor.run({
            run: {
                id: run.id,
                playbookId: run.playbookId,
                playbookVersion: run.playbookVersion,
                orgId: run.orgId,
                startedAt: run.startedAt,
            },
            spec,
            stageInput: {},
            priorArtifacts,
            policyBundle: policyBundle ?? undefined,
            attempt: payload.attempt,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[PlaybookStageRunner] Stage execution crashed', {
            runId: payload.runId,
            stageName: payload.stageName,
            error: message,
        });
        result = {
            status: 'failed',
            error: {
                code: 'STAGE_EXCEPTION',
                message,
                retryable: false,
            },
            metrics: {
                durationMs: Date.now() - startedAt,
            },
        };
    }

    const validationReport =
        payload.stageName === 'validating' &&
        result.stageOutput &&
        typeof result.stageOutput === 'object'
            ? (result.stageOutput as ValidationReport)
            : undefined;

    await coordinator.handleStageCompletion({
        runId: payload.runId,
        stageName: payload.stageName,
        attempt: payload.attempt,
        result,
        validationReport,
    });

    // Finalize the stage checkpoint with terminal status + duration.
    // A Cloud Tasks retry can read this and skip already-completed stages (resumable state).
    await artifactMemory.safePersist('finalizeStageCheckpoint', () =>
        artifactMemory.finalizeStageCheckpoint({
            run,
            stageName: payload.stageName,
            attempt: payload.attempt,
            startedAt: stageStartedAt,
            status: result.status === 'completed' ? 'completed' : 'failed',
            durationMs: Date.now() - startedAt,
        })
    );

    if (
        payload.stageName === 'delivering' &&
        result.status === 'completed' &&
        result.stageOutput &&
        typeof result.stageOutput === 'object'
    ) {
        await persistDeliveryRecords(payload.runId, result.stageOutput as Record<string, unknown>);
    }

    const latestRun = await adapter.getRun(payload.runId);
    if (latestRun && result.status === 'failed' && result.error) {
        await artifactMemory.safePersist('persistFailureArtifacts', () => {
            return artifactMemory.persistFailureArtifacts({
                run: latestRun,
                stageName: payload.stageName,
                attempt: payload.attempt,
                error: result.error!,
            });
        });
    }

    if (latestRun && ['awaiting_approval', 'completed', 'failed'].includes(latestRun.status)) {
        const latestArtifacts = await adapter.listByRun(payload.runId);
        const latestStages = await adapter.getStages(payload.runId);
        const { approval, deliveries } = await loadApprovalAndDeliveries(payload.runId);

        await artifactMemory.safePersist('persistSummaryForAIEngineers', () => {
            return artifactMemory.persistSummaryForAIEngineers({
                run: latestRun,
                playbook: {
                    id: payload.playbookId,
                    orgId: latestRun.orgId,
                    version: latestRun.playbookVersion,
                    name: spec.playbookType,
                    displayName: spec.playbookType,
                },
                spec,
                artifacts: latestArtifacts,
                stages: latestStages,
                approval,
                deliveries,
            });
        });
    }

    await playbookTelemetry.recordEvent({
        playbookId: payload.playbookId,
        runId: payload.runId,
        stageName: payload.stageName,
        metrics: {
            durationMs: result.metrics?.durationMs ?? Date.now() - startedAt,
            tokenInput: result.metrics?.tokenInput,
            tokenOutput: result.metrics?.tokenOutput,
            toolCalls: result.metrics?.toolCalls,
            attempt: payload.attempt,
        },
        success: result.status === 'completed',
        errorCode: result.error?.code,
    });
}
