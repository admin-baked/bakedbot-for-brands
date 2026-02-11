/**
 * Media Generation Types
 *
 * Defines types for tracking image and video generation costs,
 * usage analytics, and provider-specific configurations.
 */

/**
 * Media generation provider options
 */
export type MediaProvider = 'gemini-flash' | 'gemini-pro' | 'veo' | 'sora';

/**
 * Type of media being generated
 */
export type MediaGenerationType = 'image' | 'video' | 'image_edit';

/**
 * Tracks a single media generation event for cost and usage analytics
 */
export interface MediaGenerationEvent {
    /** Unique identifier for this event */
    id: string;

    /** Tenant/org that generated this media */
    tenantId: string;

    /** User who triggered the generation */
    userId: string;

    /** Type of media generated */
    type: MediaGenerationType;

    /** Provider/model used */
    provider: MediaProvider;

    /** Specific model ID (e.g., 'gemini-3-pro-image-preview', 'veo-3.1-generate-preview') */
    model: string;

    /** Prompt used for generation */
    prompt: string;

    /** Input tokens (for text-based generation) */
    inputTokens?: number;

    /** Output tokens (for text-based generation) */
    outputTokens?: number;

    /** Video duration in seconds */
    durationSeconds?: number;

    /** Image/video resolution (e.g., '1280x720') */
    resolution?: string;

    /** Aspect ratio (e.g., '16:9', '9:16', '1:1') */
    aspectRatio?: string;

    /** Calculated cost in USD */
    costUsd: number;

    /** Generation timestamp */
    createdAt: number;

    /** Whether generation succeeded */
    success: boolean;

    /** Error message if generation failed */
    errorMessage?: string;

    /** Associated content ID (if saved to creative content) */
    contentId?: string;

    /** Playbook run ID (if triggered by playbook) */
    playbookRunId?: string;

    /** Additional metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Cost estimate for a media generation request
 */
export interface MediaCostEstimate {
    /** Provider being used */
    provider: MediaProvider;

    /** Specific model */
    model: string;

    /** Estimated cost in USD */
    estimatedCostUsd: number;

    /** Cost breakdown */
    breakdown: {
        /** Input token cost */
        inputTokens?: { count: number; cost: number };
        /** Output token cost */
        outputTokens?: { count: number; cost: number };
        /** Image generation cost */
        imageCost?: number;
        /** Video generation cost */
        videoCost?: number;
    };
}

/**
 * Pricing constants for media generation
 * NOTE: These are estimates based on public pricing as of 2026-02.
 * Actual costs may vary based on usage tiers and agreements.
 */
export const MEDIA_PRICING = {
    // Gemini Image Models
    'gemini-flash': {
        perImage: 0.02, // Gemini 2.5 Flash Image
    },
    'gemini-pro': {
        perImage: 0.04, // Gemini 3 Pro Image
    },

    // Video Models
    'veo': {
        per4Seconds: 0.50, // Veo 3.1 - 4 second video
        per6Seconds: 0.625, // Veo 3.1 - 6 second video
        per8Seconds: 0.75, // Veo 3.1 - 8 second video
    },
    'sora': {
        per4Seconds: 0.50, // Sora 2 - 4 second video
        per8Seconds: 1.00, // Sora 2 - 8 second video
    },
} as const;

/**
 * Aggregated usage statistics for a tenant
 */
export interface MediaUsageStats {
    /** Tenant ID */
    tenantId: string;

    /** Time period for stats */
    period: {
        start: Date;
        end: Date;
    };

    /** Total cost in USD */
    totalCostUsd: number;

    /** Total generation count */
    totalGenerations: number;

    /** Successful generation count */
    successfulGenerations: number;

    /** Failed generation count */
    failedGenerations: number;

    /** Breakdown by provider */
    byProvider: Record<MediaProvider, {
        count: number;
        costUsd: number;
    }>;

    /** Breakdown by type */
    byType: Record<MediaGenerationType, {
        count: number;
        costUsd: number;
    }>;

    /** Daily trend data */
    dailyTrend: Array<{
        date: string; // ISO date string (YYYY-MM-DD)
        count: number;
        costUsd: number;
    }>;
}

/**
 * Configuration for media cost alerts
 */
export interface MediaCostAlert {
    /** Alert ID */
    id: string;

    /** Tenant ID */
    tenantId: string;

    /** Alert type */
    type: 'daily_limit' | 'weekly_limit' | 'monthly_limit' | 'single_generation';

    /** Threshold in USD */
    thresholdUsd: number;

    /** Whether alert is enabled */
    enabled: boolean;

    /** Notification channels */
    notifyChannels: Array<'email' | 'inbox' | 'webhook'>;

    /** Email addresses for notifications */
    notifyEmails?: string[];

    /** Webhook URL for notifications */
    webhookUrl?: string;

    /** Created timestamp */
    createdAt: number;

    /** Last updated timestamp */
    updatedAt: number;

    /** Last triggered timestamp */
    lastTriggeredAt?: number;
}

/**
 * Budget configuration for a tenant
 */
export interface MediaBudget {
    /** Budget ID */
    id: string;

