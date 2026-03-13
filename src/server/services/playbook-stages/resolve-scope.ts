import { logger } from '@/lib/logger';
import type { StageExecutor, StageExecutionInput, StageExecutionResult } from '@/types/playbook-v2';
import { getAdminFirestore } from '@/firebase/admin';
import { getPlaybookArtifactRuntime } from '@/server/services/playbook-artifact-runtime';

const { artifactService } = getPlaybookArtifactRuntime();

export const resolveScopeExecutor: StageExecutor = {
    stageName: 'resolving_scope',

    async run(input: StageExecutionInput): Promise<StageExecutionResult> {
        logger.info(`[Stage: resolving_scope] Run ${input.run.id}`);
        const startTime = Date.now();
        const scopeIn = input.spec.scope as Record<string, any>;

        // 1. Resolve Competitors
        const explicitCompetitorIds = (scopeIn.competitorIds || [])
            .filter((id: string) => id !== 'detect_from_org_profile');
        let competitorIds = [...explicitCompetitorIds];

        if ((scopeIn.competitorIds || []).includes('detect_from_org_profile')) {
            const db = getAdminFirestore();
            const orgDoc = await db.collection('tenants').doc(scopeIn.orgId).get();
            const orgData = orgDoc.data();
            const detectedCompetitorIds = (orgData?.competitors || []).map((c: any) => c.id || c);
            competitorIds = [...new Set([...detectedCompetitorIds, ...explicitCompetitorIds])];
        }

        const resolvedScope = {
            ...scopeIn,
            competitorIds,
        };

        // 2. Persist Artifact
        const persistResult = await artifactService.persist({
            runId: input.run.id,
            workspaceId: String(input.run.orgId || scopeIn.orgId || 'unknown_org'),
            playbookId: input.run.playbookId,
            stageName: this.stageName,
            artifactType: 'resolved_scope',
            filename: 'resolved_scope.json',
            body: JSON.stringify(resolvedScope, null, 2),
            contentType: 'application/json',
            commitToRepo: true,
            runDate: input.run.startedAt,
        });

        return {
            status: 'completed',
            stageOutput: resolvedScope,
            artifactsCreated: [persistResult.artifact],
            metrics: {
                durationMs: Date.now() - startTime,
            }
        };
    }
};
