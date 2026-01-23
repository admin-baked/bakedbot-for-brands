/**
 * Artifact Types
 * 
 * Data model for the Artifacts feature - Claude/ChatGPT style
 * generated content display (code, research, decks, diagrams, etc.)
 */

import { z } from 'zod';

// ============ Artifact Types ============

export type ArtifactType =
    | 'code'           // Syntax-highlighted code
    | 'markdown'       // Rendered markdown content
    | 'research'       // Structured research report
    | 'deck'           // Presentation slides
    | 'diagram'        // Mermaid/flowcharts
    | 'chart'          // Data visualization
    | 'table'          // Structured data table
    | 'infographic'    // Visual infographic
    | 'image'          // Generated images
    // Inbox artifacts
    | 'carousel'       // Product carousel
    | 'bundle'         // Bundle deal
    | 'creative_post'; // Social media content

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
    // Inbox artifacts
    { type: 'carousel', label: 'Carousel', icon: 'Images' },
    { type: 'bundle', label: 'Bundle', icon: 'PackagePlus' },
    { type: 'creative_post', label: 'Social Post', icon: 'Palette' },
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
    chartData?: unknown;

    // For table artifacts
    headers?: string[];
    rows?: string[][];

    // For sharing
    isPublished?: boolean;
    shareId?: string;
    shareUrl?: string;

    // For inbox artifacts (carousel, bundle, creative_post)
    inboxData?: {
        // Common inbox artifact fields
        threadId?: string;
        orgId?: string;
        status?: 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected';
        rationale?: string;
        approvedBy?: string;
        approvedAt?: string;

        // Carousel-specific
        carousel?: {
            productIds: string[];
            displayOrder?: number;
            active?: boolean;
        };

        // Bundle-specific
        bundle?: {
            type: 'bogo' | 'mix_match' | 'percentage' | 'fixed_price' | 'tiered';
            products: Array<{
                productId: string;
                name: string;
                requiredQty: number;
                originalPrice: number;
                bundlePrice?: number;
            }>;
            originalTotal: number;
            bundlePrice: number;
            savingsPercent: number;
            marginImpact?: number;
        };

        // Creative post-specific
        creativePost?: {
            platform: 'instagram' | 'tiktok' | 'linkedin' | 'twitter' | 'facebook';
            caption: string;
            hashtags?: string[];
            mediaUrls?: string[];
            scheduledAt?: string;
            complianceStatus?: 'active' | 'warning' | 'review_needed' | 'rejected';
        };
    };
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
    'chart', 'table', 'infographic', 'image',
    // Inbox artifacts
    'carousel', 'bundle', 'creative_post'
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
    chartData: z.unknown().optional(),
    headers: z.array(z.string()).optional(),
    rows: z.array(z.array(z.string())).optional(),
    isPublished: z.boolean().optional(),
    shareId: z.string().optional(),
    shareUrl: z.string().url().optional(),
    // Inbox artifact metadata
    inboxData: z.object({
        threadId: z.string().optional(),
        orgId: z.string().optional(),
        status: z.enum(['draft', 'pending_review', 'approved', 'published', 'rejected']).optional(),
        rationale: z.string().optional(),
        approvedBy: z.string().optional(),
        approvedAt: z.string().optional(),
        carousel: z.object({
            productIds: z.array(z.string()),
            displayOrder: z.number().optional(),
            active: z.boolean().optional(),
        }).optional(),
        bundle: z.object({
            type: z.enum(['bogo', 'mix_match', 'percentage', 'fixed_price', 'tiered']),
            products: z.array(z.object({
                productId: z.string(),
                name: z.string(),
                requiredQty: z.number(),
                originalPrice: z.number(),
                bundlePrice: z.number().optional(),
            })),
            originalTotal: z.number(),
            bundlePrice: z.number(),
            savingsPercent: z.number(),
            marginImpact: z.number().optional(),
        }).optional(),
        creativePost: z.object({
            platform: z.enum(['instagram', 'tiktok', 'linkedin', 'twitter', 'facebook']),
            caption: z.string(),
            hashtags: z.array(z.string()).optional(),
            mediaUrls: z.array(z.string()).optional(),
            scheduledAt: z.string().optional(),
            complianceStatus: z.enum(['active', 'warning', 'review_needed', 'rejected']).optional(),
        }).optional(),
    }).optional(),
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

