'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

export async function checkOnboardingStatus() {
    try {
        const user = await requireUser();
        const { firestore } = await createServerClient();

        // 1. Check for data jobs for this user created in the last 15 minutes
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        
        const jobsSnapshot = await firestore.collection('data_jobs')
            .where('userId', '==', user.uid)
            .where('createdAt', '>', fifteenMinutesAgo)
            .get();

        if (jobsSnapshot.empty) {
            // No jobs found? Maybe they skipped or manual entry without jobs?
            // Or jobs haven't propagated yet? 
            // Assume 10% progress if no jobs but "onboarding" just happened
            return { ready: false, percent: 10, message: 'Initializing...' };
        }

        const jobs = jobsSnapshot.docs.map(d => d.data());
        const totalJobs = jobs.length;
        const completedJobs = jobs.filter(j => j.status === 'completed').length;
        const failedJobs = jobs.filter(j => j.status === 'failed').length;

        // If any failed, we probably shouldn't hang forever, but for now let's treat as 'done' for UI purposes 
        // effectively 100% so they can enter dashboard
        if (failedJobs > 0) {
            // Log failure but let user in
            return { ready: true, percent: 100, message: 'Completed with warnings.' };
        }

        if (totalJobs === 0) return { ready: true, percent: 100 }; // Fallback

        const percent = Math.round((completedJobs / totalJobs) * 90) + 10; // Base 10% + progress

        return {
            ready: completedJobs === totalJobs,
            percent: percent,
            message: `Processing ${completedJobs}/${totalJobs} tasks...`
        };

    } catch (error) {
        console.error('Check status failed:', error);
        return { ready: true, percent: 100 }; // Fail open -> let them in
    }
}
