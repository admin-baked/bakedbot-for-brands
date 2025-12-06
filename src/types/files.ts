/**
 * Agent File Storage
 * Files downloaded or created by agents during Computer Use
 */

export interface AgentFile {
    id: string;
    name: string;
    mimeType: string;
    size: number; // bytes
    storagePath: string; // Firebase Storage path
    downloadedFrom?: string; // URL if downloaded

    // Metadata
    agentId: string;
    taskId?: string;
    orgId: string;
    createdAt: Date;

    // Access
    isPublic: boolean;
    expiresAt?: Date;
}

export interface FileDownloadRequest {
    url: string;
    agentId: string;
    reason: string;
    estimatedSize?: number;
}

export interface FileDownloadPermission {
    requestId: string;
    approved: boolean;
    decidedBy: string;
    decidedAt: Date;
}
