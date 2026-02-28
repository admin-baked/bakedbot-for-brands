/**
 * Peer Review Server Actions
 *
 * Handle peer review assignments, submissions, and management.
 */

'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp, FieldValue } from '@google-cloud/firestore';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import type { PeerReview, TrainingSubmission, RubricScore } from '@/types/training';

export type ActionResult<T = any> =
    | { success: true; data: T }
    | { success: false; error: string };

function isSuperRole(role: unknown): boolean {
    if (Array.isArray(role)) {
        return role.includes('super_user') || role.includes('super_admin');
    }
    return role === 'super_user' || role === 'super_admin';
}

function isValidDocId(id: string): boolean {
    return !!id && !id.includes('/');
}

const SubmitPeerReviewSchema = z.object({
    reviewId: z.string(),
    rating: z.number().min(1).max(5),
    strengths: z.array(z.string()).min(1, 'At least one strength required'),
    improvements: z.array(z.string()).min(1, 'At least one improvement required'),
    questions: z.array(z.string()).optional().default([]),
    wouldApprove: z.boolean(),
    rubricScores: z.array(
        z.object({
            category: z.string(),
            score: z.number().min(1).max(5),
            comment: z.string().optional(),
        })
    ),
    timeSpent: z.number().optional(), // Minutes
});

/**
 * Assign peer reviewers to a submission
 */
export async function assignPeerReviewers(
    submissionId: string,
    numReviewers: number = 2
): Promise<ActionResult<{ assignedReviewers: string[] }>> {
    try {
        await requireUser(['super_user']); // Only admins can manually assign
        const normalizedSubmissionId = submissionId.trim();
        if (!isValidDocId(normalizedSubmissionId)) {
            return { success: false, error: 'Invalid submission id' };
        }

        const db = getAdminFirestore();

        // Get submission
        const submissionDoc = await db.collection('trainingSubmissions').doc(normalizedSubmissionId).get();
        if (!submissionDoc.exists) {
            return { success: false, error: 'Submission not found' };
        }

        const submission = submissionDoc.data() as TrainingSubmission;

        // Check if already approved by Linus
        if (submission.status !== 'approved') {
            return { success: false, error: 'Only approved submissions can be peer reviewed' };
        }

        // Get eligible reviewers
        const eligibleReviewers = await getEligibleReviewers(
            submission.cohortId,
            submission.challengeId,
            submission.userId
        );

        if (eligibleReviewers.length < numReviewers) {
            return {
                success: false,
                error: `Not enough eligible reviewers. Found ${eligibleReviewers.length}, need ${numReviewers}`,
            };
        }

        // Calculate review loads
        const loads = await Promise.all(
            eligibleReviewers.map(async (reviewerId) => {
                const pending = await db
                    .collection('peerReviews')
                    .where('reviewerId', '==', reviewerId)
                    .where('status', '==', 'pending')
                    .count()
                    .get();

                return { reviewerId, load: pending.data().count };
            })
        );

        // Sort by load (assign to those with fewest pending)
        loads.sort((a, b) => a.load - b.load);

        // Select reviewers
        const selectedReviewers = loads.slice(0, numReviewers).map((l) => l.reviewerId);

        // Create peer review documents
        const reviewIds: string[] = [];
        for (const reviewerId of selectedReviewers) {
            const reviewRef = db.collection('peerReviews').doc();

            const review: PeerReview = {
                id: reviewRef.id,
                submissionId: normalizedSubmissionId,
                reviewerId,
                authorId: submission.userId,
                challengeId: submission.challengeId,
                cohortId: submission.cohortId,
                rating: 3, // Default
                strengths: [],
                improvements: [],
                questions: [],
                wouldApprove: false,
                rubricScores: [],
                assignedAt: Timestamp.now(),
                status: 'pending',
                helpfulVotes: 0,
                flagged: false,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };

            await reviewRef.set(review);
            reviewIds.push(reviewRef.id);

            // Update reviewer stats
            await db
                .collection('users')
                .doc(reviewerId)
                .collection('training')
                .doc('current')
                .update({
                    reviewsAssigned: FieldValue.increment(1),
                    updatedAt: Timestamp.now(),
                });
        }

        // Update submission
        await submissionDoc.ref.update({
            peerReviewsAssigned: numReviewers,
            peerReviewIds: reviewIds,
            peerReviewEnabled: true,
            updatedAt: Timestamp.now(),
        });

        logger.info('[Peer Review] Assigned reviewers', {
            submissionId: normalizedSubmissionId,
            reviewers: selectedReviewers,
        });

        revalidatePath('/dashboard/training');

        return { success: true, data: { assignedReviewers: selectedReviewers } };
    } catch (error) {
        logger.error('[Peer Review] Failed to assign reviewers', { error });
        return { success: false, error: 'Failed to assign reviewers' };
    }
}

/**
 * Get eligible reviewers for a submission
 */
