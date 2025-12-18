/**
 * First-Party Reviews Types
 * Types for BakedBot's own review system
 */

// ============== Review Types ==============

export type ReviewEntityType = 'dispensary' | 'product' | 'brand';
export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export interface Review {
    id: string;
    entityType: ReviewEntityType;
    entityId: string;
    userId: string;

    // Verification
    verified: boolean;
    verificationEvidence?: {
        type: 'checkout_routed' | 'draft_cart' | 'partner_ref';
        eventId?: string;
        draftCartId?: string;
    };

    // Content
    rating: 1 | 2 | 3 | 4 | 5;
    tags: string[];
    text?: string;

    // Moderation
    moderation: ReviewModeration;

    // Timestamps
    createdAt: Date;
    updatedAt?: Date;
}

export interface ReviewModeration {
    status: ModerationStatus;
    reasons?: string[];
    reviewedAt?: Date;
    reviewedBy?: string;
}

// ============== Review Aggregates ==============

export interface ReviewAggregate {
    entityType: ReviewEntityType;
    entityId: string;
    avgRating: number;
    countTotal: number;
    countVerified: number;
    tagHistogram: Record<string, number>;
    ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
    lastUpdatedAt: Date;
}

// ============== API Types ==============

export interface CreateReviewRequest {
    entityType: ReviewEntityType;
    entityId: string;
    rating: 1 | 2 | 3 | 4 | 5;
    tags?: string[];
    text?: string;
    verificationEventId?: string;
}

export interface CreateReviewResponse {
    success: boolean;
    reviewId?: string;
    status?: ModerationStatus;
    error?: string;
}

export interface GetReviewsRequest {
    entityType: ReviewEntityType;
    entityId: string;
    limit?: number;
    offset?: number;
    verifiedOnly?: boolean;
}

export interface GetReviewsResponse {
    success: boolean;
    reviews: Review[];
    aggregate?: ReviewAggregate;
    total: number;
}

// ============== Moderation ==============

export interface ModerationResult {
    approved: boolean;
    reasons: string[];
    confidence: number;
}

// Prohibited patterns for moderation
export const MODERATION_PATTERNS = {
    // Profanity (basic - would use a library in production)
    profanity: /\b(f\*{2,3}|sh\*t|a\*s|damn|hell|crap)\b/i,

    // Medical claims (cannabis cannot make medical claims)
    medicalClaims: /\b(cure|treat|heal|medicine|prescription|doctor|diagnos|therap)\w*\b/i,

    // Personal info
    personalInfo: /\b(\d{3}[-.]?\d{3}[-.]?\d{4}|[\w.]+@[\w.]+\.\w+)\b/i,

    // Spam patterns
    spam: /\b(click here|visit|www\.|http|buy now|discount code)\b/i,
} as const;


// ============== Tags ==============

export const REVIEW_TAGS = {
    dispensary: [
        'Fast Service',
        'Friendly Staff',
        'Clean Store',
        'Good Selection',
        'Fair Prices',
        'Great Deals',
        'Knowledgeable',
        'Easy Parking',
    ],
    product: [
        'Strong Effects',
        'Smooth Smoke',
        'Great Flavor',
        'Good Value',
        'Long Lasting',
        'Fast Acting',
        'Relaxing',
        'Energizing',
    ],
    brand: [
        'Consistent Quality',
        'Great Packaging',
        'Clean Labs',
        'Good Prices',
        'Love the Brand',
        'Recommend',
    ],
} as const;