    /** Tenant ID */
    tenantId: string;

    /** Daily budget limit in USD */
    dailyLimitUsd?: number;

    /** Weekly budget limit in USD */
    weeklyLimitUsd?: number;

    /** Monthly budget limit in USD */
    monthlyLimitUsd?: number;

    /** Hard limit - stops generation when exceeded */
    hardLimit: boolean;

    /** Soft limit - sends alerts but allows generation */
    softLimit: boolean;

    /** Percentage threshold for soft limit warnings (e.g., 80 = warn at 80%) */
    softLimitPercentage: number;

    /** Whether budget is enabled */
    enabled: boolean;

    /** Created timestamp */
    createdAt: number;

    /** Last updated timestamp */
    updatedAt: number;
}

/**
 * Alert notification that was sent
 */
export interface MediaCostAlertNotification {
    /** Notification ID */
    id: string;

    /** Alert ID that triggered this */
    alertId: string;

    /** Tenant ID */
    tenantId: string;

    /** Current spend in USD */
    currentSpendUsd: number;

    /** Threshold that was exceeded */
    thresholdUsd: number;

    /** Period (daily, weekly, monthly) */
    period: string;

    /** Notification channels used */
    channels: Array<'email' | 'inbox' | 'webhook'>;

    /** Sent timestamp */
    sentAt: number;

    /** Delivery status */
    status: 'sent' | 'failed' | 'pending';

    /** Error message if failed */
    errorMessage?: string;
}

/**
 * Budget status check result
 */
export interface BudgetCheckResult {
    /** Whether budget allows generation */
    allowed: boolean;

    /** Current period spend */
    currentSpendUsd: number;

    /** Daily limit and status */
    daily?: {
        limitUsd: number;
        spendUsd: number;
        remainingUsd: number;
        percentUsed: number;
        exceeded: boolean;
    };

    /** Weekly limit and status */
    weekly?: {
        limitUsd: number;
        spendUsd: number;
        remainingUsd: number;
        percentUsed: number;
        exceeded: boolean;
    };

    /** Monthly limit and status */
    monthly?: {
        limitUsd: number;
        spendUsd: number;
        remainingUsd: number;
        percentUsed: number;
        exceeded: boolean;
    };

    /** Reasons why generation is blocked (if any) */
    blockReasons: string[];

    /** Warnings to show user */
    warnings: string[];
}

/**
 * Result from a media generation with cost tracking
 */
export interface TrackedMediaResult {
    /** Generated media URL */
    mediaUrl: string;

    /** Thumbnail URL (for videos) */
    thumbnailUrl?: string;

    /** Duration in seconds (for videos) */
    duration?: number;

    /** The tracking event that was recorded */
    trackingEvent: MediaGenerationEvent;
}

/**
 * Options for generating media with tracking
 */
export interface TrackedGenerationOptions {
    /** Tenant ID for tracking */
    tenantId: string;

    /** User ID for tracking */
    userId: string;

    /** Associated content ID */
    contentId?: string;

    /** Playbook run ID */
    playbookRunId?: string;

    /** Additional metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Video generation input (unified interface)
 */
export interface GenerateVideoInput {
    /** Text prompt describing the video */
    prompt: string;

    /** Aspect ratio */
    aspectRatio?: '16:9' | '9:16' | '1:1';

    /** Duration in seconds (as string for API compatibility) */
    duration?: '5' | '10' | '15' | '30';

    /** Preferred provider */
    provider?: 'veo' | 'sora';
}

/**
 * Video generation output (unified interface)
 */
export interface GenerateVideoOutput {
    /** Public URL to the generated video */
    videoUrl: string;

    /** Thumbnail URL if available */
    thumbnailUrl?: string;

    /** Actual duration in seconds */
    duration: number;
}

/**
 * Image generation input (unified interface)
 */
export interface GenerateImageInput {
    /** Text prompt describing the image */
    prompt: string;

    /** Aspect ratio */
    aspectRatio?: '1:1' | '4:5' | '16:9' | '9:16';

    /** Style preset */
    style?: 'professional' | 'playful' | 'modern' | 'vintage' | 'luxury';

    /** Brand watermark to include */
    watermarkUrl?: string;

    /** Tier for quality/cost */
    tier?: 'free' | 'paid' | 'super';
}

/**
 * Image generation output (unified interface)
 */
export interface GenerateImageOutput {
    /** Public URL to the generated image */
    imageUrl: string;
}

/**
 * Image edit input
 */
export interface EditImageInput {
    /** Source image URL to edit */
    sourceImageUrl: string;

    /** Edit instruction/prompt */
    editPrompt: string;

    /** Type of edit */
    editType: 'inpaint' | 'outpaint' | 'style_transfer' | 'object_removal' | 'enhance';

    /** Mask image URL for inpainting */
    maskImageUrl?: string;

    /** Tier for quality/cost */
    tier?: 'free' | 'paid' | 'super';
}

/**
 * Image edit output
 */
export interface EditImageOutput {
    /** Edited image URL */
    imageUrl: string;

    /** Original image URL for comparison */
    originalUrl: string;
}
