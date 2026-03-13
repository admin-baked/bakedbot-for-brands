/**
 * Playbook Artifact Persistence Service
 *
 * Implements the Artifact Repo and Runtime Implementation Guide:
 * - Deterministic path building
 * - Dual-write to blob storage (Firebase Storage) + optional Git repo
 * - Summary artifact generation for AI Engineers
 * - Artifact retrieval and comparison
 *
 * Firestore collections:
 *   playbook_runs/{runId}/artifacts/{artifactId}
 *
 * Firebase Storage layout:
 *   artifacts/playbooks/{workspaceId}/{playbookId}/runs/{YYYY}/{MM}/{DD}/{runId}/{filename}
 */

import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import type { PlaybookArtifact } from '@/types/playbook-v2';

// ---------------------------------------------------------------------------
// Storage Interfaces
// ---------------------------------------------------------------------------

export interface BlobStore {
    put(input: {
        path: string;
        contentType: string;
        body: string | Buffer;
    }): Promise<{ path: string; checksum?: string }>;

    get(path: string): Promise<{ body: Buffer; contentType?: string }>;
}

export interface ArtifactRepoStore {
    writeFile(input: {
        repoPath: string;
        body: string;
        message: string;
    }): Promise<void>;

    writeFiles(input: {
        files: Array<{ repoPath: string; body: string }>;
        message: string;
    }): Promise<void>;
}

export interface ArtifactMetadataStore {
    insert(artifact: PlaybookArtifact): Promise<void>;
    get(artifactId: string): Promise<PlaybookArtifact | null>;
    listByRun(runId: string): Promise<PlaybookArtifact[]>;
    listByRunAndStage(runId: string, stageName: string): Promise<PlaybookArtifact[]>;
}

// ---------------------------------------------------------------------------
// Path Builder — deterministic, date-partitioned
// ---------------------------------------------------------------------------

