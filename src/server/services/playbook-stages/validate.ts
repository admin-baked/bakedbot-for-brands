import { logger } from '@/lib/logger';
import type { StageExecutor, StageExecutionInput, StageExecutionResult } from '@/types/playbook-v2';
import { getPlaybookArtifactRuntime } from '@/server/services/playbook-artifact-runtime';
import { runValidationHarness, DAILY_CI_VALIDATORS } from '@/server/services/playbook-validation';

const { artifactService } = getPlaybookArtifactRuntime();

export const validateExecutor: StageExecutor = {
    stageName: 'validating',

    async run(input: StageExecutionInput): Promise<StageExecutionResult> {
        logger.info(`[Stage: validating] Run ${input.run.id}`);
        const startTime = Date.now();

        const scope = input.spec.scope as Record<string, unknown>;
        const artifactBodies = Object.fromEntries(
            await Promise.all(
                input.priorArtifacts.map(async (artifact) => {
                    try {
                        const content = await artifactService.getArtifactContent(artifact.storagePath);
                        return [artifact.id, content.body.toString('utf8')] as const;
                    } catch {
                        return [artifact.id, ''] as const;
                    }
                }),
            ),
        );

        // Run harness
        const report = await runValidationHarness({
            run: { id: input.run.id, playbookId: input.run.playbookId },
            spec: input.spec,
            artifacts: input.priorArtifacts,
            policyBundle: input.policyBundle,
            artifactBodies,
        }, DAILY_CI_VALIDATORS);

        // Persist Artifact
        const persistResult = await artifactService.persist({
            runId: input.run.id,
            workspaceId: String(input.run.orgId || scope.orgId || 'unknown_org'),
            playbookId: input.run.playbookId,
            stageName: this.stageName,
            artifactType: 'validation_report',
            filename: 'validation_report.json',
            body: JSON.stringify(report, null, 2),
            contentType: 'application/json',
            commitToRepo: true,
            runDate: input.run.startedAt,
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
