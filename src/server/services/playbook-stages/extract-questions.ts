import { logger } from '@/lib/logger';
import type { StageExecutor, StageExecutionInput, StageExecutionResult } from '@/types/playbook-v2';
import { ArtifactPersistenceService } from '@/server/services/playbook-artifact-service';
import { FirestorePlaybookAdapter, FirebaseStorageBlobStore } from '@/server/services/playbook-infra-adapters';

const adapter = new FirestorePlaybookAdapter();
const blob = new FirebaseStorageBlobStore();
const artifactService = new ArtifactPersistenceService(blob, adapter);

export const extractQuestionsExecutor: StageExecutor = {
    stageName: 'extracting_questions',

    async run(input: StageExecutionInput): Promise<StageExecutionResult> {
        logger.info(`[Stage: extracting_questions] Run ${input.run.id}`);
        const startTime = Date.now();

        // For Daily CI, the questions are generally static based on objectives
        const objectives = input.spec.objectives || [];
        const questions: string[] = [];

        if (objectives.includes('detect_price_changes')) {
            questions.push('which_price_changes_exceed_threshold');
        }
        if (objectives.includes('detect_promo_changes')) {
            questions.push('which_promos_are_new');
        }
        if (objectives.includes('detect_assortment_changes')) {
            questions.push('which_categories_moved');
        }
        questions.push('what_changed_vs_yesterday');
        questions.push('which_changes_are_operationally_meaningful');

        const scope = input.spec.scope as Record<string, any>;

        // Persist Artifact
        const persistResult = await artifactService.persist({
            runId: input.run.id,
            workspaceId: scope.orgId || 'unknown_org',
            playbookId: input.run.playbookId,
            stageName: this.stageName,
            artifactType: 'questions',
            filename: 'questions.json',
            body: JSON.stringify(questions, null, 2),
            contentType: 'application/json',
            commitToRepo: true,
        });

        return {
            status: 'completed',
            stageOutput: { questions },
            artifactsCreated: [persistResult.artifact],
            metrics: {
                durationMs: Date.now() - startTime,
            }
        };
    }
};
