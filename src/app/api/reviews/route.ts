// src/app/api/reviews/route.ts
/**
 * Reviews API
 * Create and fetch first-party reviews
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/monitoring';
import { cookies } from 'next/headers';
import type {
    Review,
    ReviewAggregate,
    CreateReviewRequest,
    CreateReviewResponse,
    GetReviewsRequest,
    GetReviewsResponse,
    ModerationResult,
} from '@/types/reviews';
import { MODERATION_PATTERNS } from '@/types/reviews';

// ============== POST: Create Review ==============

export async function POST(request: NextRequest) {
    try {
        const body: CreateReviewRequest = await request.json();
        const { entityType, entityId, rating, tags, text, verificationEventId } = body;

        // Get user ID from session
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Validate required fields
        if (!entityType || !entityId || !rating) {
            return NextResponse.json(
                { success: false, error: 'entityType, entityId, and rating are required' },
                { status: 400 }
            );
        }

        if (rating < 1 || rating > 5) {
            return NextResponse.json(
                { success: false, error: 'Rating must be between 1 and 5' },
                { status: 400 }
            );
        }

        const firestore = getAdminFirestore();

        // Check for duplicate review
        const existingReview = await firestore.collection('reviews')
            .where('userId', '==', userId)
            .where('entityType', '==', entityType)
            .where('entityId', '==', entityId)
            .limit(1)
            .get();

        if (!existingReview.empty) {
            return NextResponse.json(
                { success: false, error: 'You have already reviewed this' },
                { status: 409 }
            );
        }

        // Run moderation
        const moderationResult = await moderateReview(text || '');

        // Check for verification
        let verified = false;
        let verificationEvidence = undefined;

        if (verificationEventId) {
            const event = await firestore.collection('events').doc(verificationEventId).get();
            if (event.exists && event.data()?.userId === userId) {
                verified = true;
                verificationEvidence = {
                    type: 'checkout_routed' as const,
                    eventId: verificationEventId,
                };
            }
        }

        // Create review
        const reviewRef = firestore.collection('reviews').doc();
        const now = new Date();

        const review: Review = {
            id: reviewRef.id,
            entityType,
            entityId,
            userId,
            verified,
            verificationEvidence,
            rating: rating as 1 | 2 | 3 | 4 | 5,
            tags: tags || [],
            text,
            moderation: {
                status: moderationResult.approved ? 'approved' : 'pending',
                reasons: moderationResult.reasons,
                reviewedAt: moderationResult.approved ? now : undefined,
            },
            createdAt: now,
        };

        await reviewRef.set(review);

        // Update aggregate if approved
        if (moderationResult.approved) {
            await updateReviewAggregate(firestore, entityType, entityId);
        }

        // Log event
        await firestore.collection('events').add({
            type: 'reviewCreated',
            userId,
            payload: { reviewId: review.id, entityType, entityId, rating },
            createdAt: now,
        });

        logger.info('Review created', { reviewId: review.id, userId, entityType, entityId });

        const response: CreateReviewResponse = {
            success: true,
            reviewId: review.id,
            status: review.moderation.status,
        };

        return NextResponse.json(response);

    } catch (error: any) {
        logger.error('Create review failed:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// ============== GET: Fetch Reviews ==============

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const entityType = searchParams.get('entityType');
        const entityId = searchParams.get('entityId');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = parseInt(searchParams.get('offset') || '0');
        const verifiedOnly = searchParams.get('verifiedOnly') === 'true';

        if (!entityType || !entityId) {
            return NextResponse.json(
                { success: false, error: 'entityType and entityId are required' },
                { status: 400 }
            );
        }

        const firestore = getAdminFirestore();

        // Build query
        let query = firestore.collection('reviews')
            .where('entityType', '==', entityType)
            .where('entityId', '==', entityId)
            .where('moderation.status', '==', 'approved')
            .orderBy('createdAt', 'desc');

        if (verifiedOnly) {
            query = query.where('verified', '==', true);
        }

        // Get total count
        const countSnapshot = await query.count().get();
        const total = countSnapshot.data().count;

        // Get reviews
        const snapshot = await query.offset(offset).limit(limit).get();
        const reviews = snapshot.docs.map(doc => doc.data() as Review);

        // Get aggregate
        const aggregateDoc = await firestore
            .collection('reviewAggregates')
            .doc(`${entityType}_${entityId}`)
            .get();

        const aggregate = aggregateDoc.exists ? aggregateDoc.data() as ReviewAggregate : undefined;

        const response: GetReviewsResponse = {
            success: true,
            reviews,
            aggregate,
            total,
        };

        return NextResponse.json(response);

    } catch (error: any) {
        logger.error('Get reviews failed:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// ============== Moderation ==============

async function moderateReview(text: string): Promise<ModerationResult> {
    const reasons: string[] = [];
    let confidence = 1.0;

    if (!text) {
        return { approved: true, reasons: [], confidence: 1.0 };
    }

    // Check for profanity
    if (MODERATION_PATTERNS.profanity.test(text)) {
        reasons.push('Contains profanity');
        confidence *= 0.3;
    }

    // Check for medical claims
    if (MODERATION_PATTERNS.medicalClaims.test(text)) {
        reasons.push('Contains medical claims');
        confidence *= 0.2;
    }

    // Check for personal info
    if (MODERATION_PATTERNS.personalInfo.test(text)) {
        reasons.push('Contains personal information');
        confidence *= 0.1;
    }

    // Check for spam patterns
    if (MODERATION_PATTERNS.spam.test(text)) {
        reasons.push('Contains spam patterns');
        confidence *= 0.4;
    }

    // Auto-approve if confidence is high
    const approved = reasons.length === 0;

    return { approved, reasons, confidence };
}

// ============== Aggregate Updates ==============

async function updateReviewAggregate(
    firestore: FirebaseFirestore.Firestore,
    entityType: string,
    entityId: string
) {
    const reviews = await firestore.collection('reviews')
        .where('entityType', '==', entityType)
        .where('entityId', '==', entityId)
        .where('moderation.status', '==', 'approved')
        .get();

    if (reviews.empty) return;

    let totalRating = 0;
    let verifiedCount = 0;
    const tagHistogram: Record<string, number> = {};
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    reviews.docs.forEach(doc => {
        const review = doc.data() as Review;
        totalRating += review.rating;
        if (review.verified) verifiedCount++;
        ratingDistribution[review.rating]++;
        review.tags.forEach(tag => {
            tagHistogram[tag] = (tagHistogram[tag] || 0) + 1;
        });
    });

    const aggregate: ReviewAggregate = {
        entityType: entityType as any,
        entityId,
        avgRating: totalRating / reviews.size,
        countTotal: reviews.size,
        countVerified: verifiedCount,
        tagHistogram,
        ratingDistribution: ratingDistribution as any,
        lastUpdatedAt: new Date(),
    };

    await firestore
        .collection('reviewAggregates')
        .doc(`${entityType}_${entityId}`)
        .set(aggregate);
}
