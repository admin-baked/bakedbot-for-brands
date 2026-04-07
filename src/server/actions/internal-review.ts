'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const internalReviewSchema = z.object({
    orgId: z.string().min(1),
    customerId: z.string().min(1),
    visitId: z.string().optional(),
    rating: z.number().min(1).max(5),
    mood: z.string().optional(),
    tags: z.array(z.string()).optional(),
    feedback: z.string().optional(),
});

export interface InternalReview {
    id: string;
    orgId: string;
    customerId: string;
    visitId?: string;
    rating: number;
    mood?: string;
    tags: string[];
    feedback?: string;
    createdAt: Date;
}

/**
 * Submit an internal review after a visit (for recommendation improvement)
 */
export async function submitInternalReview(
    orgId: string,
    customerId: string,
    visitId: string | undefined,
    rating: number,
    mood?: string,
    tags?: string[],
    feedback?: string,
): Promise<{ success: boolean; reviewId?: string; error?: string }> {
    try {
        const validated = internalReviewSchema.parse({
            orgId,
            customerId,
            visitId,
            rating,
            mood,
            tags,
            feedback,
        });

        const db = getAdminFirestore();
        const now = new Date();
        const reviewRef = db.collection(`tenants/${orgId}/internal_reviews`).doc();

        await reviewRef.set({
            id: reviewRef.id,
            orgId: validated.orgId,
            customerId: validated.customerId,
            visitId: validated.visitId ?? null,
            rating: validated.rating,
            mood: validated.mood ?? null,
            tags: validated.tags ?? [],
            feedback: validated.feedback ?? null,
            createdAt: now,
            updatedAt: now,
        });

        // Update customer profile with average rating
        try {
            const customerRef = db.collection('customers').doc(customerId);
            const customerSnap = await customerRef.get();
            if (customerSnap.exists) {
                const data = customerSnap.data();
                const existingRatings = data?.internalReviewRatings ?? [];
                const newRatings = [...existingRatings, rating].slice(-20); // Keep last 20
                const avgRating = newRatings.reduce((a, b) => a + b, 0) / newRatings.length;
                await customerRef.update({
                    internalReviewRatings: newRatings,
                    avgInternalRating: avgRating,
                    lastInternalReviewAt: now,
                });
            }
        } catch {
            // Non-critical - don't fail the review submission
        }

        logger.info('[InternalReview] Review submitted', {
            orgId,
            customerId,
            visitId,
            rating,
        });

        return { success: true, reviewId: reviewRef.id };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors[0]?.message || 'Invalid input' };
        }
        logger.error('[InternalReview] Failed to submit review', { orgId, customerId, error: String(error) });
        return { success: false, error: 'Failed to submit review' };
    }
}

/**
 * Get internal reviews for an org
 */
export async function getInternalReviews(
    orgId: string,
    limit = 20,
): Promise<{ success: boolean; reviews?: InternalReview[]; error?: string }> {
    try {
        const db = getAdminFirestore();
        const snap = await db.collection(`tenants/${orgId}/internal_reviews`)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const reviews: InternalReview[] = snap.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                orgId: d.orgId,
                customerId: d.customerId,
                visitId: d.visitId,
                rating: d.rating,
                mood: d.mood,
                tags: d.tags ?? [],
                feedback: d.feedback,
                createdAt: d.createdAt?.toDate?.() ?? new Date(d.createdAt),
            };
        });

        return { success: true, reviews };
    } catch (error) {
        logger.error('[InternalReview] Failed to fetch reviews', { orgId, error: String(error) });
        return { success: false, error: 'Failed to fetch reviews' };
    }
}

/**
 * Get average internal rating for an org
 */
export async function getOrgInternalRating(
    orgId: string,
): Promise<{ success: boolean; avgRating?: number; reviewCount?: number; error?: string }> {
    try {
        const db = getAdminFirestore();
        const snap = await db.collection(`tenants/${orgId}/internal_reviews`)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        if (snap.empty) {
            return { success: true, avgRating: 0, reviewCount: 0 };
        }

        const ratings = snap.docs.map(d => d.data().rating as number);
        const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

        return { success: true, avgRating, reviewCount: ratings.length };
    } catch (error) {
        logger.error('[InternalReview] Failed to get org rating', { orgId, error: String(error) });
        return { success: false, error: 'Failed to get rating' };
    }
}

/**
 * Get internal review ratings for a customer (for recommendation context)
 */
export async function getCustomerInternalRatings(
    orgId: string,
    customerId: string,
): Promise<{ success: boolean; avgRating?: number; ratings?: number[]; error?: string }> {
    try {
        const db = getAdminFirestore();
        const snap = await db.collection(`tenants/${orgId}/internal_reviews`)
            .where('customerId', '==', customerId)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (snap.empty) {
            return { success: true, avgRating: undefined, ratings: [] };
        }

        const ratings = snap.docs.map(d => d.data().rating as number);
        const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

        return { success: true, avgRating, ratings };
    } catch (error) {
        logger.error('[InternalReview] Failed to get customer ratings', { orgId, customerId, error: String(error) });
        return { success: false, error: 'Failed to get ratings' };
    }
}
