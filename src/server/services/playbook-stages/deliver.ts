import { logger } from '@/lib/logger';
import type { StageExecutor, StageExecutionInput, StageExecutionResult } from '@/types/playbook-v2';
import { ArtifactPersistenceService } from '@/server/services/playbook-artifact-service';
import { FirestorePlaybookAdapter, FirebaseStorageBlobStore } from '@/server/services/playbook-infra-adapters';

const adapter = new FirestorePlaybookAdapter();
const blob = new FirebaseStorageBlobStore();
const artifactService = new ArtifactPersistenceService(blob, adapter);

export const deliverExecutor: StageExecutor = {
    stageName: 'delivering',

    async run(input: StageExecutionInput): Promise<StageExecutionResult> {
        logger.info(`[Stage: delivering] Run ${input.run.id}`);
        const startTime = Date.now();

        const scope = input.spec.scope as Record<string, unknown>;
        const destinations = input.spec.outputs.destinations;

        const deliveryManifest = {
            timestamp: new Date().toISOString(),
            destinations: [] as Array<{ destination: string; status: string }>,
        };

        // Placeholder: Send email or create dashboard notification
        for (const dest of destinations) {
            logger.info(`[Deliver] Sending payload to ${dest}`);
            deliveryManifest.destinations.push({ destination: dest, status: 'success' });
        }

        // Persist Artifact
        const persistResult = await artifactService.persist({
            runId: input.run.id,
            workspaceId: scope.orgId as string || 'unknown_org',
            playbookId: input.run.playbookId,
            stageName: this.stageName,
            artifactType: 'delivery_manifest',
            filename: 'delivery_manifest.json',
            body: JSON.stringify(deliveryManifest, null, 2),
            contentType: 'application/json',
            commitToRepo: true,
        });

        return {
            status: 'completed',
            stageOutput: deliveryManifest,
            artifactsCreated: [persistResult.artifact],
            metrics: {
                durationMs: Date.now() - startTime,
            }
        };
    }
};
