/**
 * Project Types
 * 
 * Projects are enhanced knowledge bases that provide:
 * - Dedicated system instructions for AI context
 * - Associated chat history
 * - Quick access from agent chat UI
 * 
 * Modeled after ChatGPT Projects and Claude Projects.
 */

import { z } from 'zod';

// --- Project Interface ---
export interface Project {
    id: string;
    ownerId: string;              // userId who owns the project
    name: string;
    description?: string;
    systemInstructions?: string;  // Custom AI instructions
    
    // UI Metadata
    color?: string;               // Hex color for UI (e.g., "#10b981")
    icon?: string;                // Lucide icon name (e.g., "Briefcase")
    
    // Settings
    defaultModel?: string;        // Default intelligence level (lite, standard, etc.)
    
    // Stats
    documentCount: number;        // Number of KB documents
    totalBytes: number;           // Total storage used
    chatCount: number;            // Number of conversations
    
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    lastChatAt?: Date;            // Last conversation timestamp
    
    // Sharing
    isShared?: boolean;           // Share with team (future)
    sharedWith?: string[];        // List of userIds (future)
}

// --- Project Chat Interface ---
export interface ProjectChat {
    id: string;
    projectId: string;
    userId: string;
    title: string;                // Auto-generated or user-defined
    messageCount: number;
    createdAt: Date;
    updatedAt: Date;
}

// --- Project Document (extends KB document concept) ---
export interface ProjectDocument {
    id: string;
    projectId: string;
    type: 'text' | 'link' | 'pdf' | 'file' | 'image';
    title: string;
    content: string;              // Raw text content for embeddings
    sourceUrl?: string;           // For files/links
    mimeType?: string;
    byteSize: number;
    embedding?: number[];         // Vector for semantic search
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}

// --- Zod Schemas ---

export const CreateProjectSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    systemInstructions: z.string().max(10000).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    icon: z.string().max(50).optional(),
    defaultModel: z.string().optional(),
});

export const UpdateProjectSchema = z.object({
    projectId: z.string(),
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    systemInstructions: z.string().max(10000).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    icon: z.string().max(50).optional(),
    defaultModel: z.string().optional(),
});

export const AddProjectDocumentSchema = z.object({
    projectId: z.string(),
    type: z.enum(['text', 'link', 'pdf', 'file', 'image']),
    title: z.string().min(1).max(200),
    content: z.string().min(1),
    sourceUrl: z.string().url().optional(),
    mimeType: z.string().optional(),
});

// --- Type Exports for Inputs ---
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type AddProjectDocumentInput = z.infer<typeof AddProjectDocumentSchema>;

// --- Usage Limits ---
export const PROJECT_LIMITS: Record<string, { maxProjects: number; maxDocsPerProject: number }> = {
    free: { maxProjects: 3, maxDocsPerProject: 5 },
    claim_pro: { maxProjects: 10, maxDocsPerProject: 50 },
    starter: { maxProjects: 50, maxDocsPerProject: 200 },
    growth: { maxProjects: 100, maxDocsPerProject: 500 },
    scale: { maxProjects: 500, maxDocsPerProject: 1000 },
    enterprise: { maxProjects: Infinity, maxDocsPerProject: Infinity },
};

// --- Default Project Colors ---
export const PROJECT_COLORS = [
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
];

// --- Default Project Icons ---
export const PROJECT_ICONS = [
    'Briefcase',
    'Rocket',
    'Target',
    'Lightbulb',
    'BookOpen',
    'Code',
    'Megaphone',
    'ShieldCheck',
    'Palette',
    'LineChart',
];
