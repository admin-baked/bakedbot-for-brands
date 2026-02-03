/**
 * Training Dashboard - Server Component
 *
 * Main entry point for the BakedBot Builder Bootcamp training platform.
 * Fetches initial data server-side and passes to client component.
 */

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { TrainingPageClient } from './page-client';
import type { TrainingProgram, UserTrainingProgress } from '@/types/training';

export default async function TrainingPage() {
    // Auth check - allow interns and super users
    const user = await requireUser(['intern', 'super_user']);
    const db = getAdminFirestore();

    // Fetch training program
    const programDoc = await db.collection('trainingPrograms').doc('bakedbot-builder-bootcamp-v1').get();

    if (!programDoc.exists) {
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
    const progressDoc = await db.collection('users').doc(user.uid).collection('training').doc('current').get();

    const progress = progressDoc.exists ? (progressDoc.data() as UserTrainingProgress) : null;

    // If no progress, user needs to be enrolled
    if (!progress) {
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

    return <TrainingPageClient program={program} progress={progress} userId={user.uid} />;
}

export const metadata = {
    title: 'Training - BakedBot',
    description: 'Learn BakedBot development through hands-on challenges',
};
