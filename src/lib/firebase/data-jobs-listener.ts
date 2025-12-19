'use client';

/**
 * Data Jobs Listener
 * 
 * Real-time Firestore listener for data_jobs collection.
 * Updates the notification store as jobs progress.
 */

import { useEffect, useCallback } from 'react';
import { useFirebase } from '@/firebase/provider';
import {
    useNotificationStore,
    type IngestionStatus,
    type JobType
} from '@/lib/store/notification-store';
import { onSnapshot, query, where, collection, orderBy, limit } from 'firebase/firestore';

interface DataJob {
    id: string;
    type: JobType;
    entityId: string;
    entityName: string;
    entityType: 'brand' | 'dispensary';
    orgId: string;
    userId: string;
    status: 'pending' | 'syncing' | 'processing' | 'complete' | 'error';
    message: string;
    progress?: number;
    error?: string;
    createdAt: any;
    updatedAt: any;
    attempts: number;
}

// Map Firestore status to our notification status
function mapStatus(firestoreStatus: DataJob['status']): IngestionStatus {
    switch (firestoreStatus) {
        case 'pending':
            return 'pending';
        case 'syncing':
        case 'processing':
            return 'syncing';
        case 'complete':
            return 'complete';
        case 'error':
            return 'error';
        default:
            return 'pending';
    }
}

export function useDataJobsListener(userId: string | null | undefined) {
    const { firestore } = useFirebase();
    const {
        addIngestionNotification,
        updateIngestionNotification,
        ingestionNotifications
    } = useNotificationStore();

    const syncJobToNotification = useCallback((job: DataJob) => {
        const existingNotification = ingestionNotifications.find(n => n.id === job.id);

        if (existingNotification) {
            // Update existing notification
            updateIngestionNotification(job.id, {
                status: mapStatus(job.status),
                message: job.message,
                progress: job.progress,
                error: job.error
            });
        } else {
            // Add new notification
            addIngestionNotification({
                id: job.id,
                entityId: job.entityId,
                entityName: job.entityName,
                entityType: job.entityType,
                jobType: job.type,
                status: mapStatus(job.status),
                message: job.message,
                progress: job.progress,
                error: job.error
            });
        }
    }, [addIngestionNotification, updateIngestionNotification, ingestionNotifications]);

    useEffect(() => {
        if (!firestore || !userId) return;

        // Query for user's recent data jobs (last 24 hours)
        const jobsRef = collection(firestore, 'data_jobs');
        const jobsQuery = query(
            jobsRef,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        // Subscribe to real-time updates
        const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const job = { id: change.doc.id, ...change.doc.data() } as DataJob;

                if (change.type === 'added' || change.type === 'modified') {
                    syncJobToNotification(job);
                }
            });
        }, (error) => {
            console.error('Error listening to data jobs:', error);
        });

        return () => unsubscribe();
    }, [firestore, userId, syncJobToNotification]);
}

// Hook to manually check job status (for server components or initial load)
export async function checkDataJobStatus(
    db: any,
    userId: string
): Promise<DataJob[]> {
    if (!db) return [];

    const { getDocs, query, where, collection, orderBy, limit } = await import('firebase/firestore');

    const jobsRef = collection(db, 'data_jobs');
    const jobsQuery = query(
        jobsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(10)
    );

    const snapshot = await getDocs(jobsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DataJob));
}
