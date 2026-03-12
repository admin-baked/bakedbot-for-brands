import { logger } from '@/lib/logger';
import type { StageExecutor, StageExecutionInput, StageExecutionResult } from '@/types/playbook-v2';
import { ArtifactPersistenceService } from '@/server/services/playbook-artifact-service';
import { FirestorePlaybookAdapter, FirebaseStorageBlobStore } from '@/server/services/playbook-infra-adapters';

const adapter = new FirestorePlaybookAdapter();
const blob = new FirebaseStorageBlobStore();
const artifactService = new ArtifactPersistenceService(blob, adapter);

export const assembleContextExecutor: StageExecutor = {
    stageName: 'assembling_context',

    async run(input: StageExecutionInput): Promise<StageExecutionResult> {
        logger.info(`[Stage: assembling_context] Run ${input.run.id}`);
        const startTime = Date.now();

        const scopeArtifact = input.priorArtifacts.find(a => a.artifactType === 'resolved_scope');
        if (!scopeArtifact) {
            return {
                status: 'failed',
                error: { code: 'MISSING_SCOPE', message: 'No scope artifact found', retryable: false }
            };
        }

        const scopeDataRaw = await artifactService.getArtifactContent(scopeArtifact.storagePath);
        const scope = JSON.parse(scopeDataRaw.body.toString());

        // Placeholder: Run Ezal Live snapshots and compute diffs
        const menuDiff = { totalChanges: 12, categories: { flower: 5, vapes: 7 } };
        const promoDiff = { newPromos: 2, expiredPromos: 1 };
        const researchPack = `# Competitive Intelligence Research Pack\n\n## Menu Changes\n- 12 new items.\n## Promo Changes\n- 2 new promos.`;

        // Persist Artifacts
        const p1 = artifactService.persist({
            runId: input.run.id,
            workspaceId: scope.orgId || 'unknown_org',
            playbookId: input.run.playbookId,
            stageName: this.stageName,
            artifactType: 'menu_diff',
            filename: 'menu_diff.json',
            body: JSON.stringify(menuDiff, null, 2),
            contentType: 'application/json',
            commitToRepo: false,
        });

        const p2 = artifactService.persist({
            runId: input.run.id,
            workspaceId: scope.orgId || 'unknown_org',
            playbookId: input.run.playbookId,
            stageName: this.stageName,
            artifactType: 'promo_diff',
            filename: 'promo_diff.json',
            body: JSON.stringify(promoDiff, null, 2),
            contentType: 'application/json',
            commitToRepo: false,
        });

        const p3 = artifactService.persist({
            runId: input.run.id,
            workspaceId: scope.orgId || 'unknown_org',
            playbookId: input.run.playbookId,
            stageName: this.stageName,
            artifactType: 'research_pack',
            filename: 'research_pack.md',
            body: researchPack,
            contentType: 'text/markdown',
            commitToRepo: true,
        });

        const [res1, res2, res3] = await Promise.all([p1, p2, p3]);

        return {
            status: 'completed',
            stageOutput: { menuDiff, promoDiff },
            artifactsCreated: [res1.artifact, res2.artifact, res3.artifact],
            metrics: {
                durationMs: Date.now() - startTime,
            }
        };
    }
};