export function isCarouselArtifact(artifact: Artifact): boolean {
    return artifact.type === 'carousel';
}

export function isBundleArtifact(artifact: Artifact): boolean {
    return artifact.type === 'bundle';
}

export function isCreativePostArtifact(artifact: Artifact): boolean {
    return artifact.type === 'creative_post';
}

export function isInboxArtifact(artifact: Artifact): boolean {
    return ['carousel', 'bundle', 'creative_post'].includes(artifact.type);
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
            const id = createArtifactId();
            artifacts.push({
                id,
                type: type as ArtifactType,
                title: `Generated ${getArtifactLabel(type as ArtifactType)}`,
                content: innerContent.trim(),
                language,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            cleanedContent = cleanedContent.replace(fullMatch, `[View ${getArtifactLabel(type as ArtifactType)}](artifact://${id})`);
        }
    }

    // Parse block-style artifacts
    while ((match = ARTIFACT_BLOCK_PATTERN.exec(content)) !== null) {
        const [fullMatch, type, title, innerContent] = match;
        if (ARTIFACT_TYPES.some(t => t.type === type)) {
            const id = createArtifactId();
            const artifactType = type as ArtifactType;

            // Build the artifact with potential inbox metadata
            const artifact: Partial<Artifact> = {
                id,
                type: artifactType,
                title: title.trim(),
                content: innerContent.trim(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // Try to parse inbox artifact JSON content
            if (isInboxArtifactType(artifactType)) {
                const inboxData = parseInboxArtifactContent(artifactType, innerContent.trim());
                if (inboxData) {
                    artifact.metadata = { inboxData };
                }
            }

            artifacts.push(artifact);
            cleanedContent = cleanedContent.replace(fullMatch, `[View Artifact: ${title.trim()}](artifact://${id})`);
        }
    }

    return { artifacts, cleanedContent };
}

/**
 * Check if artifact type is an inbox type
 */
function isInboxArtifactType(type: ArtifactType): boolean {
    return ['carousel', 'bundle', 'creative_post'].includes(type);
}

/**
 * Parse inbox artifact content from JSON
 */
function parseInboxArtifactContent(
    type: ArtifactType,
    content: string
): ArtifactMetadata['inboxData'] | null {
    try {
        const parsed = JSON.parse(content);

        const baseData = {
            status: 'draft' as const,
            rationale: parsed.rationale,
        };

        switch (type) {
            case 'carousel':
                return {
                    ...baseData,
                    carousel: {
                        productIds: parsed.productIds || [],
                        displayOrder: parsed.displayOrder || 0,
                        active: false,
                    },
                };

            case 'bundle':
                return {
                    ...baseData,
                    bundle: {
                        type: parsed.type || 'fixed_price',
                        products: parsed.products || [],
                        originalTotal: parsed.originalTotal || 0,
                        bundlePrice: parsed.bundlePrice || 0,
                        savingsPercent: parsed.savingsPercent || 0,
                        marginImpact: parsed.marginAnalysis?.marginPercent,
                    },
                };

            case 'creative_post':
                return {
                    ...baseData,
                    creativePost: {
                        platform: parsed.platform || 'instagram',
                        caption: parsed.caption || '',
                        hashtags: parsed.hashtags,
                        mediaUrls: parsed.mediaUrls,
                        complianceStatus: parsed.complianceCheck?.status,
                    },
                };

            default:
                return null;
        }
    } catch {
        // Content is not valid JSON, return null
        return null;
    }
}
