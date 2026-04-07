'use server';

/**
 * Public Review Server Action
 *
 * Allows customers to submit dispensary reviews from an email link
 * without requiring authentication. Uses visitId as verification token.
 */

import { z } from 'zod';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { Review, ReviewModeration } from '@/types/reviews';
import { MODERATION_PATTERNS } from '@/types/reviews';

const submitReviewSchema = z.object({
    orgId: z.string().min(1),
    visitId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
    text: z.string().trim().max(500).optional(),
});

export interface PublicReviewResult {
    success: boolean;
    reviewId?: string;
    error?: string;
}

function moderateText(text: string): { status: 'approved' | 'flagged'; reasons: string[] } {
    const reasons: string[] = [];
    for (const [type, regex] of Object.entries(MODERATION_PATTERNS)) {
        if (regex.test(text)) {
            reasons.push(type);
        }
    }
    return { status: reasons.length > 0 ? 'flagged' : 'approved', reasons };
}

/**
 * Submit a review using visitId as verification (no auth required).
 * The visitId proves the customer actually checked in.
 */
export async function submitPublicReview(
    params: z.infer<typeof submitReviewSchema>,
): Promise<PublicReviewResult> {
    try {
        const validated = submitReviewSchema.parse(params);
        const db = getAdminFirestore();

        // Verify visit exists and check for duplicate review in parallel
        const [visitSnap, existingReview] = await Promise.all([
            db.collection('checkin_visits')
                .where('visitId', '==', validated.visitId)
                .where('orgId', '==', validated.orgId)
                .limit(1)
                .get(),
            db.collection('reviews')
                .where('verificationEvidence.eventId', '==', validated.visitId)
                .limit(1)
                .get(),
        ]);

        if (visitSnap.empty) {
            return { success: false, error: 'Visit not found' };
        }

        if (!existingReview.empty) {
            return { success: false, error: 'You already left a review for this visit' };
        }

        const visitDoc = visitSnap.docs[0];
        const visitData = visitDoc.data();

        // Moderate text if provided
        let moderation: ReviewModeration = { status: 'approved' };
        if (validated.text) {
            const modResult = moderateText(validated.text);
            moderation = {
                status: modResult.status,
                reasons: modResult.reasons.length > 0 ? modResult.reasons : undefined,
            };
        }

        const now = new Date();
        const reviewData: Omit<Review, 'id'> = {
            entityType: 'dispensary',
            entityId: validated.orgId,
            userId: visitData.customerId || `visitor_${validated.visitId}`,
            verified: true,
            verificationEvidence: {
                type: 'checkout_routed',
                eventId: validated.visitId,
            },
            rating: validated.rating as 1 | 2 | 3 | 4 | 5,
            tags: validated.tags ?? [],
            text: validated.text,
            moderation,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection('reviews').add(reviewData);

        // Update aggregate and mark visit complete in parallel
        await Promise.all([
            updateReviewAggregate(db, validated.orgId, validated.rating),
            visitDoc.ref.update({
                'reviewSequence.reviewLeft': true,
                'reviewSequence.reviewLeftAt': now,
            }),
        ]);

        logger.info('[PublicReview] Review submitted', {
            reviewId: docRef.id,
            orgId: validated.orgId,
            visitId: validated.visitId,
            rating: validated.rating,
            moderationStatus: moderation.status,
        });

        return { success: true, reviewId: docRef.id };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors[0].message };
        }
        logger.error('[PublicReview] Failed to submit review', { error });
        return { success: false, error: 'Failed to submit review' };
    }
}

/**
 * Fetch approved dispensary reviews for public display (e.g., tablet check-in).
 * Excludes demo customer reviews (phone 312-684-0522).
 */
export async function getPublicReviews(
    orgId: string,
    limit = 5,
): Promise<{ reviews: Array<{ rating: number; text?: string; tags: string[]; firstName?: string; createdAt: string }>; avgRating: number; totalCount: number }> {
    try {
        const db = getAdminFirestore();

        const [snap, aggSnap] = await Promise.all([
            db.collection('reviews')
                .where('entityType', '==', 'dispensary')
                .where('entityId', '==', orgId)
                .where('moderation.status', '==', 'approved')
                .orderBy('createdAt', 'desc')
                .limit(limit * 2) // Fetch more to filter out demos
                .get(),
            db.collection('reviewAggregates')
                .doc(`dispensary_${orgId}`)
                .get(),
        ]);

        const aggData = aggSnap.exists ? aggSnap.data() : null;

        // Filter out demo customer reviews (phone 312-684-0522)
        const DEMO_PHONE_LAST4 = '0522';
        const reviews = snap.docs
            .map(doc => {
                const data = doc.data();
                return {
                    rating: data.rating,
                    text: data.text,
                    tags: data.tags ?? [],
                    firstName: data.firstName,
                    customerId: data.customerId,
                    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
                };
            })
            .filter(review => {
                // Check if customer is a demo customer
                if (review.customerId?.includes('demo') || review.firstName?.toLowerCase().includes('demo')) {
                    return false;
                }
                return true;
            })
            .slice(0, limit);

        return {
            reviews,
            avgRating: aggData?.avgRating ?? 0,
            totalCount: aggData?.countTotal ?? 0,
        };
    } catch (error) {
        logger.error('[PublicReview] Failed to fetch reviews', { error });
        return { reviews: [], avgRating: 0, totalCount: 0 };
    }
}

async function updateReviewAggregate(
    db: FirebaseFirestore.Firestore,
    orgId: string,
    newRating: number,
): Promise<void> {
    const aggRef = db.collection('reviewAggregates').doc(`dispensary_${orgId}`);
    const aggSnap = await aggRef.get();

    if (aggSnap.exists) {
        const data = aggSnap.data()!;
        const newTotal = (data.countTotal || 0) + 1;
        const newAvg = ((data.avgRating || 0) * (data.countTotal || 0) + newRating) / newTotal;
        const dist = data.ratingDistribution || {};
        dist[newRating] = (dist[newRating] || 0) + 1;

        await aggRef.update({
            avgRating: Math.round(newAvg * 10) / 10,
            countTotal: newTotal,
            countVerified: (data.countVerified || 0) + 1,
            ratingDistribution: dist,
            lastUpdatedAt: new Date(),
        });
    } else {
        await aggRef.set({
            entityType: 'dispensary',
            entityId: orgId,
            avgRating: newRating,
            countTotal: 1,
            countVerified: 1,
            tagHistogram: {},
            ratingDistribution: { [newRating]: 1 },
            lastUpdatedAt: new Date(),
        });
    }
}
