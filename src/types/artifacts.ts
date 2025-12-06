/**
 * Interactive Chat Artifacts
 * Rich content rendered inline in agent conversations
 */

export type ArtifactType = 'code' | 'table' | 'chart' | 'file' | 'form' | 'yaml' | 'image';

export interface ChatArtifact {
    id: string;
    type: ArtifactType;
    title: string;
    content: string; // JSON stringified or raw content
    editable: boolean;

    // For code artifacts
    language?: string;

    // For file artifacts
    fileId?: string;
    downloadUrl?: string;

    // For table/chart
    data?: Record<string, unknown>[];
    columns?: string[];

    // Tracking
    createdAt: Date;
    messageId: string;
}

export interface ArtifactUpdate {
    artifactId: string;
    newContent: string;
    updatedBy: string;
    updatedAt: Date;
}
