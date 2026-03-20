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
import { getSecret } from '@/server/utils/secrets';
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

interface GitHubArtifactRepoStoreConfig {
    owner: string;
    repo: string;
    branch: string;
    tokenSecretName: string;
    committerName?: string;
    committerEmail?: string;
}

export class GitHubArtifactRepoStore implements ArtifactRepoStore {
    private octokit: Awaited<ReturnType<typeof this.createOctokit>> | null = null;
    private token: string | null = null;

    constructor(private readonly config: GitHubArtifactRepoStoreConfig) { }

    private async createOctokit() {
        const { Octokit } = await import('@octokit/rest');
        return new Octokit({ auth: this.token! });
    }

    private async getOctokit() {
        if (this.octokit) {
            return this.octokit;
        }

        const token = this.token ?? await getSecret(this.config.tokenSecretName);
        if (!token) {
            throw new Error(
                `Artifact repo token is not configured: ${this.config.tokenSecretName}`,
            );
        }

        this.token = token;
        this.octokit = await this.createOctokit();
        return this.octokit;
    }

    private getCommitIdentity() {
        if (!this.config.committerName || !this.config.committerEmail) {
            return undefined;
        }

        return {
            name: this.config.committerName,
            email: this.config.committerEmail,
        };
    }

    async writeFile(input: { repoPath: string; body: string; message: string }): Promise<void> {
        const octokit = await this.getOctokit();

        let sha: string | undefined;
        try {
            const existing = await octokit.repos.getContent({
                owner: this.config.owner,
                repo: this.config.repo,
                path: input.repoPath,
                ref: this.config.branch,
            });

            if (!Array.isArray(existing.data) && 'sha' in existing.data) {
                sha = existing.data.sha;
            }
        } catch (error) {
            const status = (error as { status?: number }).status;
            if (status !== 404) {
                throw error;
            }
        }

        await octokit.repos.createOrUpdateFileContents({
            owner: this.config.owner,
            repo: this.config.repo,
            path: input.repoPath,
            branch: this.config.branch,
            message: input.message,
            content: Buffer.from(input.body, 'utf8').toString('base64'),
            sha,
            author: this.getCommitIdentity(),
            committer: this.getCommitIdentity(),
        });

        logger.info('[GitHubArtifactRepoStore] Artifact committed', {
            owner: this.config.owner,
            repo: this.config.repo,
            branch: this.config.branch,
            repoPath: input.repoPath,
        });
    }

    async writeFiles(input: { files: Array<{ repoPath: string; body: string }>; message: string }): Promise<void> {
        if (input.files.length === 0) {
            return;
        }

        const octokit = await this.getOctokit();
        const ref = await octokit.git.getRef({
            owner: this.config.owner,
            repo: this.config.repo,
            ref: `heads/${this.config.branch}`,
        });

        const headSha = ref.data.object.sha;
        const commit = await octokit.git.getCommit({
            owner: this.config.owner,
            repo: this.config.repo,
            commit_sha: headSha,
        });

        const tree = await octokit.git.createTree({
            owner: this.config.owner,
            repo: this.config.repo,
            base_tree: commit.data.tree.sha,
            tree: input.files.map((file) => ({
                path: file.repoPath,
                mode: '100644',
                type: 'blob',
                content: file.body,
            })),
        });

        const nextCommit = await octokit.git.createCommit({
            owner: this.config.owner,
            repo: this.config.repo,
            message: input.message,
            tree: tree.data.sha,
            parents: [headSha],
            author: this.getCommitIdentity(),
            committer: this.getCommitIdentity(),
        });

        await octokit.git.updateRef({
            owner: this.config.owner,
            repo: this.config.repo,
            ref: `heads/${this.config.branch}`,
            sha: nextCommit.data.sha,
        });

        logger.info('[GitHubArtifactRepoStore] Artifact batch committed', {
            owner: this.config.owner,
            repo: this.config.repo,
            branch: this.config.branch,
            fileCount: input.files.length,
        });
    }
}

export class GitArtifactRepoMock implements ArtifactRepoStore {
    private missingRepoWarningLogged = false;

    private warnMissingRepoConfig(operation: 'writeFile' | 'writeFiles') {
        if (this.missingRepoWarningLogged) {
            return;
        }

        logger.warn('[ArtifactRepoStore] Artifact repo not configured; using mock store', {
            operation,
        });
        this.missingRepoWarningLogged = true;
    }

    async writeFile(input: { repoPath: string; body: string; message: string }): Promise<void> {
        this.warnMissingRepoConfig('writeFile');

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
        this.warnMissingRepoConfig('writeFiles');

        logger.info('[GitRepoMock] Committing batch:', {
            fileCount: input.files.length,
            message: input.message,
        });
    }
}

export function createPlaybookArtifactRepoStore(): ArtifactRepoStore {
    const owner = process.env.PLAYBOOK_ARTIFACT_REPO_OWNER?.trim();
    const repo = process.env.PLAYBOOK_ARTIFACT_REPO_NAME?.trim();
    const branch = process.env.PLAYBOOK_ARTIFACT_REPO_BRANCH?.trim() || 'main';
    const tokenSecretName =
        process.env.PLAYBOOK_ARTIFACT_REPO_TOKEN_SECRET?.trim()
        || 'PLAYBOOK_ARTIFACT_REPO_TOKEN';
    const committerName =
        process.env.PLAYBOOK_ARTIFACT_REPO_COMMITTER_NAME?.trim()
        || 'BakedBot Artifact Runtime';
    const committerEmail =
        process.env.PLAYBOOK_ARTIFACT_REPO_COMMITTER_EMAIL?.trim()
        || 'artifacts@bakedbot.ai';

    if (!owner || !repo) {
        return new GitArtifactRepoMock();
    }

    return new GitHubArtifactRepoStore({
        owner,
        repo,
        branch,
        tokenSecretName,
        committerName,
        committerEmail,
    });
}

// ---------------------------------------------------------------------------
// Task Dispatcher (Cloud Tasks)
// ---------------------------------------------------------------------------

export class CloudTasksDispatcher implements TaskDispatcher {
    async enqueueStage(payload: PlaybookJobPayload): Promise<void> {
        // We use the existing dispatchAgentJob but wrapper for playbook stages
        const response = await dispatchAgentJob({
            userId: 'system-playbook-runtime',
            jobId: `${payload.runId}:${payload.stageName}:${payload.attempt}`,
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
