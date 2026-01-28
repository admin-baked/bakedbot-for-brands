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
 * Social media engagement metrics
 * Tracks performance across platforms with platform-agnostic and platform-specific metrics
 */
export interface EngagementMetrics {
    /** Total impressions (how many times content was displayed) */
    impressions: number;

    /** Total reach (unique users who saw the content) */
    reach: number;

    /** Total likes/reactions */
    likes: number;

    /** Total comments */
    comments: number;

    /** Total shares/reposts */
    shares: number;

    /** Total saves/bookmarks */
    saves: number;

    /** Click-through rate (percentage) */
    clickThroughRate?: number;

    /** Engagement rate (percentage) = (likes + comments + shares) / impressions * 100 */
    engagementRate: number;

    /** Last time metrics were synced from platform */
    lastSyncedAt?: string;

    /** Platform-specific metrics */
    platformSpecific?: {
        /** Instagram-specific */
        instagram?: {
            profileVisits?: number;
            websiteClicks?: number;
            storyReplies?: number;
            reelPlays?: number;
        };

        /** TikTok-specific */
        tiktok?: {
            videoViews?: number;
            averageWatchTime?: number;
            completionRate?: number;
            soundUses?: number;
        };

        /** LinkedIn-specific */
        linkedin?: {
            postClicks?: number;
            followerGains?: number;
            companyPageViews?: number;
        };
    };

    /** Time-series data for historical tracking */
    historicalData?: EngagementSnapshot[];
}

/**
 * Snapshot of engagement metrics at a specific point in time
 */
export interface EngagementSnapshot {
    timestamp: string;
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
}

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

    /** QR code data URL (PNG) */
    qrDataUrl?: string;

    /** QR code SVG for vector graphics */
    qrSvg?: string;

    /** Content landing page URL */
    contentUrl?: string;

    /** QR code scan tracking */
    qrStats?: {
        scans: number;
        lastScanned?: Date;
        scansByPlatform?: Record<string, number>;
        scansByLocation?: Record<string, number>;
    };

    /** Social media engagement metrics */
    engagementMetrics?: EngagementMetrics;

    /** External platform post ID (for syncing metrics) */
    externalPostId?: string;
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
