/**
 * Training Admin Dashboard
 *
 * Instructor view for managing training program, cohorts, and monitoring progress.
 * Requires super_user role.
 */

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { TrainingAdminClient } from './page-client';
import type { TrainingCohort, UserTrainingProgress, TrainingSubmission } from '@/types/training';

export default async function TrainingAdminPage() {
    // Only super users can access
    await requireUser(['super_user']);

    const db = getAdminFirestore();

    // Fetch all cohorts
    const cohortsSnapshot = await db.collection('trainingCohorts').orderBy('startDate', 'desc').get();
    const cohorts = cohortsSnapshot.docs.map((doc) => doc.data() as TrainingCohort);

    // Fetch recent submissions (last 50)
    const submissionsSnapshot = await db
        .collection('trainingSubmissions')
        .orderBy('submittedAt', 'desc')
        .limit(50)
        .get();
    const recentSubmissions = submissionsSnapshot.docs.map((doc) => doc.data() as TrainingSubmission);

    // Fetch all active participants
    const usersSnapshot = await db.collectionGroup('training').where('status', '==', 'active').get();
    const activeParticipants = usersSnapshot.size;

    // Calculate stats
    const totalSubmissions = await db.collection('trainingSubmissions').count().get();
    const approvedSubmissions = await db
        .collection('trainingSubmissions')
        .where('status', '==', 'approved')
        .count()
        .get();

    const stats = {
        totalCohorts: cohorts.length,
        activeParticipants,
        totalSubmissions: totalSubmissions.data().count,
        approvedSubmissions: approvedSubmissions.data().count,
        approvalRate:
            totalSubmissions.data().count > 0
                ? Math.round((approvedSubmissions.data().count / totalSubmissions.data().count) * 100)
                : 0,
    };

    return <TrainingAdminClient cohorts={cohorts} recentSubmissions={recentSubmissions} stats={stats} />;
}

export const metadata = {
    title: 'Training Admin - BakedBot',
    description: 'Manage training program and monitor intern progress',
};
