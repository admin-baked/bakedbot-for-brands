/**
 * Challenge Detail Page - Server Component
 *
 * Displays full challenge details, instructions, hints, and submission interface.
 */

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { notFound } from 'next/navigation';
import { ChallengeDetailClient } from './page-client';
import type { TrainingChallenge, TrainingSubmission, UserTrainingProgress } from '@/types/training';

interface ChallengePageProps {
    params: {
        id: string;
    };
}

export default async function ChallengePage({ params }: ChallengePageProps) {
    const user = await requireUser(['intern', 'super_user']);
    const db = getAdminFirestore();

    // Fetch challenge
    const challengeDoc = await db.collection('trainingChallenges').doc(params.id).get();

    if (!challengeDoc.exists) {
        notFound();
    }

    const challenge = challengeDoc.data() as TrainingChallenge;

    // Fetch user progress
    const progressDoc = await db.collection('users').doc(user.uid).collection('training').doc('current').get();

    if (!progressDoc.exists) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
                    <h2 className="text-lg font-semibold text-destructive">Not Enrolled</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        You need to be enrolled in a cohort to access challenges.
                    </p>
                </div>
            </div>
        );
    }

    const progress = progressDoc.data() as UserTrainingProgress;

    // Fetch user's previous submissions for this challenge
    const submissionsSnapshot = await db
        .collection('trainingSubmissions')
        .where('userId', '==', user.uid)
        .where('challengeId', '==', params.id)
        .orderBy('attemptNumber', 'desc')
        .limit(5)
        .get();

    const submissions = submissionsSnapshot.docs.map((doc) => doc.data() as TrainingSubmission);

    // Check if already completed
    const isCompleted = progress.completedChallenges.includes(params.id);
    const latestSubmission = submissions[0];

    return (
        <ChallengeDetailClient
            challenge={challenge}
            progress={progress}
            submissions={submissions}
            isCompleted={isCompleted}
            latestSubmission={latestSubmission}
        />
    );
}
