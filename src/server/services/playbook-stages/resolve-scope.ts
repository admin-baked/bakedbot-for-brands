import { logger } from '@/lib/logger';
import type { StageExecutor, StageExecutionInput, StageExecutionResult } from '@/types/playbook-v2';
import { getAdminFirestore } from '@/firebase/admin';
import { ArtifactPersistenceService } from '@/server/services/playbook-artifact-service';
import { FirestorePlaybookAdapter, FirebaseStorageBlobStore } from '@/server/services/playbook-infra-adapters';

const adapter = new FirestorePlaybookAdapter();
const blob = new FirebaseStorageBlobStore();
const artifactService = new ArtifactPersistenceService(blob, adapter);

export const resolveScopeExecutor: StageExecutor = {
    stageName: 'resolving_scope',

    async run(input: StageExecutionInput): Promise<StageExecutionResult> {
        logger.info(`[Stage: resolving_scope] Run ${input.run.id}`);
        const startTime = Date.now();
        const scopeIn = input.spec.scope as Record<string, any>;

        // 1. Resolve Competitors
        let competitorIds = scopeIn.competitorIds || [];
        if (competitorIds.includes('detect_from_org_profile')) {
            const db = getAdminFirestore();
            const orgDoc = await db.collection('tenants').doc(scopeIn.orgId).get();
            const orgData = orgDoc.data();
            competitorIds = (orgData?.competitors || []).map((c: any) => c.id || c);
        }

        const resolvedScope = {
            ...scopeIn,
            competitorIds: competitorIds.filter((id: string) => id !== 'detect_from_org_profile')
        };

        // 2. Persist Artifact
        const persistResult = await artifactService.persist({
            runId: input.run.id,
            workspaceId: scopeIn.orgId,
            playbookId: input.run.playbookId,
            stageName: this.stageName,
            artifactType: 'resolved_scope',
            filename: 'resolved_scope.json',
            body: JSON.stringify(resolvedScope, null, 2),
            contentType: 'application/json',
            commitToRepo: true,
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
