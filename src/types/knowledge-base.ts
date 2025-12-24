
import { z } from 'zod';

// --- Owner Types ---
export type KnowledgeBaseOwnerType = 'system' | 'brand' | 'dispensary' | 'customer';

// --- Document Source Types ---
export type KnowledgeDocumentSource = 'paste' | 'upload' | 'drive' | 'scrape';
export type KnowledgeDocumentType = 'text' | 'link' | 'pdf' | 'file';

// --- Google Drive Metadata ---
export interface GoogleDriveMetadata {
    fileId: string;
    fileName: string;
    mimeType: string;
    lastModified?: Date;
}

// --- Usage Limits ---
export interface KnowledgeUsageLimits {
    maxDocuments: number;
    maxTotalBytes: number;
    allowUpload: boolean;
    allowDrive: boolean;
    allowScrape: boolean;
}

// --- Plan-Based Limits ---
export const KNOWLEDGE_LIMITS: Record<string, KnowledgeUsageLimits> = {
    free: {
        maxDocuments: 5,
        maxTotalBytes: 10 * 1024, // 10 KB
        allowUpload: false,
        allowDrive: false,
        allowScrape: false,
    },
    claim_pro: {
        maxDocuments: 50,
        maxTotalBytes: 1 * 1024 * 1024, // 1 MB
        allowUpload: true,
        allowDrive: false,
        allowScrape: true,
    },
    starter: {
        maxDocuments: 500,
        maxTotalBytes: 10 * 1024 * 1024, // 10 MB
        allowUpload: true,
        allowDrive: true,
        allowScrape: true,
    },
    growth: {
        maxDocuments: 2000,
        maxTotalBytes: 50 * 1024 * 1024, // 50 MB
        allowUpload: true,
        allowDrive: true,
        allowScrape: true,
    },
    scale: {
        maxDocuments: 10000,
        maxTotalBytes: 100 * 1024 * 1024, // 100 MB
        allowUpload: true,
        allowDrive: true,
        allowScrape: true,
    },
    enterprise: {
        maxDocuments: Infinity,
        maxTotalBytes: Infinity,
        allowUpload: true,
        allowDrive: true,
        allowScrape: true,
    },
    system: {
        maxDocuments: Infinity,
        maxTotalBytes: Infinity,
        allowUpload: true,
        allowDrive: true,
        allowScrape: true,
    },
};

// --- Knowledge Base Interface ---
export interface KnowledgeBase {
    id: string;
    ownerId: string; // brandId, dispensaryId, customerId, or 'system'
    ownerType: KnowledgeBaseOwnerType;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    documentCount: number;
    totalBytes: number; // Track storage usage
    enabled: boolean;
    systemInstructions?: string; // Custom instructions for agents using this KB
}

// --- Knowledge Document Interface ---
export interface KnowledgeDocument {
    id: string;
    knowledgeBaseId: string;
    type: KnowledgeDocumentType;
    source: KnowledgeDocumentSource;
    title: string;
    content: string; // Raw text content
    sourceUrl?: string; // For links or file storage URLs
    driveMetadata?: GoogleDriveMetadata;
    metadata?: Record<string, any>;

    // Vector Search (Firestore Vector)
    embedding?: number[]; // Semantic vector (768 dimensions for text-embedding-004)
    tokenCount?: number;
    byteSize: number; // Track document size

    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}

// --- Usage Status ---
export interface KnowledgeUsageStatus {
    documentCount: number;
    totalBytes: number;
    limits: KnowledgeUsageLimits;
    isAtLimit: boolean;
    percentUsed: number;
}

// --- Zod Schemas for Actions ---

export const CreateKnowledgeBaseSchema = z.object({
    ownerId: z.string(),
    ownerType: z.enum(['system', 'brand', 'dispensary', 'customer']),
    name: z.string().min(3),
    description: z.string().optional(),
    systemInstructions: z.string().optional(),
});

export const AddDocumentSchema = z.object({
    knowledgeBaseId: z.string(),
    type: z.enum(['text', 'link', 'pdf', 'file']),
    source: z.enum(['paste', 'upload', 'drive', 'scrape']),
    title: z.string().min(1),
    content: z.string().min(10), // Minimum content to worth embedding
    sourceUrl: z.string().optional(),
    driveMetadata: z.object({
        fileId: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
        lastModified: z.date().optional(),
    }).optional(),
});

export const UploadDocumentSchema = z.object({
    knowledgeBaseId: z.string(),
    fileName: z.string(),
    mimeType: z.string(),
    base64Content: z.string(), // Base64 encoded file content
});

export const ScrapeUrlSchema = z.object({
    knowledgeBaseId: z.string(),
    url: z.string().url(),
    title: z.string().optional(),
});
