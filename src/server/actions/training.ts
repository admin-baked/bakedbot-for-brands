/**
 * Training Platform Server Actions
 *
 * Handles challenge submissions, progress tracking, and cohort management.
 * All actions require authentication and follow BakedBot patterns.
 */

'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import type {
    TrainingSubmission,
    UserTrainingProgress,
    TrainingChallenge,
    TrainingCohort,
} from '@/types/training';
import { submitForReview } from '@/server/services/training/linus-review';

/**
 * Standard action result type
 */
export type ActionResult<T = unknown> =
    | { success: true; data: T }
    | { success: false; error: string };

/**
 * Submit Challenge Schema
 */
const SubmitChallengeSchema = z.object({
    challengeId: z.string().min(1, 'Challenge ID required'),
    cohortId: z.string().min(1, 'Cohort ID required'),
    code: z.string().min(10, 'Code must be at least 10 characters'),
    language: z.string().default('typescript'),
    description: z.string().optional(),
});

type SubmitChallengeInput = z.infer<typeof SubmitChallengeSchema>;

/**
 * Submit a challenge solution for review
 *
 * Creates submission record, triggers Linus review, and updates progress on approval.
 *
 * @param input - Challenge submission data
 * @returns Submission ID on success
 */
export async function submitChallenge(
    input: SubmitChallengeInput
): Promise<ActionResult<{ submissionId: string }>> {
    try {
        // Auth check - allow interns and super users
        const user = await requireUser(['intern', 'super_user']);

        // Validate input
        const validated = SubmitChallengeSchema.parse(input);

        const db = getAdminFirestore();

        // Get challenge details
        const challengeDoc = await db.collection('trainingChallenges').doc(validated.challengeId).get();

        if (!challengeDoc.exists) {
            return { success: false, error: 'Challenge not found' };
        }

        const challenge = challengeDoc.data() as TrainingChallenge;

        // Count previous attempts for this challenge
        const previousSubmissions = await db
            .collection('trainingSubmissions')
            .where('userId', '==', user.uid)
            .where('challengeId', '==', validated.challengeId)
            .get();

        const attemptNumber = previousSubmissions.size + 1;

        logger.info('[Training] Creating submission', {
            userId: user.uid,
            challengeId: validated.challengeId,
            attemptNumber,
        });

        // Create submission record
        const submissionRef = db.collection('trainingSubmissions').doc();
        const submission: TrainingSubmission = {
            id: submissionRef.id,
            challengeId: validated.challengeId,
            userId: user.uid,
            cohortId: validated.cohortId,
            code: validated.code,
            language: validated.language,
            description: validated.description,
            status: 'reviewing',
            attemptNumber,
            submittedAt: Timestamp.now(),
            peerReviewsAssigned: 0,
            peerReviewsCompleted: 0,
            peerReviewIds: [],
            peerReviewEnabled: true,
        };

        await submissionRef.set(submission);

        // Trigger Linus review (async, fire-and-forget)
        // Don't await - let it run in background so user gets immediate feedback
        submitForReview(challenge, submission)
            .then(async (feedback) => {
                logger.info('[Training] Review complete, updating submission', {
                    submissionId: submission.id,
                    approved: feedback.approved,
                });

                // Update submission with feedback
                await submissionRef.update({
                    status: feedback.approved ? 'approved' : 'needs_revision',
                    linusFeedback: feedback,
                    reviewedAt: Timestamp.now(),
                });

                // Update user progress if approved
                if (feedback.approved) {
                    await updateUserProgress(user.uid, validated.challengeId);
                }
            })
            .catch((error) => {
                logger.error('[Training] Review failed', {
                    error,
                    submissionId: submission.id,
                });
                // Mark as failed but don't throw - let user see the submission
                submissionRef.update({
                    status: 'pending',
                }).catch(() => {});
            });

        revalidatePath('/dashboard/training');

        return {
            success: true,
            data: { submissionId: submissionRef.id },
        };
    } catch (error) {
        logger.error('[Training] Submit challenge failed', { error });

        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: `Validation failed: ${error.errors.map((e) => e.message).join(', ')}`,
            };
        }

        return {
            success: false,
            error: 'Failed to submit challenge. Please try again.',
        };
    }
}

