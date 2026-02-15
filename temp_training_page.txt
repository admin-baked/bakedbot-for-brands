/**
 * Training Dashboard - Server Component
 *
 * Main entry point for the BakedBot Builder Bootcamp training platform.
 * Fetches initial data server-side and passes to client component.
 */

// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { TrainingPageClient } from './page-client';
import type { TrainingProgram, UserTrainingProgress } from '@/types/training';

export default async function TrainingPage() {
    // Wrap entire component in try-catch to prevent crashes
    try {
        // Auth check - allow interns and super users
        let user;
        try {
            user = await requireUser(['intern', 'super_user']);
        } catch (error) {
            // Auth failed - redirect to training landing page
            console.error('[Training Page] Auth check failed:', {
                error: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                } : error,
                timestamp: new Date().toISOString(),
            });
            // Avoid sending internal users to the customer login flow.
            redirect('/signin');
        }

        const db = getAdminFirestore();

        console.log('[Training Page] User authenticated successfully:', {
            uid: user.uid,
            email: user.email,
            role: user.role,
            timestamp: new Date().toISOString(),
        });

        // Fetch training program
        let programDoc;
        try {
            programDoc = await db.collection('trainingPrograms').doc('bakedbot-builder-bootcamp-v1').get();
            console.log('[Training Page] Program fetch result:', {
                exists: programDoc.exists,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('[Training Page] Failed to fetch training program:', {
                error: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                } : error,
                userId: user.uid,
                timestamp: new Date().toISOString(),
            });
            return (
                <div className="container mx-auto px-4 py-8">
                    <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
                        <h2 className="text-lg font-semibold text-destructive">Database Error</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Failed to load training program. Please try again later or contact support.
                        </p>
                    </div>
                </div>
            );
        }

    if (!programDoc.exists) {
        console.error('[Training Page] Training program document does not exist');
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
                    <h2 className="text-lg font-semibold text-destructive">Training Program Not Found</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        The training program has not been set up yet. Please contact your administrator.
                    </p>
                </div>
            </div>
        );
    }

    const program = programDoc.data() as TrainingProgram;

        // Fetch user progress
        let progressDoc;
        try {
            progressDoc = await db.collection('users').doc(user.uid).collection('training').doc('current').get();
            console.log('[Training Page] Progress fetch result:', {
                exists: progressDoc.exists,
                userId: user.uid,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('[Training Page] Failed to fetch user progress:', {
                error: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                } : error,
                userId: user.uid,
                timestamp: new Date().toISOString(),
            });
            return (
                <div className="container mx-auto px-4 py-8">
                    <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
                        <h2 className="text-lg font-semibold text-destructive">Database Error</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Failed to load your progress. Please try again later or contact support.
                        </p>
                    </div>
                </div>
            );
        }

        const progress = progressDoc.exists ? (progressDoc.data() as UserTrainingProgress) : null;

        // If no progress, user needs to be enrolled
        if (!progress) {
            console.warn('[Training Page] User has no progress document:', {
                userId: user.uid,
                email: user.email,
                role: user.role,
                timestamp: new Date().toISOString(),
            });
            return (
                <div className="container mx-auto px-4 py-8">
                    <div className="rounded-lg border bg-card p-6">
                        <h2 className="text-lg font-semibold">Welcome to BakedBot Training!</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            You're not enrolled in a cohort yet. Please contact your administrator to get started.
                        </p>
                        <div className="mt-4 rounded-lg bg-muted p-4">
                            <p className="text-sm font-medium">What you'll learn:</p>
                            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                {program.curriculum.slice(0, 4).map((week) => (
                                    <li key={week.weekNumber}>
                                        • Week {week.weekNumber}: {week.title}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            );
        }

        console.log('[Training Page] Rendering training page client:', {
            userId: user.uid,
            programId: program.id,
            currentWeek: progress.currentWeek,
            completedChallenges: progress.completedChallenges.length,
            timestamp: new Date().toISOString(),
        });

        return <TrainingPageClient program={program} progress={progress} userId={user.uid} />;
    } catch (error) {
        // Catch-all for any unexpected errors
        console.error('[Training Page] Unexpected error in component:', {
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
    title: 'Training - BakedBot',
    description: 'Learn BakedBot development through hands-on challenges',
};