export function buildArtifactPaths(input: {
    workspaceId: string;
    playbookId: string;
    runId: string;
    runDate: Date;
    filename: string;
}) {
    const yyyy = input.runDate.getUTCFullYear();
    const mm = String(input.runDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(input.runDate.getUTCDate()).padStart(2, '0');

    const base = `artifacts/playbooks/${input.workspaceId}/${input.playbookId}/runs/${yyyy}/${mm}/${dd}/${input.runId}`;

    return {
        repoPath: `${base}/${input.filename}`,
        blobPath: `${base}/${input.filename}`,
    };
}

export function buildPlaybookSpecPaths(input: {
    workspaceId: string;
    playbookId: string;
    version: number;
    filename?: string;
}) {
    const base = `artifacts/playbooks/${input.workspaceId}/${input.playbookId}/spec`;
    const filename = input.filename ?? `v${input.version}.json`;

    return {
        repoPath: `${base}/${filename}`,
        blobPath: `${base}/${filename}`,
    };
}

// ---------------------------------------------------------------------------
// Persist Input/Result contracts
// ---------------------------------------------------------------------------

export interface PersistArtifactInput {
    runId: string;
    workspaceId: string;
    playbookId: string;
    stageName: string;
    artifactType: string;
    filename: string;
    body: string;
    contentType: string;
    commitToRepo: boolean;
    sourceRefs?: string[];
    metadata?: Record<string, unknown>;
    runDate?: Date | string;
}

export interface PersistArtifactResult {
    artifact: PlaybookArtifact;
    blobPath: string;
    repoPath?: string;
}

export interface PersistDocumentResult {
    blobPath: string;
    repoPath?: string;
    checksum?: string;
}

// ---------------------------------------------------------------------------
// Standard artifacts per stage (Build Package §10)
// ---------------------------------------------------------------------------

export const STAGE_ARTIFACTS: Record<string, Array<{ filename: string; type: string; commitToRepo: boolean }>> = {
    resolving_scope: [
        { filename: 'resolved_scope.json', type: 'resolved_scope', commitToRepo: true },
    ],
    extracting_questions: [
        { filename: 'questions.json', type: 'questions', commitToRepo: true },
    ],
    assembling_context: [
        { filename: 'menu_diff.json', type: 'menu_diff', commitToRepo: false },
        { filename: 'promo_diff.json', type: 'promo_diff', commitToRepo: false },
        { filename: 'research_pack.md', type: 'research_pack', commitToRepo: true },
        { filename: 'context_manifest.json', type: 'context_manifest', commitToRepo: true },
    ],
    generating_output: [
        { filename: 'output.md', type: 'generated_output', commitToRepo: true },
        { filename: 'recommendations.json', type: 'recommendations', commitToRepo: true },
    ],
    validating: [
        { filename: 'validation_report.json', type: 'validation_report', commitToRepo: true },
    ],
    delivering: [
        { filename: 'delivery_manifest.json', type: 'delivery_manifest', commitToRepo: true },
    ],
    awaiting_approval: [
        { filename: 'approval.json', type: 'approval', commitToRepo: true },
    ],
};

// ---------------------------------------------------------------------------
// Artifact Persistence Service
// ---------------------------------------------------------------------------

export class ArtifactPersistenceService {
    constructor(
        private readonly blobStore: BlobStore,
        private readonly metadataStore: ArtifactMetadataStore,
        private readonly repoStore?: ArtifactRepoStore,
    ) { }

    /**
     * Persist an artifact to blob storage, metadata store, and optionally Git repo.
     */
    async persist(input: PersistArtifactInput): Promise<PersistArtifactResult> {
        const candidateRunDate = input.runDate ? new Date(input.runDate) : null;
        const now =
            candidateRunDate && Number.isFinite(candidateRunDate.getTime())
                ? candidateRunDate
                : new Date();
        const { repoPath, blobPath } = buildArtifactPaths({
            workspaceId: input.workspaceId,
            playbookId: input.playbookId,
            runId: input.runId,
            runDate: now,
            filename: input.filename,
        });

        const documentResult = await this.writeDocument({
            blobPath,
            repoPath,
            body: input.body,
            contentType: input.contentType,
            commitToRepo: input.commitToRepo,
            message: `[playbooks] ${input.workspaceId} ${input.playbookId} ${input.runId} ${input.stageName}`,
        });

        // 3. Create metadata record
        const artifact: PlaybookArtifact = {
            id: `art_${randomUUID()}`,
            runId: input.runId,
            stageName: input.stageName,
            artifactType: input.artifactType,
            storagePath: documentResult.blobPath,
            mimeType: input.contentType,
            checksum: documentResult.checksum,
            createdAt: now.toISOString(),
            sourceRefs: input.sourceRefs,
            metadata: {
                ...input.metadata,
                repoPath: documentResult.repoPath,
            },
        };

        await this.metadataStore.insert(artifact);

        logger.info('[ArtifactService] Artifact persisted', {
            artifactId: artifact.id,
            runId: input.runId,
            stageName: input.stageName,
            blobPath,
            repoPath: documentResult.repoPath,
        });

        return {
            artifact,
            blobPath,
            repoPath: documentResult.repoPath,
        };
    }

    async writeDocument(input: {
        blobPath: string;
        repoPath?: string;
        body: string;
        contentType: string;
        commitToRepo: boolean;
        message: string;
    }): Promise<PersistDocumentResult> {
        const blobResult = await this.blobStore.put({
            path: input.blobPath,
            contentType: input.contentType,
            body: input.body,
        });

        let committedRepoPath: string | undefined;
        if (input.commitToRepo && input.repoPath && this.repoStore) {
            try {
                await this.repoStore.writeFile({
                    repoPath: input.repoPath,
                    body: input.body,
                    message: input.message,
                });
                committedRepoPath = input.repoPath;
            } catch (err) {
                logger.warn('[ArtifactService] Repo write failed, blob persisted', {
                    repoPath: input.repoPath,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }

        return {
            blobPath: blobResult.path,
            repoPath: committedRepoPath,
            checksum: blobResult.checksum,
        };
    }

    /**
     * Persist multiple artifacts for a stage in a single batch.
     */
    async persistBatch(inputs: PersistArtifactInput[]): Promise<PersistArtifactResult[]> {
        return Promise.all(inputs.map(input => this.persist(input)));
    }

    /**
     * Retrieve artifact metadata by ID.
     */
    async getArtifact(artifactId: string): Promise<PlaybookArtifact | null> {
        return this.metadataStore.get(artifactId);
    }

    /**
     * List all artifacts for a run.
     */
    async listArtifactsForRun(runId: string): Promise<PlaybookArtifact[]> {
        return this.metadataStore.listByRun(runId);
    }

    /**
     * Get artifact content from blob storage.
     */
    async getArtifactContent(storagePath: string): Promise<{ body: Buffer; contentType?: string }> {
        return this.blobStore.get(storagePath);
    }
}
