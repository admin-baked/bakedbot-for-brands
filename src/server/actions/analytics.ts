/**
 * Analytics Server Actions
 *
 * Data aggregation and analytics for training platform
 */

'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { logger } from '@/lib/logger';
import type { UserTrainingProgress, TrainingSubmission, PeerReview } from '@/types/training';

export type ActionResult<T = any> =
    | { success: true; data: T }
    | { success: false; error: string };

/**
 * Cohort Analytics
 */
export interface CohortAnalytics {
    cohortId: string;
    cohortName: string;

    // Enrollment
    totalInterns: number;
    activeInterns: number;
    completedInterns: number;
    droppedInterns: number;

    // Progress
    averageWeek: number;
    averageCompletionRate: number; // Percentage
    weekDistribution: Record<number, number>; // Week number -> count

    // Submissions
    totalSubmissions: number;
    approvedSubmissions: number;
    needsRevisionSubmissions: number;
    approvalRate: number;

    // Peer reviews
    peerReviewParticipation: number; // Percentage of interns with 3+ reviews
    averageReviewsPerIntern: number;
    averageReviewRating: number;

    // Performance
    averageLinusScore: number;
    averageTimeToCompletion: number; // Days
}

/**
 * Get cohort analytics
 */
export async function getCohortAnalytics(cohortId: string): Promise<ActionResult<CohortAnalytics>> {
    try {
        await requireUser(['super_user']);

        const db = getAdminFirestore();

        // Get cohort
        const cohortDoc = await db.collection('trainingCohorts').doc(cohortId).get();
        if (!cohortDoc.exists) {
            return { success: false, error: 'Cohort not found' };
        }

        const cohort = cohortDoc.data()!;

        // Get all participants' progress
        const progressSnapshot = await db.collectionGroup('training')
            .where('cohortId', '==', cohortId)
            .get();

        const participants = progressSnapshot.docs.map((doc) => ({
            userId: doc.ref.parent.parent!.id,
            ...doc.data(),
        })) as (UserTrainingProgress & { userId: string })[];

        // Calculate stats
        const totalInterns = participants.length;
        const activeInterns = participants.filter((p) => p.status === 'active').length;
        const completedInterns = participants.filter((p) => p.status === 'completed').length;
        const droppedInterns = participants.filter((p) => p.status === 'dropped').length;

        const averageWeek = totalInterns > 0
            ? participants.reduce((sum, p) => sum + p.currentWeek, 0) / totalInterns
            : 0;

        const averageCompletionRate = totalInterns > 0
            ? participants.reduce((sum, p) => sum + (p.completedChallenges.length / 40), 0) / totalInterns * 100
            : 0;

        // Week distribution
        const weekDistribution: Record<number, number> = {};
        for (let i = 1; i <= 8; i++) {
            weekDistribution[i] = participants.filter((p) => p.currentWeek === i).length;
        }

        // Submission stats
        const submissionsSnapshot = await db.collection('trainingSubmissions')
            .where('cohortId', '==', cohortId)
            .get();

        const submissions = submissionsSnapshot.docs.map((doc) => doc.data() as TrainingSubmission);

        const totalSubmissions = submissions.length;
        const approvedSubmissions = submissions.filter((s) => s.status === 'approved').length;
        const needsRevisionSubmissions = submissions.filter((s) => s.status === 'needs_revision').length;
        const approvalRate = totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0;

        // Peer review stats
        const peerReviewParticipation = totalInterns > 0
            ? participants.filter((p) => p.reviewsCompleted >= 3).length / totalInterns * 100
            : 0;

        const averageReviewsPerIntern = totalInterns > 0
            ? participants.reduce((sum, p) => sum + p.reviewsCompleted, 0) / totalInterns
            : 0;

        const averageReviewRating = totalInterns > 0
            ? participants.reduce((sum, p) => sum + (p.averageReviewRating || 0), 0) / totalInterns
            : 0;

        // Performance metrics
        const submissionsWithScores = submissions.filter((s) => s.linusFeedback?.overallScore);
        const averageLinusScore = submissionsWithScores.length > 0
            ? submissionsWithScores.reduce((sum, s) => sum + (s.linusFeedback?.overallScore || 0), 0) / submissionsWithScores.length
            : 0;

        // Average time to completion (for completed interns)
        const completedParticipants = participants.filter((p) => p.status === 'completed');
        const averageTimeToCompletion = completedParticipants.length > 0
            ? completedParticipants.reduce((sum, p) => {
                const days = (Date.now() - p.enrolledAt.seconds * 1000) / (1000 * 60 * 60 * 24);
                return sum + days;
            }, 0) / completedParticipants.length
            : 0;

        const analytics: CohortAnalytics = {
            cohortId,
            cohortName: cohort.name,
            totalInterns,
            activeInterns,
            completedInterns,
            droppedInterns,
            averageWeek: Math.round(averageWeek * 10) / 10,
            averageCompletionRate: Math.round(averageCompletionRate),
            weekDistribution,
            totalSubmissions,
            approvedSubmissions,
            needsRevisionSubmissions,
            approvalRate: Math.round(approvalRate),
            peerReviewParticipation: Math.round(peerReviewParticipation),
            averageReviewsPerIntern: Math.round(averageReviewsPerIntern * 10) / 10,
            averageReviewRating: Math.round(averageReviewRating * 10) / 10,
            averageLinusScore: Math.round(averageLinusScore),
            averageTimeToCompletion: Math.round(averageTimeToCompletion),
        };

        return { success: true, data: analytics };
    } catch (error) {
        logger.error('[Analytics] Failed to get cohort analytics', { error });
        return { success: false, error: 'Failed to get analytics' };
    }
}