async function getEligibleReviewers(
    cohortId: string,
    challengeId: string,
    authorId: string
): Promise<string[]> {
    const db = getAdminFirestore();

    // Get all users in cohort who have completed this challenge
    const usersSnapshot = await db.collectionGroup('training')
        .where('cohortId', '==', cohortId)
        .where('completedChallenges', 'array-contains', challengeId)
        .get();

    // Filter out the author
    return usersSnapshot.docs
        .map((doc) => doc.ref.parent.parent?.id)
        .filter((uid): uid is string => uid !== undefined && uid !== authorId);
}

/**
 * Submit peer review
 */
export async function submitPeerReview(
    input: z.infer<typeof SubmitPeerReviewSchema>
): Promise<ActionResult> {
    try {
        const user = await requireUser(['intern', 'super_user']);
        const validated = SubmitPeerReviewSchema.parse(input);
        const normalizedReviewId = validated.reviewId.trim();
        if (!isValidDocId(normalizedReviewId)) {
            return { success: false, error: 'Invalid review id' };
        }

        const db = getAdminFirestore();

        // Get review document
        const reviewDoc = await db.collection('peerReviews').doc(normalizedReviewId).get();
        if (!reviewDoc.exists) {
            return { success: false, error: 'Review not found' };
        }

        const review = reviewDoc.data() as PeerReview;

        // Verify reviewer
        if (review.reviewerId !== user.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        // Check if already completed
        if (review.status === 'completed') {
            return { success: false, error: 'Review already submitted' };
        }

        // Update review
        await reviewDoc.ref.update({
            rating: validated.rating,
            strengths: validated.strengths,
            improvements: validated.improvements,
            questions: validated.questions || [],
            wouldApprove: validated.wouldApprove,
            rubricScores: validated.rubricScores,
            timeSpent: validated.timeSpent,
            status: 'completed',
            submittedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });

        // Update submission peer review count
        await db
            .collection('trainingSubmissions')
            .doc(review.submissionId)
            .update({
                peerReviewsCompleted: FieldValue.increment(1),
                updatedAt: Timestamp.now(),
            });

        // Update reviewer stats
        await db
            .collection('users')
            .doc(user.uid)
            .collection('training')
            .doc('current')
            .update({
                reviewsCompleted: FieldValue.increment(1),
                lastActivityAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

        // Check for badges
        await checkAndAwardBadges(user.uid);

        logger.info('[Peer Review] Review submitted', {
            reviewId: normalizedReviewId,
            reviewerId: user.uid,
            rating: validated.rating,
        });

        revalidatePath('/dashboard/training');

        return { success: true, data: { reviewId: normalizedReviewId } };
    } catch (error) {
        logger.error('[Peer Review] Failed to submit review', { error });
        return { success: false, error: 'Failed to submit review' };
    }
}

/**
 * Get pending reviews for current user
 */
export async function getMyPendingReviews(): Promise<ActionResult<PeerReview[]>> {
    try {
        const user = await requireUser(['intern', 'super_user']);
        const db = getAdminFirestore();

        const reviewsSnapshot = await db
            .collection('peerReviews')
            .where('reviewerId', '==', user.uid)
            .where('status', '==', 'pending')
            .orderBy('assignedAt', 'asc')
            .get();

        const reviews = reviewsSnapshot.docs.map((doc) => doc.data() as PeerReview);

        return { success: true, data: reviews };
    } catch (error) {
        logger.error('[Peer Review] Failed to get pending reviews', { error });
        return { success: false, error: 'Failed to get pending reviews' };
    }
}

/**
 * Get reviews received for a submission
 */
export async function getReceivedReviews(submissionId: string): Promise<ActionResult<PeerReview[]>> {
    try {
        const user = await requireUser(['intern', 'super_user']);
        const normalizedSubmissionId = submissionId.trim();
        if (!isValidDocId(normalizedSubmissionId)) {
            return { success: false, error: 'Invalid submission id' };
        }

        const db = getAdminFirestore();

        // Verify ownership
        const submissionDoc = await db.collection('trainingSubmissions').doc(normalizedSubmissionId).get();
        if (!submissionDoc.exists) {
            return { success: false, error: 'Submission not found' };
        }

        const submission = submissionDoc.data() as TrainingSubmission;
        const isSuperUser = isSuperRole((user as { role?: unknown }).role);

        if (submission.userId !== user.uid && !isSuperUser) {
            return { success: false, error: 'Unauthorized' };
        }

        // Get reviews
        const reviewsSnapshot = await db
            .collection('peerReviews')
            .where('submissionId', '==', normalizedSubmissionId)
            .where('status', '==', 'completed')
            .get();

        const reviews = reviewsSnapshot.docs.map((doc) => doc.data() as PeerReview);

        return { success: true, data: reviews };
    } catch (error) {
        logger.error('[Peer Review] Failed to get received reviews', { error });
        return { success: false, error: 'Failed to get received reviews' };
    }
}

/**
 * Mark review as helpful
 */
export async function markReviewHelpful(reviewId: string): Promise<ActionResult> {
    try {
        const user = await requireUser(['intern', 'super_user']);
        const normalizedReviewId = reviewId.trim();
        if (!isValidDocId(normalizedReviewId)) {
            return { success: false, error: 'Invalid review id' };
        }

        const db = getAdminFirestore();

        const reviewDoc = await db.collection('peerReviews').doc(normalizedReviewId).get();
        if (!reviewDoc.exists) {
            return { success: false, error: 'Review not found' };
        }

        const review = reviewDoc.data() as PeerReview;

        // Verify it's for the user's submission
        const submissionDoc = await db.collection('trainingSubmissions').doc(review.submissionId).get();
        const submission = submissionDoc.data() as TrainingSubmission;

        if (submission.userId !== user.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        // Increment helpful votes
        await reviewDoc.ref.update({
            helpfulVotes: FieldValue.increment(1),
            updatedAt: Timestamp.now(),
        });

        // Update reviewer's average rating
        await updateReviewerRating(review.reviewerId);

        return { success: true, data: {} };
    } catch (error) {
        logger.error('[Peer Review] Failed to mark review helpful', { error });
        return { success: false, error: 'Failed to mark review helpful' };
    }
}

/**
 * Update reviewer's average rating
 */
async function updateReviewerRating(reviewerId: string): Promise<void> {
    const db = getAdminFirestore();

    // Get all completed reviews by this reviewer
    const reviewsSnapshot = await db
        .collection('peerReviews')
        .where('reviewerId', '==', reviewerId)
        .where('status', '==', 'completed')
        .get();

    if (reviewsSnapshot.empty) return;

    const reviews = reviewsSnapshot.docs.map((doc) => doc.data() as PeerReview);
    const totalVotes = reviews.reduce((sum, r) => sum + r.helpfulVotes, 0);
    const avgRating = totalVotes / reviews.length;

    // Update user stats
    await db
        .collection('users')
        .doc(reviewerId)
        .collection('training')
        .doc('current')
        .update({
            averageReviewRating: avgRating,
            updatedAt: Timestamp.now(),
        });
}

/**
 * Check and award badges based on review activity
 */
async function checkAndAwardBadges(userId: string): Promise<void> {
    const db = getAdminFirestore();

    const progressDoc = await db.collection('users').doc(userId).collection('training').doc('current').get();

    if (!progressDoc.exists) return;

    const progress = progressDoc.data()!;
    const badges: string[] = progress.reviewBadges || [];

    // Helpful Reviewer: 10+ helpful votes total
    if (progress.averageReviewRating >= 2 && !badges.includes('helpful-reviewer')) {
        badges.push('helpful-reviewer');
    }

    // Quick Responder: Complete 5+ reviews within 24 hours
    const quickReviews = await db
        .collection('peerReviews')
        .where('reviewerId', '==', userId)
        .where('status', '==', 'completed')
        .get();

    const quickCount = quickReviews.docs.filter((doc) => {
        const review = doc.data() as PeerReview;
        if (!review.submittedAt) return false;
        const hoursToComplete = (review.submittedAt.seconds - review.assignedAt.seconds) / 3600;
        return hoursToComplete <= 24;
    }).length;

    if (quickCount >= 5 && !badges.includes('quick-responder')) {
        badges.push('quick-responder');
    }

    // Master Reviewer: 50+ completed reviews
    if (progress.reviewsCompleted >= 50 && !badges.includes('master-reviewer')) {
        badges.push('master-reviewer');
    }

    // Update badges if changed
    if (badges.length > (progress.reviewBadges || []).length) {
        await progressDoc.ref.update({
            reviewBadges: badges,
            updatedAt: Timestamp.now(),
        });

        logger.info('[Peer Review] Badge awarded', { userId, badge: badges[badges.length - 1] });
    }
}

/**
 * Skip a peer review (with reason)
 */
export async function skipPeerReview(reviewId: string, reason: string): Promise<ActionResult> {
    try {
        const user = await requireUser(['intern', 'super_user']);
        const normalizedReviewId = reviewId.trim();
        if (!isValidDocId(normalizedReviewId)) {
            return { success: false, error: 'Invalid review id' };
        }
        const normalizedReason = reason.trim();
        if (!normalizedReason) {
            return { success: false, error: 'Skip reason required' };
        }
        if (normalizedReason.length > 500) {
            return { success: false, error: 'Skip reason too long' };
        }

        const db = getAdminFirestore();

        const reviewDoc = await db.collection('peerReviews').doc(normalizedReviewId).get();
        if (!reviewDoc.exists) {
            return { success: false, error: 'Review not found' };
        }

        const review = reviewDoc.data() as PeerReview;

        if (review.reviewerId !== user.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        // Update review status
        await reviewDoc.ref.update({
            status: 'skipped',
            updatedAt: Timestamp.now(),
            skipReason: normalizedReason,
        });

        logger.info('[Peer Review] Review skipped', { reviewId: normalizedReviewId, reason: normalizedReason });

        return { success: true, data: {} };
    } catch (error) {
        logger.error('[Peer Review] Failed to skip review', { error });
        return { success: false, error: 'Failed to skip review' };
    }
}
