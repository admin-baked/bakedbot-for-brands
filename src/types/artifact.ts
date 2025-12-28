/**
 * Artifact Types
 * 
 * Data model for the Artifacts feature - Claude/ChatGPT style
 * generated content display (code, research, decks, diagrams, etc.)
 */

import { z } from 'zod';

// ============ Artifact Types ============

export type ArtifactType = 
    | 'code'        // Syntax-highlighted code
    | 'markdown'    // Rendered markdown content
    | 'research'    // Structured research report
    | 'deck'        // Presentation slides
    | 'diagram'     // Mermaid/flowcharts
    | 'chart'       // Data visualization
    | 'table'       // Structured data table
    | 'infographic' // Visual infographic
    | 'image';      // Generated images

export const ARTIFACT_TYPES: { type: ArtifactType; label: string; icon: string }[] = [
    { type: 'code', label: 'Code', icon: 'Code' },
    { type: 'markdown', label: 'Document', icon: 'FileText' },
    { type: 'research', label: 'Research', icon: 'Search' },
    { type: 'deck', label: 'Presentation', icon: 'Presentation' },
    { type: 'diagram', label: 'Diagram', icon: 'GitBranch' },
    { type: 'chart', label: 'Chart', icon: 'BarChart2' },
    { type: 'table', label: 'Table', icon: 'Table' },
    { type: 'infographic', label: 'Infographic', icon: 'PieChart' },
    { type: 'image', label: 'Image', icon: 'Image' },
];

// ============ Artifact Interface ============

export interface Artifact {
    id: string;
    type: ArtifactType;
    title: string;
    content: string;
    language?: string;          // For code artifacts (e.g., 'typescript', 'python')
    metadata?: ArtifactMetadata;
    createdAt: Date;
    updatedAt: Date;
}

export interface ArtifactMetadata {
    // For research artifacts
    sources?: { title: string; url: string }[];
    summary?: string;
    
    // For deck artifacts
    slides?: { title: string; content: string }[];
    currentSlide?: number;
    
    // For diagram artifacts
    diagramType?: 'flowchart' | 'sequence' | 'class' | 'mindmap' | 'gantt';
    
    // For chart artifacts
    chartType?: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
    chartData?: any;
    
    // For table artifacts
    headers?: string[];
    rows?: string[][];
    
    // For sharing
    isPublished?: boolean;
    shareId?: string;
    shareUrl?: string;
}

// ============ Slides for Decks ============

export interface DeckSlide {
    id: string;
    title: string;
    content: string;
    notes?: string;
    layout?: 'title' | 'content' | 'split' | 'image';
}

// ============ Zod Schemas ============

export const ArtifactTypeSchema = z.enum([
    'code', 'markdown', 'research', 'deck', 'diagram', 
    'chart', 'table', 'infographic', 'image'
]);

export const ArtifactMetadataSchema = z.object({
    sources: z.array(z.object({
        title: z.string(),
        url: z.string().url()
    })).optional(),
    summary: z.string().optional(),
    slides: z.array(z.object({
        title: z.string(),
        content: z.string()
    })).optional(),
    currentSlide: z.number().optional(),
    diagramType: z.enum(['flowchart', 'sequence', 'class', 'mindmap', 'gantt']).optional(),
    chartType: z.enum(['bar', 'line', 'pie', 'area', 'scatter']).optional(),
    chartData: z.any().optional(),
    headers: z.array(z.string()).optional(),
    rows: z.array(z.array(z.string())).optional(),
    isPublished: z.boolean().optional(),
    shareId: z.string().optional(),
    shareUrl: z.string().url().optional(),
}).optional();

export const CreateArtifactSchema = z.object({
    type: ArtifactTypeSchema,
    title: z.string().min(1).max(200),
    content: z.string(),
    language: z.string().optional(),
    metadata: ArtifactMetadataSchema,
});

export const UpdateArtifactSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().optional(),
    metadata: ArtifactMetadataSchema,
});

// ============ Type Guards ============

export function isCodeArtifact(artifact: Artifact): boolean {
    return artifact.type === 'code';
}

export function isDeckArtifact(artifact: Artifact): boolean {
    return artifact.type === 'deck';
}

export function isDiagramArtifact(artifact: Artifact): boolean {
    return artifact.type === 'diagram';
}

export function isChartArtifact(artifact: Artifact): boolean {
    return artifact.type === 'chart';
}

// ============ Helper Functions ============

export function getArtifactIcon(type: ArtifactType): string {
    return ARTIFACT_TYPES.find(t => t.type === type)?.icon || 'File';
}

export function getArtifactLabel(type: ArtifactType): string {
    return ARTIFACT_TYPES.find(t => t.type === type)?.label || 'Unknown';
}

export function createArtifactId(): string {
    return `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============ Artifact Markers (for parsing agent responses) ============

/**
 * Marker format for artifacts in agent responses:
 * ```artifact:code:typescript
 * // code here
 * ```
 * 
 * Or for complex artifacts:
 * :::artifact:deck:My Presentation
 * Slide content...
 * :::
 */
export const ARTIFACT_CODE_PATTERN = /```artifact:(\w+)(?::(\w+))?\n([\s\S]*?)```/g;
export const ARTIFACT_BLOCK_PATTERN = /:::artifact:(\w+):([^\n]+)\n([\s\S]*?):::/g;

export function parseArtifactsFromContent(content: string): { artifacts: Partial<Artifact>[]; cleanedContent: string } {
    const artifacts: Partial<Artifact>[] = [];
    let cleanedContent = content;
    
    // Parse code-style artifacts
    let match;
    while ((match = ARTIFACT_CODE_PATTERN.exec(content)) !== null) {
        const [fullMatch, type, language, innerContent] = match;
        if (ARTIFACT_TYPES.some(t => t.type === type)) {
            artifacts.push({
                id: createArtifactId(),
                type: type as ArtifactType,
                title: `Generated ${getArtifactLabel(type as ArtifactType)}`,
                content: innerContent.trim(),
                language,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            cleanedContent = cleanedContent.replace(fullMatch, `[${getArtifactLabel(type as ArtifactType)}: Click to view]`);
        }
    }
    
    // Parse block-style artifacts
    while ((match = ARTIFACT_BLOCK_PATTERN.exec(content)) !== null) {
        const [fullMatch, type, title, innerContent] = match;
        if (ARTIFACT_TYPES.some(t => t.type === type)) {
            artifacts.push({
                id: createArtifactId(),
                type: type as ArtifactType,
                title: title.trim(),
                content: innerContent.trim(),
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            cleanedContent = cleanedContent.replace(fullMatch, `[${title.trim()}: Click to view]`);
        }
    }
    
    return { artifacts, cleanedContent };
}