/**
 * Challenge Analytics
 */
export interface ChallengeAnalytics {
    challengeId: string;
    challengeTitle: string;
    weekNumber: number;

    // Participation
    totalAttempts: number;
    uniqueAttemptors: number;
    completionRate: number; // Percentage

    // Performance
    averageAttempts: number; // Average attempts to approval
    averageScore: number; // Average Linus score
    passRateFirstAttempt: number; // Percentage

    // Time
    averageTimeToComplete: number; // Minutes

    // Common issues
    commonFailureReasons: string[];
}

/**
 * Get challenge analytics
 */
export async function getChallengeAnalytics(challengeId: string): Promise<ActionResult<ChallengeAnalytics>> {
    try {
        await requireUser(['super_user']);

        const db = getAdminFirestore();

        // Get challenge
        const challengeDoc = await db.collection('trainingChallenges').doc(challengeId).get();
        if (!challengeDoc.exists) {
            return { success: false, error: 'Challenge not found' };
        }

        const challenge = challengeDoc.data()!;

        // Get all submissions for this challenge
        const submissionsSnapshot = await db.collection('trainingSubmissions')
            .where('challengeId', '==', challengeId)
            .get();

        const submissions = submissionsSnapshot.docs.map((doc) => doc.data() as TrainingSubmission);

        // Calculate stats
        const totalAttempts = submissions.length;
        const uniqueAttemptors = new Set(submissions.map((s) => s.userId)).size;

        const approvedSubmissions = submissions.filter((s) => s.status === 'approved');
        const completionRate = uniqueAttemptors > 0
            ? (new Set(approvedSubmissions.map((s) => s.userId)).size / uniqueAttemptors) * 100
            : 0;

        // Average attempts to approval (per user)
        const userAttempts: Record<string, number> = {};
        submissions.forEach((s) => {
            userAttempts[s.userId] = Math.max(userAttempts[s.userId] || 0, s.attemptNumber);
        });
        const averageAttempts = Object.keys(userAttempts).length > 0
            ? Object.values(userAttempts).reduce((sum, a) => sum + a, 0) / Object.keys(userAttempts).length
            : 0;

        // Average score
        const submissionsWithScores = submissions.filter((s) => s.linusFeedback?.overallScore);
        const averageScore = submissionsWithScores.length > 0
            ? submissionsWithScores.reduce((sum, s) => sum + (s.linusFeedback?.overallScore || 0), 0) / submissionsWithScores.length
            : 0;

        // Pass rate on first attempt
        const firstAttempts = submissions.filter((s) => s.attemptNumber === 1);
        const firstAttemptApprovals = firstAttempts.filter((s) => s.status === 'approved');
        const passRateFirstAttempt = firstAttempts.length > 0
            ? (firstAttemptApprovals.length / firstAttempts.length) * 100
            : 0;

        // Average time to complete (submissions with timestamps)
        const completedSubmissions = submissions.filter((s) => s.status === 'approved' && s.reviewedAt);
        const averageTimeToComplete = completedSubmissions.length > 0
            ? completedSubmissions.reduce((sum, s) => {
                const minutes = (s.reviewedAt!.seconds - s.submittedAt.seconds) / 60;
                return sum + minutes;
            }, 0) / completedSubmissions.length
            : 0;

        // Common failure reasons (from Linus feedback)
        const failedSubmissions = submissions.filter((s) => s.status === 'needs_revision' && s.linusFeedback);
        const failureReasons: Record<string, number> = {};

        failedSubmissions.forEach((s) => {
            s.linusFeedback?.improvements.forEach((improvement) => {
                const key = improvement.substring(0, 50); // First 50 chars as key
                failureReasons[key] = (failureReasons[key] || 0) + 1;
            });
        });

        const commonFailureReasons = Object.entries(failureReasons)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map((entry) => entry[0]);

        const analytics: ChallengeAnalytics = {
            challengeId,
            challengeTitle: challenge.title,
            weekNumber: challenge.weekNumber,
            totalAttempts,
            uniqueAttemptors,
            completionRate: Math.round(completionRate),
            averageAttempts: Math.round(averageAttempts * 10) / 10,
            averageScore: Math.round(averageScore),
            passRateFirstAttempt: Math.round(passRateFirstAttempt),
            averageTimeToComplete: Math.round(averageTimeToComplete),
            commonFailureReasons,
        };

        return { success: true, data: analytics };
    } catch (error) {
        logger.error('[Analytics] Failed to get challenge analytics', { error });
        return { success: false, error: 'Failed to get analytics' };
    }
}