/**
 * Update user progress after challenge approval
 *
 * @param userId - User UID
 * @param challengeId - Completed challenge ID
 */
async function updateUserProgress(userId: string, challengeId: string): Promise<void> {
    try {
        const db = getAdminFirestore();
        const progressRef = db.collection('users').doc(userId).collection('training').doc('current');

        const progressDoc = await progressRef.get();

        if (!progressDoc.exists) {
            logger.warn('[Training] User not enrolled, cannot update progress', {
                userId,
                challengeId,
            });
            return;
        }

        const progress = progressDoc.data() as UserTrainingProgress;

        // Add to completed challenges (avoid duplicates)
        if (!progress.completedChallenges.includes(challengeId)) {
            await progressRef.update({
                completedChallenges: [...progress.completedChallenges, challengeId],
                acceptedSubmissions: (progress.acceptedSubmissions || 0) + 1,
                lastActivityAt: Timestamp.now(),
            });

            logger.info('[Training] Progress updated', {
                userId,
                challengeId,
                totalCompleted: progress.completedChallenges.length + 1,
            });
        }
    } catch (error) {
        logger.error('[Training] Failed to update progress', { error, userId, challengeId });
        // Don't throw - progress update failure shouldn't block submission
    }
}

/**
 * Get user's training progress
 *
 * @returns Current progress data
 */
export async function getMyTrainingProgress(): Promise<ActionResult<UserTrainingProgress | null>> {
    try {
        const user = await requireUser(['intern', 'super_user']);

        const db = getAdminFirestore();
        const progressDoc = await db.collection('users').doc(user.uid).collection('training').doc('current').get();

        if (!progressDoc.exists) {
            // Not enrolled yet
            return { success: true, data: null };
        }

        const progress = progressDoc.data() as UserTrainingProgress;

        return { success: true, data: progress };
    } catch (error) {
        logger.error('[Training] Get progress failed', { error });
        return { success: false, error: 'Failed to get progress' };
    }
}

/**
 * Get a specific submission with feedback
 *
 * @param submissionId - Submission ID
 * @returns Submission data with Linus feedback
 */
export async function getSubmission(submissionId: string): Promise<ActionResult<TrainingSubmission>> {
    try {
        const user = await requireUser(['intern', 'super_user']);

        const db = getAdminFirestore();
        const submissionDoc = await db.collection('trainingSubmissions').doc(submissionId).get();

        if (!submissionDoc.exists) {
            return { success: false, error: 'Submission not found' };
        }

        const submission = submissionDoc.data() as TrainingSubmission;

        // Verify ownership (unless super user)
        const isSuperUser = (user as any).role?.includes('super_user');
        if (submission.userId !== user.uid && !isSuperUser) {
            return { success: false, error: 'Unauthorized' };
        }

        return { success: true, data: submission };
    } catch (error) {
        logger.error('[Training] Get submission failed', { error, submissionId });
        return { success: false, error: 'Failed to get submission' };
    }
}

/**
 * Get all submissions for a challenge (user's own)
 *
 * @param challengeId - Challenge ID
 * @returns List of submissions ordered by attempt number
 */
export async function getChallengeSubmissions(
    challengeId: string
): Promise<ActionResult<TrainingSubmission[]>> {
    try {
        const user = await requireUser(['intern', 'super_user']);

        const db = getAdminFirestore();
        const submissionsSnapshot = await db
            .collection('trainingSubmissions')
            .where('userId', '==', user.uid)
            .where('challengeId', '==', challengeId)
            .orderBy('attemptNumber', 'desc')
            .get();

        const submissions = submissionsSnapshot.docs.map((doc) => doc.data() as TrainingSubmission);

        return { success: true, data: submissions };
    } catch (error) {
        logger.error('[Training] Get challenge submissions failed', { error, challengeId });
        return { success: false, error: 'Failed to get submissions' };
    }
}

/**
 * Get challenge by ID
 *
 * @param challengeId - Challenge ID
 * @returns Challenge data
 */
