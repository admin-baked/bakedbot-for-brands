'use server';

/**
 * Pre-Start Data Import
 * Triggers background jobs when brand/dispensary is selected (before onboarding completion)
 */

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

interface PreStartParams {
    role: 'brand' | 'dispensary';
    entityId: string;
    entityName: string;
    marketState?: string;
}

export async function preStartDataImport(params: PreStartParams) {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser();
        const uid = user.uid;

        const jobIds: string[] = [];

        // Generate temporary orgId (will be finalized in completeOnboarding)
        const tempOrgId = params.role === 'brand'
            ? params.entityId
            : `org-${uid.substring(0, 8)}`;

        logger.info('Pre-starting data import', {
            role: params.role,
            entityId: params.entityId,
            entityName: params.entityName
        });

        // --- BRAND PRE-START ---
        if (params.role === 'brand') {
            // 1. Queue Product Sync Job
            if (params.entityId.startsWith('cm_')) {
                const productJobRef = await firestore.collection('data_jobs').add({
                    type: 'product_sync',
                    entityId: params.entityId,
                    entityName: params.entityName,
                    entityType: 'brand',
                    orgId: tempOrgId,
                    userId: uid,
                    status: 'pending',
                    message: `Importing products for ${params.entityName}...`,
                    progress: 0,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    attempts: 0,
                    metadata: {
                        preStart: true,
                        marketState: params.marketState
                    }
                });
                jobIds.push(productJobRef.id);
                logger.info('Queued product sync job', { jobId: productJobRef.id });
            }

            // 2. Queue Dispensary Import Job (if market state provided)
            if (params.marketState) {
                const dispJobRef = await firestore.collection('data_jobs').add({
                    type: 'dispensary_import',
                    entityId: params.entityId,
                    entityName: params.entityName,
                    entityType: 'brand',
                    orgId: tempOrgId,
                    userId: uid,
                    status: 'pending',
                    message: `Finding dispensaries in ${params.marketState}...`,
                    progress: 0,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    attempts: 0,
                    metadata: {
                        preStart: true,
                        marketState: params.marketState
                    }
                });
                jobIds.push(dispJobRef.id);
                logger.info('Queued dispensary import job', { jobId: dispJobRef.id });
            }
        }

        // --- DISPENSARY PRE-START ---
        if (params.role === 'dispensary') {
            // Queue Menu Sync Job
            if (params.entityId.startsWith('cm_')) {
                const menuJobRef = await firestore.collection('data_jobs').add({
                    type: 'product_sync',
                    entityId: params.entityId,
                    entityName: params.entityName,
                    entityType: 'dispensary',
                    orgId: tempOrgId,
                    userId: uid,
                    status: 'pending',
                    message: `Importing menu for ${params.entityName}...`,
                    progress: 0,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    attempts: 0,
                    metadata: {
                        preStart: true
                    }
                });
                jobIds.push(menuJobRef.id);
                logger.info('Queued menu sync job', { jobId: menuJobRef.id });
            }
        }

        // Start processing jobs immediately in background
        // Note: In production, a Cloud Function or worker would pick these up
        // For now, we'll trigger them with a fetch to a processing endpoint
        if (jobIds.length > 0) {
            // Trigger background processor (non-blocking)
            fetch('/api/jobs/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobIds })
            }).catch(err => {
                // Non-fatal - jobs will be picked up by scheduled processor
                logger.warn('Failed to trigger immediate job processing', { error: err });
            });
        }

        return {
            success: true,
            jobIds,
            message: `Started ${jobIds.length} background import ${jobIds.length === 1 ? 'job' : 'jobs'}`
        };

    } catch (error) {
        logger.error('Pre-start data import failed', {
            error: error instanceof Error ? error.message : String(error),
            params
        });

        // Non-fatal - onboarding can continue
        return {
            success: false,
            jobIds: [],
            message: 'Failed to start background import',
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Get job progress for a user
 */
export async function getJobProgress(userId: string) {
    try {
        const { firestore } = await createServerClient();

        const jobsSnapshot = await firestore
            .collection('data_jobs')
            .where('userId', '==', userId)
            .where('status', 'in', ['pending', 'running'])
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        const jobs = jobsSnapshot.docs.map(doc => ({
            jobId: doc.id,
            type: doc.data().type,
            status: doc.data().status,
            progress: doc.data().progress || 0,
            message: doc.data().message || ''
        }));

        return { success: true, jobs };
    } catch (error) {
        logger.error('Failed to get job progress', { error, userId });
        return { success: false, jobs: [] };
    }
}
