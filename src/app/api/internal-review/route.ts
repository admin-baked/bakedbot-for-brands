import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const submitReviewSchema = z.object({
    orgId: z.string().min(1),
    customerId: z.string().min(1),
    visitId: z.string().optional(),
    rating: z.number().min(1).max(5),
    mood: z.string().optional(),
    tags: z.array(z.string()).optional(),
    feedback: z.string().optional(),
});

export const dynamic = 'force-dynamic';

/**
 * POST - Submit an internal review
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = submitReviewSchema.parse(body);
        const { orgId, customerId, visitId, rating, mood, tags, feedback } = validated;

        const { getAdminFirestore } = await import('@/firebase/admin');
        const db = getAdminFirestore();
        const now = new Date();
        const reviewRef = db.collection(`tenants/${orgId}/internal_reviews`).doc();

        await reviewRef.set({
            id: reviewRef.id,
            orgId,
            customerId,
            visitId: visitId ?? null,
            rating,
            mood: mood ?? null,
            tags: tags ?? [],
            feedback: feedback ?? null,
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
                const newRatings = [...existingRatings, rating].slice(-20);
                const avgRating = newRatings.reduce((a, b) => a + b, 0) / newRatings.length;
                await customerRef.update({
                    internalReviewRatings: newRatings,
                    avgInternalRating: avgRating,
                    lastInternalReviewAt: now,
                });
            }
        } catch {
            // Non-critical
        }

        logger.info('[InternalReview API] Review submitted', { orgId, customerId, rating });

        return NextResponse.json({ success: true, reviewId: reviewRef.id });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Invalid input' }, { status: 400 });
        }
        logger.error('[InternalReview API] POST failed', { error: String(error) });
        return NextResponse.json({ success: false, error: 'Failed to submit review' }, { status: 500 });
    }
}
