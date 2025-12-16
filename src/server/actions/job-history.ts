'use server';

import { createServerClient } from '@/firebase/server-client';

export type JobRecord = {
    id: string;
    type: 'dispensaries' | 'brands';
    status: 'running' | 'completed' | 'failed';
    startedAt: number | null; // Milliseconds
    completedAt: number | null;
    result?: { itemsFound: number; pagesCreated: number; errors: string[] };
    options: any;
};

export async function getJobHistory(limitCount: number = 20): Promise<JobRecord[]> {
    try {
        const { firestore } = await createServerClient();
        const snapshot = await firestore.collection('page_generation_jobs')
            .orderBy('startedAt', 'desc')
            .limit(limitCount)
            .get();

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                type: data.type,
                status: data.status,
                startedAt: data.startedAt?.toMillis() || null,
                completedAt: data.completedAt?.toMillis() || null,
                result: data.result,
                options: data.options,
            } as JobRecord;
        });
    } catch (error) {
        console.error('Error fetching job history:', error);
        return [];
    }
}
