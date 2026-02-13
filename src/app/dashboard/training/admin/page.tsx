/**
 * Training Admin Dashboard
 *
 * Instructor view for managing training program, cohorts, and monitoring progress.
 * Requires super_user role.
 */

import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { TrainingAdminClient } from './page-client';
import type { TrainingCohort, UserTrainingProgress, TrainingSubmission } from '@/types/training';

export default async function TrainingAdminPage() {
    // Wrap entire component in try-catch to prevent crashes
    try {
        // Only super users can access
        let user;
        try {
            user = await requireUser(['super_user']);
            console.log('[Training Admin] User authenticated successfully:', {
                uid: user.uid,
                email: user.email,
                role: user.role,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            // Not authorized - redirect to main dashboard
            console.error('[Training Admin] Auth check failed:', {
                error: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                } : error,
                timestamp: new Date().toISOString(),
            });
            redirect('/super-admin');
        }

        const db = getAdminFirestore();

        // Fetch all cohorts
        let cohortsSnapshot;
        try {
            cohortsSnapshot = await db.collection('trainingCohorts').orderBy('startDate', 'desc').get();
            console.log('[Training Admin] Cohorts fetched:', {
                count: cohortsSnapshot.docs.length,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('[Training Admin] Failed to fetch cohorts:', {
                error: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                } : error,
                timestamp: new Date().toISOString(),
            });
            return (
                <div className="container mx-auto px-4 py-8">
                    <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
                        <h2 className="text-lg font-semibold text-destructive">Database Error</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Failed to load training cohorts. Please try again later or contact support.
                        </p>
                    </div>
                </div>
            );
        }

    const cohorts = cohortsSnapshot.docs.map((doc) => {
        const data = doc.data() as TrainingCohort;
        return {
            ...data,
            startDate: data.startDate.toDate().toISOString(),
            endDate: data.endDate.toDate().toISOString(),
            createdAt: data.createdAt.toDate().toISOString(),
            updatedAt: data.updatedAt.toDate().toISOString(),
        } as any;
    });

        // Fetch recent submissions (last 50)
        let submissionsSnapshot;
        try {
            submissionsSnapshot = await db
                .collection('trainingSubmissions')
                .orderBy('submittedAt', 'desc')
                .limit(50)
                .get();
            console.log('[Training Admin] Submissions fetched:', {
                count: submissionsSnapshot.docs.length,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('[Training Admin] Failed to fetch submissions:', {
                error: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                } : error,
                timestamp: new Date().toISOString(),
            });
            return (
                <div className="container mx-auto px-4 py-8">
                    <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
                        <h2 className="text-lg font-semibold text-destructive">Database Error</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Failed to load training submissions. Please try again later or contact support.
                        </p>
                    </div>
                </div>
            );
        }

    const recentSubmissions = submissionsSnapshot.docs.map((doc) => {
        const data = doc.data() as TrainingSubmission;
        return {
            ...data,
            submittedAt: data.submittedAt.toDate().toISOString(),
            reviewedAt: data.reviewedAt?.toDate().toISOString(),
        } as any;
    });

        // Fetch all active participants
        let usersSnapshot;
        try {
            usersSnapshot = await db.collectionGroup('training').where('status', '==', 'active').get();
            console.log('[Training Admin] Active participants counted:', {
                count: usersSnapshot.size,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('[Training Admin] Failed to count active participants:', {
                error: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                } : error,
                timestamp: new Date().toISOString(),
            });
            return (
                <div className="container mx-auto px-4 py-8">
                    <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
                        <h2 className="text-lg font-semibold text-destructive">Database Error</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Failed to count active participants. Please try again later or contact support.
                        </p>
                    </div>
                </div>
            );
        }
        const activeParticipants = usersSnapshot.size;

        // Calculate stats
        let totalSubmissions;
        let approvedSubmissions;
        try {
            totalSubmissions = await db.collection('trainingSubmissions').count().get();
            approvedSubmissions = await db
                .collection('trainingSubmissions')
                .where('status', '==', 'approved')
                .count()
                .get();
            console.log('[Training Admin] Stats calculated:', {
                totalSubmissions: totalSubmissions.data().count,
                approvedSubmissions: approvedSubmissions.data().count,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('[Training Admin] Failed to calculate stats:', {
                error: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                } : error,
                timestamp: new Date().toISOString(),
            });
            return (
                <div className="container mx-auto px-4 py-8">
                    <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
                        <h2 className="text-lg font-semibold text-destructive">Database Error</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Failed to calculate training statistics. Please try again later or contact support.
                        </p>
                    </div>
                </div>
            );
        }

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

        console.log('[Training Admin] Rendering admin client:', {
            totalCohorts: stats.totalCohorts,
            activeParticipants: stats.activeParticipants,
            totalSubmissions: stats.totalSubmissions,
            approvalRate: stats.approvalRate,
            timestamp: new Date().toISOString(),
        });

        return <TrainingAdminClient cohorts={cohorts} recentSubmissions={recentSubmissions} stats={stats} />;
    } catch (error) {
        // Catch-all for any unexpected errors
        console.error('[Training Admin] Unexpected error in component:', {
            error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } : error,
            timestamp: new Date().toISOString(),
        });
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
                    <h2 className="text-lg font-semibold text-destructive">Something Went Wrong</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        An unexpected error occurred. Please try refreshing the page or contact support if the issue persists.
                    </p>
                </div>
            </div>
        );
    }
}

export const metadata = {
    title: 'Training Admin - BakedBot',
    description: 'Manage training program and monitor intern progress',
};