/**
 * Get at-risk interns (behind schedule or low engagement)
 */
export async function getAtRiskInterns(cohortId: string): Promise<ActionResult<Array<{
    userId: string;
    userName: string;
    currentWeek: number;
    completedChallenges: number;
    lastActivityDaysAgo: number;
    riskFactors: string[];
}>>> {
    try {
        await requireUser(['super_user']);

        const db = getAdminFirestore();

        // Get all participants
        const progressSnapshot = await db.collectionGroup('training')
            .where('cohortId', '==', cohortId)
            .where('status', '==', 'active')
            .get();

        const atRiskInterns = [];

        for (const doc of progressSnapshot.docs) {
            const progress = doc.data() as UserTrainingProgress;
            const userId = doc.ref.parent.parent!.id;

            const riskFactors: string[] = [];

            // Check if behind schedule (< 75% expected completion)
            const expectedWeek = Math.floor((Date.now() - progress.enrolledAt.seconds * 1000) / (7 * 24 * 60 * 60 * 1000)) + 1;
            if (progress.currentWeek < expectedWeek * 0.75) {
                riskFactors.push('Behind schedule');
            }

            // Check last activity
            const lastActivityDaysAgo = (Date.now() - progress.lastActivityAt.seconds * 1000) / (24 * 60 * 60 * 1000);
            if (lastActivityDaysAgo > 7) {
                riskFactors.push('Inactive for 7+ days');
            }

            // Check low approval rate
            const approvalRate = progress.totalSubmissions > 0
                ? (progress.acceptedSubmissions / progress.totalSubmissions) * 100
                : 0;
            if (progress.totalSubmissions >= 3 && approvalRate < 50) {
                riskFactors.push('Low approval rate');
            }

            // Check peer review participation
            if (progress.reviewsAssigned > 0 && progress.reviewsCompleted / progress.reviewsAssigned < 0.5) {
                riskFactors.push('Low peer review participation');
            }

            if (riskFactors.length > 0) {
                const userDoc = await db.collection('users').doc(userId).get();
                const userData = userDoc.data();

                atRiskInterns.push({
                    userId,
                    userName: userData?.displayName || userData?.email || 'Unknown',
                    currentWeek: progress.currentWeek,
                    completedChallenges: progress.completedChallenges.length,
                    lastActivityDaysAgo: Math.round(lastActivityDaysAgo),
                    riskFactors,
                });
            }
        }

        // Sort by number of risk factors (highest first)
        atRiskInterns.sort((a, b) => b.riskFactors.length - a.riskFactors.length);

        return { success: true, data: atRiskInterns };
    } catch (error) {
        logger.error('[Analytics] Failed to get at-risk interns', { error });
        return { success: false, error: 'Failed to get at-risk interns' };
    }
}
