import { logger } from '@/lib/logger';
import type { StageExecutor, StageExecutionInput, StageExecutionResult } from '@/types/playbook-v2';
import { getPlaybookArtifactRuntime } from '@/server/services/playbook-artifact-runtime';

const { artifactService } = getPlaybookArtifactRuntime();

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
        const contextManifest = {
            generatedAt: new Date().toISOString(),
            menuDiffArtifact: 'menu_diff.json',
            promoDiffArtifact: 'promo_diff.json',
            summaryArtifact: 'research_pack.md',
        };

        // Persist Artifacts
        const p1 = artifactService.persist({
            runId: input.run.id,
            workspaceId: String(input.run.orgId || scope.orgId || 'unknown_org'),
            playbookId: input.run.playbookId,
            stageName: this.stageName,
            artifactType: 'menu_diff',
            filename: 'menu_diff.json',
            body: JSON.stringify(menuDiff, null, 2),
            contentType: 'application/json',
            commitToRepo: false,
            runDate: input.run.startedAt,
        });

        const p2 = artifactService.persist({
            runId: input.run.id,
            workspaceId: String(input.run.orgId || scope.orgId || 'unknown_org'),
            playbookId: input.run.playbookId,
            stageName: this.stageName,
            artifactType: 'promo_diff',
            filename: 'promo_diff.json',
            body: JSON.stringify(promoDiff, null, 2),
            contentType: 'application/json',
            commitToRepo: false,
            runDate: input.run.startedAt,
        });

        const p3 = artifactService.persist({
            runId: input.run.id,
            workspaceId: String(input.run.orgId || scope.orgId || 'unknown_org'),
            playbookId: input.run.playbookId,
            stageName: this.stageName,
            artifactType: 'research_pack',
            filename: 'research_pack.md',
            body: researchPack,
            contentType: 'text/markdown',
            commitToRepo: true,
            metadata: { confidence: 0.92 },
            runDate: input.run.startedAt,
        });

        const p4 = artifactService.persist({
            runId: input.run.id,
            workspaceId: String(input.run.orgId || scope.orgId || 'unknown_org'),
            playbookId: input.run.playbookId,
            stageName: this.stageName,
            artifactType: 'context_manifest',
            filename: 'context_manifest.json',
            body: JSON.stringify(contextManifest, null, 2),
            contentType: 'application/json',
            commitToRepo: true,
            runDate: input.run.startedAt,
        });

        const [res1, res2, res3, res4] = await Promise.all([p1, p2, p3, p4]);

        return {
            status: 'completed',
            stageOutput: { menuDiff, promoDiff, contextManifest },
            artifactsCreated: [res1.artifact, res2.artifact, res3.artifact, res4.artifact],
            metrics: {
                durationMs: Date.now() - startTime,
            }
        };
    }
};
