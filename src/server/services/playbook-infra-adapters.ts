/**
 * Playbook Infrastructure Adapters
 *
 * Concrete implementations of the repository and store interfaces
 * used by PlaybookRunCoordinator and ArtifactPersistenceService.
 *
 * Targets:
 * - Firestore (RunRepository, PlaybookRepository, ArtifactMetadataStore)
 * - Firebase Storage (BlobStore)
 * - Local / Git Mock (ArtifactRepoStore)
 */

import { getAdminFirestore, getAdminStorage } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type {
    RunRepository,
    PlaybookRepository,
    TaskDispatcher,
} from '@/server/services/playbook-run-coordinator';
import type {
    ArtifactMetadataStore,
    BlobStore,
    ArtifactRepoStore,
} from '@/server/services/playbook-artifact-service';
import type {
    PlaybookRunRecord,
    StageRecord,
} from '@/server/services/playbook-run-coordinator';
import type {
    CompiledPlaybookSpec,
    PolicyBundle,
    PlaybookArtifact,
    PlaybookJobPayload,
} from '@/types/playbook-v2';
import { dispatchAgentJob } from '@/server/jobs/dispatch';

// ---------------------------------------------------------------------------
// Firestore Adapter
// ---------------------------------------------------------------------------

export class FirestorePlaybookAdapter implements RunRepository, PlaybookRepository, ArtifactMetadataStore {
    private get db() {
        return getAdminFirestore();
    }

    // RunRepository
    async createRun(run: PlaybookRunRecord): Promise<void> {
        await this.db.collection('playbook_runs').doc(run.id).set(run);
    }

    async getRun(runId: string): Promise<PlaybookRunRecord | null> {
        const snap = await this.db.collection('playbook_runs').doc(runId).get();
        return snap.exists ? (snap.data() as PlaybookRunRecord) : null;
    }

    async updateRun(runId: string, patch: Partial<PlaybookRunRecord>): Promise<void> {
        await this.db.collection('playbook_runs').doc(runId).update(patch);
    }

    async appendStage(stage: StageRecord): Promise<void> {
        const stageId = `${stage.stageName}_${stage.attempt}`;
        await this.db
            .collection('playbook_runs')
            .doc(stage.runId)
            .collection('stages')
            .doc(stageId)
            .set(stage);
    }

    async getStages(runId: string): Promise<StageRecord[]> {
        const snap = await this.db
            .collection('playbook_runs')
            .doc(runId)
            .collection('stages')
            .orderBy('startedAt', 'asc')
            .get();
        return snap.docs.map(doc => doc.data() as StageRecord);
    }

    // PlaybookRepository
    async getCompiledSpec(playbookId: string, version?: number): Promise<CompiledPlaybookSpec | null> {
        const playbookSnap = await this.db.collection('playbooks').doc(playbookId).get();
        if (!playbookSnap.exists) return null;

        const data = playbookSnap.data()!;
        if (version && data.version !== version) {
            // Check versions subcollection
            const versionSnap = await this.db
                .collection('playbooks')
                .doc(playbookId)
                .collection('versions')
                .doc(version.toString())
                .get();
            return versionSnap.exists ? (versionSnap.data()?.compiledSpec as CompiledPlaybookSpec) : null;
        }

        return (data.compiledSpec as CompiledPlaybookSpec) || null;
    }

    async getPolicyBundle(bundleId: string): Promise<PolicyBundle | null> {
        const snap = await this.db.collection('policy_bundles').doc(bundleId).get();
        return snap.exists ? (snap.data() as PolicyBundle) : null;
    }

    // ArtifactMetadataStore
    async insert(artifact: PlaybookArtifact): Promise<void> {
        await this.db
            .collection('playbook_runs')
            .doc(artifact.runId)
            .collection('artifacts')
            .doc(artifact.id)
            .set(artifact);
    }

    async get(artifactId: string): Promise<PlaybookArtifact | null> {
        // This requires a collection group query or knowing the runId
        const snap = await this.db.collectionGroup('artifacts').where('id', '==', artifactId).get();
        return snap.empty ? null : (snap.docs[0].data() as PlaybookArtifact);
    }

    async listByRun(runId: string): Promise<PlaybookArtifact[]> {
        const snap = await this.db
            .collection('playbook_runs')
            .doc(runId)
            .collection('artifacts')
            .orderBy('createdAt', 'asc')
            .get();
        return snap.docs.map(doc => doc.data() as PlaybookArtifact);
    }

    async listByRunAndStage(runId: string, stageName: string): Promise<PlaybookArtifact[]> {
        const snap = await this.db
            .collection('playbook_runs')
            .doc(runId)
            .collection('artifacts')
            .where('stageName', '==', stageName)
            .get();
        return snap.docs.map(doc => doc.data() as PlaybookArtifact);
    }
}

// ---------------------------------------------------------------------------
// Storage Adapter (Firebase Storage)
// ---------------------------------------------------------------------------

export class FirebaseStorageBlobStore implements BlobStore {
    private get bucket() {
        return getAdminStorage().bucket();
    }

    async put(input: {
        path: string;
        contentType: string;
        body: string | Buffer;
    }): Promise<{ path: string; checksum?: string }> {
        const file = this.bucket.file(input.path);
        await file.save(input.body, {
            contentType: input.contentType,
            metadata: {
                cacheControl: 'public, max-age=31536000',
            },
        });

        const [metadata] = await file.getMetadata();
        return {
            path: input.path,
            checksum: metadata.md5Hash,
        };
    }

    async get(path: string): Promise<{ body: Buffer; contentType?: string }> {
        const file = this.bucket.file(path);
        const [body] = await file.download();
        const [metadata] = await file.getMetadata();

        return {
            body,
            contentType: metadata.contentType,
        };
    }
}

// ---------------------------------------------------------------------------
// Repo Adapter (Git Mock / Local Log)
// ---------------------------------------------------------------------------

export class GitArtifactRepoMock implements ArtifactRepoStore {
    async writeFile(input: { repoPath: string; body: string; message: string }): Promise<void> {
        // In production, this would use a git client to push to the artifacts repo
        logger.info('[GitRepoMock] Committing artifact:', {
            path: input.repoPath,
            message: input.message,
            size: input.body.length,
        });

        // For now, we simulate success. In a real environment, we'd use the octokit or 
        // a dedicated git service.
    }

    async writeFiles(input: { files: Array<{ repoPath: string; body: string }>; message: string }): Promise<void> {
        logger.info('[GitRepoMock] Committing batch:', {
            fileCount: input.files.length,
            message: input.message,
        });
    }
}

// ---------------------------------------------------------------------------
// Task Dispatcher (Cloud Tasks)
// ---------------------------------------------------------------------------

export class CloudTasksDispatcher implements TaskDispatcher {
    async enqueueStage(payload: PlaybookJobPayload): Promise<void> {
        // We use the existing dispatchAgentJob but wrapper for playbook stages
        const response = await dispatchAgentJob({
            userId: 'system-playbook-runtime',
            jobId: payload.runId,
            userInput: `Execute playbook stage: ${payload.stageName}`,
            persona: 'ezal', // Defaulting to Ezal for CI, can be dynamic
            options: {
                modelLevel: 'advanced',
                context: {
                    ...payload,
                    isPlaybookStage: true,
                }
            }
        });

        if (!response.success) {
            throw new Error(`Failed to enqueue playbook stage: ${response.error}`);
        }

        logger.info('[CloudTasksDispatcher] Stage enqueued', {
            runId: payload.runId,
            stageName: payload.stageName,
            taskId: response.taskId
        });
    }
}
