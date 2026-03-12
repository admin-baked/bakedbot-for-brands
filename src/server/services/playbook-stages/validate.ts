import { logger } from '@/lib/logger';
import type { StageExecutor, StageExecutionInput, StageExecutionResult } from '@/types/playbook-v2';
import { ArtifactPersistenceService } from '@/server/services/playbook-artifact-service';
import { FirestorePlaybookAdapter, FirebaseStorageBlobStore } from '@/server/services/playbook-infra-adapters';
import { runValidationHarness, DAILY_CI_VALIDATORS } from '@/server/services/playbook-validation';

const adapter = new FirestorePlaybookAdapter();
const blob = new FirebaseStorageBlobStore();
const artifactService = new ArtifactPersistenceService(blob, adapter);

export const validateExecutor: StageExecutor = {
    stageName: 'validating',

    async run(input: StageExecutionInput): Promise<StageExecutionResult> {
        logger.info(`[Stage: validating] Run ${input.run.id}`);
        const startTime = Date.now();

        const scope = input.spec.scope as Record<string, unknown>;

        // Run harness
        const report = await runValidationHarness({
            run: { id: input.run.id, playbookId: input.run.playbookId },
            spec: input.spec,
            artifacts: input.priorArtifacts,
            policyBundle: input.policyBundle,
        }, DAILY_CI_VALIDATORS);

        // Persist Artifact
        const persistResult = await artifactService.persist({
            runId: input.run.id,
            workspaceId: scope.orgId as string || 'unknown_org',
            playbookId: input.run.playbookId,
            stageName: this.stageName,
            artifactType: 'validation_report',
            filename: 'validation_report.json',
            body: JSON.stringify(report, null, 2),
            contentType: 'application/json',
            commitToRepo: true,
        });

        // The validation report is used by PlaybookRunCoordinator to determine the next state
        return {
            status: 'completed',
            stageOutput: report,
            artifactsCreated: [persistResult.artifact],
            metrics: {
                durationMs: Date.now() - startTime,
            }
        };
    }
};
