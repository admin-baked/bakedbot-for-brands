'use server';

import { getAdminFirestore } from '@/firebase/admin';

export interface JobProgress {
    id: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    type: string;
    totalItems: number;
    processedItems: number;
    createdPages: number;
    skippedDuplicates: number;
    errors: string[];
    startedAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    estimatedSecondsPerItem: number;
}

/**
 * Create a new job progress document
 */
export async function createJobProgress(
    jobId: string,
    type: string,
    totalItems: number
): Promise<void> {
    const firestore = getAdminFirestore();
    await firestore.collection('foot_traffic').doc('jobs').collection('progress').doc(jobId).set({
        id: jobId,
        status: 'running',
        type,
        totalItems,
        processedItems: 0,
        createdPages: 0,
        skippedDuplicates: 0,
        errors: [],
        startedAt: new Date(),
        updatedAt: new Date(),
        estimatedSecondsPerItem: 1.5, // Initial estimate (geocoding delay + processing)
    });
}

/**
 * Update job progress
 */
export async function updateJobProgress(
    jobId: string,
    update: Partial<Pick<JobProgress, 'processedItems' | 'createdPages' | 'skippedDuplicates' | 'errors' | 'status' | 'completedAt' | 'estimatedSecondsPerItem'>>
): Promise<void> {
    const firestore = getAdminFirestore();
    await firestore.collection('foot_traffic').doc('jobs').collection('progress').doc(jobId).update({
        ...update,
        updatedAt: new Date(),
    });
}

/**
 * Cancel a running job
 */
export async function cancelJob(jobId: string): Promise<void> {
    const firestore = getAdminFirestore();
    await firestore.collection('foot_traffic').doc('jobs').collection('progress').doc(jobId).update({
        status: 'cancelled',
        updatedAt: new Date(),
    });
}

/**
 * Check if a job has been cancelled
 */
export async function isJobCancelled(jobId: string): Promise<boolean> {
    const firestore = getAdminFirestore();
    const doc = await firestore.collection('foot_traffic').doc('jobs').collection('progress').doc(jobId).get();
    if (!doc.exists) return false;
    return doc.data()?.status === 'cancelled';
}


/**
 * Get current job progress
 */
export async function getJobProgress(jobId: string): Promise<JobProgress | null> {
    const firestore = getAdminFirestore();
    const doc = await firestore.collection('foot_traffic').doc('jobs').collection('progress').doc(jobId).get();

    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
        id: data.id,
        status: data.status,
        type: data.type,
        totalItems: data.totalItems,
        processedItems: data.processedItems,
        createdPages: data.createdPages,
        skippedDuplicates: data.skippedDuplicates,
        errors: data.errors || [],
        startedAt: data.startedAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        completedAt: data.completedAt?.toDate?.(),
        estimatedSecondsPerItem: data.estimatedSecondsPerItem || 1.5,
    };
}

/**
 * Get the most recent running job
 */
export async function getActiveJob(): Promise<JobProgress | null> {
    const firestore = getAdminFirestore();
    const snapshot = await firestore
        .collection('foot_traffic')
        .doc('jobs')
        .collection('progress')
        .where('status', '==', 'running')
        .orderBy('startedAt', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
        id: data.id,
        status: data.status,
        type: data.type,
        totalItems: data.totalItems,
        processedItems: data.processedItems,
        createdPages: data.createdPages,
        skippedDuplicates: data.skippedDuplicates,
        errors: data.errors || [],
        startedAt: data.startedAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        completedAt: data.completedAt?.toDate?.(),
        estimatedSecondsPerItem: data.estimatedSecondsPerItem || 1.5,
    };
}