export async function getChallenge(challengeId: string): Promise<ActionResult<TrainingChallenge>> {
    try {
        await requireUser(['intern', 'super_user']);

        const db = getAdminFirestore();
        const challengeDoc = await db.collection('trainingChallenges').doc(challengeId).get();

        if (!challengeDoc.exists) {
            return { success: false, error: 'Challenge not found' };
        }

        const challenge = challengeDoc.data() as TrainingChallenge;

        return { success: true, data: challenge };
    } catch (error) {
        logger.error('[Training] Get challenge failed', { error, challengeId });
        return { success: false, error: 'Failed to get challenge' };
    }
}

/**
 * Get all challenges for a week
 *
 * @param weekNumber - Week number (1-8)
 * @returns List of challenges
 */
export async function getWeekChallenges(weekNumber: number): Promise<ActionResult<TrainingChallenge[]>> {
    try {
        await requireUser(['intern', 'super_user']);

        const db = getAdminFirestore();
        const challengesSnapshot = await db
            .collection('trainingChallenges')
            .where('weekNumber', '==', weekNumber)
            .orderBy('order', 'asc')
            .get();

        const challenges = challengesSnapshot.docs.map((doc) => doc.data() as TrainingChallenge);

        return { success: true, data: challenges };
    } catch (error) {
        logger.error('[Training] Get week challenges failed', { error, weekNumber });
        return { success: false, error: 'Failed to get challenges' };
    }
}

/**
 * Enroll user in a cohort (Admin only for MVP)
 *
 * @param userId - User to enroll
 * @param cohortId - Cohort to join
 * @returns Success status
 */
export async function enrollInCohort(userId: string, cohortId: string): Promise<ActionResult<void>> {
    try {
        // Only super users can enroll people
        await requireUser(['super_user']);

        const db = getAdminFirestore();

        // Get cohort
        const cohortDoc = await db.collection('trainingCohorts').doc(cohortId).get();

        if (!cohortDoc.exists) {
            return { success: false, error: 'Cohort not found' };
        }

        const cohort = cohortDoc.data() as TrainingCohort;

        // Check capacity
        if (cohort.participantIds.length >= cohort.maxParticipants) {
            return { success: false, error: 'Cohort is full' };
        }

        // Add to cohort
        await cohortDoc.ref.update({
            participantIds: [...cohort.participantIds, userId],
        });

        // Initialize user progress
        const progressRef = db.collection('users').doc(userId).collection('training').doc('current');

        const initialProgress: UserTrainingProgress = {
            cohortId,
            programId: cohort.programId,
            enrolledAt: Timestamp.now(),
            currentWeek: 1,
            completedChallenges: [],
            totalSubmissions: 0,
            acceptedSubmissions: 0,
            weeklyProgress: [],
            certificateEarned: false,
            lastActivityAt: Timestamp.now(),
            status: 'active',
            reviewsCompleted: 0,
            reviewsAssigned: 0,
            averageReviewRating: 0,
            reviewBadges: [],
        };

        await progressRef.set(initialProgress);

        logger.info('[Training] User enrolled in cohort', {
            userId,
            cohortId,
        });

        return { success: true, data: undefined };
    } catch (error) {
        logger.error('[Training] Enrollment failed', { error, userId, cohortId });
        return { success: false, error: 'Failed to enroll' };
    }
}

/**
 * Get cohort details
 *
 * @param cohortId - Cohort ID
 * @returns Cohort data
 */
export async function getCohort(cohortId: string): Promise<ActionResult<TrainingCohort>> {
    try {
        await requireUser(['intern', 'super_user']);

        const db = getAdminFirestore();
        const cohortDoc = await db.collection('trainingCohorts').doc(cohortId).get();

        if (!cohortDoc.exists) {
            return { success: false, error: 'Cohort not found' };
        }

        const cohort = cohortDoc.data() as TrainingCohort;

        return { success: true, data: cohort };
    } catch (error) {
        logger.error('[Training] Get cohort failed', { error, cohortId });
        return { success: false, error: 'Failed to get cohort' };
    }
}
