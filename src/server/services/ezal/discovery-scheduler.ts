'use server';

// src/server/services/ezal/discovery-scheduler.ts
/**
 * Discovery Scheduler
 * Creates and manages discovery jobs for data sources
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { DiscoveryJob, DataSource, JobStatus } from '@/types/ezal-discovery';
import { getSourcesDue, markSourceDiscovered } from './competitor-manager';
import { FieldValue } from 'firebase-admin/firestore';

const COLLECTION_DISCOVERY_JOBS = 'discovery_jobs';

// =============================================================================
// JOB CREATION
// =============================================================================

/**
 * Create a discovery job for a data source
 */
export async function createDiscoveryJob(
    tenantId: string,
    sourceId: string,
    competitorId: string,
    options?: {
        scheduledFor?: Date;
        createdBy?: 'scheduler' | 'manual' | 'ezal';
        priority?: number;
    }
): Promise<DiscoveryJob> {
    const { firestore } = await createServerClient();

    const now = new Date();
    const jobData = {
        tenantId,
        sourceId,
        competitorId,
        scheduledFor: options?.scheduledFor || now,
        status: 'queued' as JobStatus,
        runId: null,
        createdBy: options?.createdBy || 'scheduler',
        createdAt: now,
        startedAt: null,
        completedAt: null,
        errorMessage: null,
    };

    const docRef = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_DISCOVERY_JOBS)
        .add(jobData);

    logger.info('[Ezal] Created discovery job:', {
        jobId: docRef.id,
        tenantId,
        sourceId,
    });

    return {
        id: docRef.id,
        ...jobData,
    };
}

/**
 * Get a discovery job by ID
 */
export async function getDiscoveryJob(
    tenantId: string,
    jobId: string
): Promise<DiscoveryJob | null> {
    const { firestore } = await createServerClient();

    const doc = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_DISCOVERY_JOBS)
        .doc(jobId)
        .get();

    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
        id: doc.id,
        ...data,
        scheduledFor: data.scheduledFor?.toDate?.() || new Date(),
        createdAt: data.createdAt?.toDate?.() || new Date(),
        startedAt: data.startedAt?.toDate?.() || null,
        completedAt: data.completedAt?.toDate?.() || null,
    } as DiscoveryJob;
}

/**
 * Update job status
 */
export async function updateJobStatus(
    tenantId: string,
    jobId: string,
    status: JobStatus,
    updates?: {
        runId?: string;
        errorMessage?: string;
    }
): Promise<void> {
    const { firestore } = await createServerClient();

    const updateData: Record<string, any> = { status };

    if (status === 'running') {
        updateData.startedAt = new Date();
    } else if (status === 'done' || status === 'error') {
        updateData.completedAt = new Date();
    }

    if (updates?.runId) {
        updateData.runId = updates.runId;
    }
    if (updates?.errorMessage) {
        updateData.errorMessage = updates.errorMessage;
    }

    await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_DISCOVERY_JOBS)
        .doc(jobId)
        .update(updateData);
}

// =============================================================================
// SCHEDULER LOGIC
// =============================================================================

/**
 * Main scheduler function - finds due sources and creates jobs
 * This would typically be called by Cloud Scheduler every 5-10 minutes
 */
export async function runScheduler(tenantId: string): Promise<{
    jobsCreated: number;
    sources: string[];
}> {
    logger.info('[Ezal] Running scheduler for tenant:', { tenantId });

    // Get sources that are due for discovery
    const dueSource = await getSourcesDue(tenantId, 20);

    if (dueSource.length === 0) {
        logger.info('[Ezal] No sources due for discovery');
        return { jobsCreated: 0, sources: [] };
    }

    const createdJobs: string[] = [];

    for (const source of dueSource) {
        try {
            // Create a job for this source
            const job = await createDiscoveryJob(
                tenantId,
                source.id,
                source.competitorId,
                { createdBy: 'scheduler' }
            );

            createdJobs.push(source.id);

            // In production, this would enqueue a Cloud Task
            // For now, we'll process synchronously or mark for pickup

        } catch (error) {
            logger.error('[Ezal] Failed to create job for source:', {
                sourceId: source.id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    logger.info('[Ezal] Scheduler completed:', {
        tenantId,
        jobsCreated: createdJobs.length,
    });

    return {
        jobsCreated: createdJobs.length,
        sources: createdJobs,
    };
}

/**
 * Get pending jobs for processing
 */
export async function getPendingJobs(
    tenantId: string,
    limit: number = 10
): Promise<DiscoveryJob[]> {
    const { firestore } = await createServerClient();

    const snapshot = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_DISCOVERY_JOBS)
        .where('status', '==', 'queued')
        .where('scheduledFor', '<=', new Date())
        .orderBy('scheduledFor')
        .limit(limit)
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            scheduledFor: data.scheduledFor?.toDate?.() || new Date(),
            createdAt: data.createdAt?.toDate?.() || new Date(),
            startedAt: data.startedAt?.toDate?.() || null,
            completedAt: data.completedAt?.toDate?.() || null,
        } as DiscoveryJob;
    });
}

/**
 * Get recent job history for a source
 */
export async function getJobHistory(
    tenantId: string,
    sourceId: string,
    limit: number = 10
): Promise<DiscoveryJob[]> {
    const { firestore } = await createServerClient();

    const snapshot = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_DISCOVERY_JOBS)
        .where('sourceId', '==', sourceId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            scheduledFor: data.scheduledFor?.toDate?.() || new Date(),
            createdAt: data.createdAt?.toDate?.() || new Date(),
            startedAt: data.startedAt?.toDate?.() || null,
            completedAt: data.completedAt?.toDate?.() || null,
        } as DiscoveryJob;
    });
}

/**
 * Cancel a pending job
 */
export async function cancelJob(
    tenantId: string,
    jobId: string
): Promise<void> {
    await updateJobStatus(tenantId, jobId, 'cancelled');
    logger.info('[Ezal] Cancelled job:', { tenantId, jobId });
}

/**
 * Retry a failed job
 */
export async function retryJob(
    tenantId: string,
    jobId: string
): Promise<DiscoveryJob> {
    // Get the original job
    const originalJob = await getDiscoveryJob(tenantId, jobId);
    if (!originalJob) {
        throw new Error(`Job not found: ${jobId}`);
    }

    // Create a new job with same parameters
    return createDiscoveryJob(
        tenantId,
        originalJob.sourceId,
        originalJob.competitorId,
        { createdBy: 'manual' }
    );
}

/**
 * Get scheduler stats
 */
export async function getSchedulerStats(tenantId: string): Promise<{
    totalJobs: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    todayCount: number;
}> {
    const { firestore } = await createServerClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all jobs (simplified - in production use aggregation queries)
    const allJobsSnapshot = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_DISCOVERY_JOBS)
        .limit(1000)
        .get();

    let queued = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;
    let todayCount = 0;

    allJobsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const status = data.status;
        const createdAt = data.createdAt?.toDate?.() || new Date(0);

        if (status === 'queued') queued++;
        else if (status === 'running') running++;
        else if (status === 'done') completed++;
        else if (status === 'error') failed++;

        if (createdAt >= today) todayCount++;
    });

    return {
        totalJobs: allJobsSnapshot.size,
        queued,
        running,
        completed,
        failed,
        todayCount,
    };
}
