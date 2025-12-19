
import { z } from 'zod';

export type KnowledgeBaseOwnerType = 'brand' | 'agent' | 'system';

export interface KnowledgeBase {
    id: string;
    ownerId: string; // brandId or agentId
    ownerType: KnowledgeBaseOwnerType;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    documentCount: number;
    enabled: boolean;
}

export type KnowledgeDocumentType = 'text' | 'link' | 'pdf' | 'file';

export interface KnowledgeDocument {
    id: string;
    knowledgeBaseId: string;
    type: KnowledgeDocumentType;
    title: string;
    content: string; // Raw text content
    sourceUrl?: string; // For links or file storage URLs
    metadata?: Record<string, any>;

    // Vector Search
    embedding?: number[]; // Semantic vector
    tokenCount?: number;

    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}

// --- Zod Schemas for Actions ---

export const CreateKnowledgeBaseSchema = z.object({
    ownerId: z.string(),
    ownerType: z.enum(['brand', 'agent', 'system']),
    name: z.string().min(3),
    description: z.string().optional(),
});

export const AddDocumentSchema = z.object({
    knowledgeBaseId: z.string(),
    type: z.enum(['text', 'link', 'pdf', 'file']),
    title: z.string().min(1),
    content: z.string().min(10), // Minimum content to worth embedding
    sourceUrl: z.string().optional(),
});
