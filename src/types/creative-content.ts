/**
 * Creative Content Types
 *
 * Defines types for the Creative Command Center - managing social media
 * content generation, approval workflows, and publishing.
 */

/**
 * Supported social media platforms
 */
export type SocialPlatform = 'instagram' | 'tiktok' | 'linkedin' | 'twitter' | 'facebook';

/**
 * Compliance status from Deebo (Compliance Agent)
 */
export type ComplianceStatus = 'active' | 'warning' | 'review_needed' | 'rejected';

/**
 * Content approval status
 */
export type ContentStatus = 'draft' | 'pending' | 'approved' | 'revision' | 'scheduled' | 'published' | 'failed';

/**
 * Media type for content
 */
export type MediaType = 'image' | 'video' | 'carousel' | 'text';

/**
 * Base interface for all creative content items
 */
export interface CreativeContentBase {
    id: string;
    tenantId: string;
    brandId: string;
    platform: SocialPlatform;
    status: ContentStatus;
    complianceStatus: ComplianceStatus;

    /** Caption/text content */
    caption: string;

    /** Optional hashtags */
    hashtags?: string[];

    /** Media URLs (images/videos) */
    mediaUrls: string[];

    /** Thumbnail for preview */
    thumbnailUrl?: string;

    /** Media type */
    mediaType: MediaType;

    /** AI model used for generation */
    generatedBy: 'nano-banana' | 'nano-banana-pro' | 'manual';

    /** Prompt used to generate content */
    generationPrompt?: string;

    /** Scheduled publish time (ISO timestamp) */
    scheduledAt?: string;

    /** Actually published timestamp */
    publishedAt?: string;

    /** Creator (user or agent) */
    createdBy: string;

    /** Creation timestamp */
    createdAt: number;

    /** Last update timestamp */
    updatedAt: number;

    /** Compliance checks that passed/failed */
    complianceChecks?: ComplianceCheck[];

    /** Revision notes if sent back for edit */
    revisionNotes?: RevisionNote[];
}

/**
 * Compliance check result
 */
export interface ComplianceCheck {
    checkType: string;
    passed: boolean;
    message?: string;
    checkedAt: number;
}

/**
 * Revision note from reviewer
 */
export interface RevisionNote {
    note: string;
    requestedBy: string;
    requestedAt: number;
}

/**
 * Instagram-specific content
 */
export interface InstagramContent extends CreativeContentBase {
    platform: 'instagram';
    /** Post type: feed, story, reel */
    postType: 'feed' | 'story' | 'reel';
    /** Aspect ratio for display */
    aspectRatio?: '1:1' | '4:5' | '9:16';
}

/**
 * TikTok-specific content
 */
export interface TikTokContent extends CreativeContentBase {
    platform: 'tiktok';
    /** Audio/sound info */
    audioName?: string;
    audioUrl?: string;
    /** Duration in seconds */
    duration?: number;
}

/**
 * LinkedIn-specific content
 */
export interface LinkedInContent extends CreativeContentBase {
    platform: 'linkedin';
    /** Author info for display */
    authorName: string;
    authorTitle: string;
    authorImageUrl?: string;
}

/**
 * Union type for all content types
 */
export type CreativeContent = InstagramContent | TikTokContent | LinkedInContent | CreativeContentBase;

/**
 * Content queue item for approval UI
 */
export interface ContentQueueItem {
    id: string;
    content: CreativeContent;
    priority: number;
    addedAt: number;
}

/**
 * Request to generate new content
 */
export interface GenerateContentRequest {
    tenantId: string;
    brandId: string;
    platform: SocialPlatform;
    prompt: string;
    style?: 'professional' | 'playful' | 'educational' | 'hype';
    includeHashtags?: boolean;
    targetAudience?: string;
    /** Product reference if applicable */
    productId?: string;
    productName?: string;
    /** Brand assets */
    brandVoice?: string;
    logoUrl?: string;
    /** Tier for image generation */
    tier?: 'free' | 'paid' | 'super';
}

/**
 * Response from content generation
 */
export interface GenerateContentResponse {
    content: CreativeContent;
    variations?: CreativeContent[];
    complianceResult: {
        status: ComplianceStatus;
        checks: ComplianceCheck[];
    };
}

/**
 * Approval action
 */
export interface ApproveContentRequest {
    contentId: string;
    tenantId: string;
    approverId: string;
    scheduledAt?: string;
}

/**
 * Revision request
 */
export interface ReviseContentRequest {
    contentId: string;
    tenantId: string;
    requesterId: string;
    note: string;
}

/**
 * Content generation batch (for multi-platform campaigns)
 */
export interface ContentBatch {
    id: string;
    tenantId: string;
    brandId: string;
    name: string;
    contentIds: string[];
    campaignId?: string;
    createdAt: number;
    status: 'draft' | 'pending' | 'approved' | 'published';
}
