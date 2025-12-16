'use server';

import { PageGeneratorService } from '@/server/services/page-generator';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';

async function logJobStart(type: 'dispensaries' | 'brands' | 'states' | 'cities', options: any) {
    const { firestore } = await createServerClient();
    const docRef = firestore.collection('page_generation_jobs').doc();
    const jobId = docRef.id;

    await docRef.set({
        id: jobId,
        type,
        status: 'running',
        startedAt: FieldValue.serverTimestamp(),
        options,
        createdBy: 'admin', // TODO: Get actual user ID
    });

    return jobId;
}

async function logJobComplete(jobId: string, result: any) {
    const { firestore } = await createServerClient();
    await firestore.collection('page_generation_jobs').doc(jobId).update({
        status: result.success ? 'completed' : 'failed',
        completedAt: FieldValue.serverTimestamp(),
        result: {
            itemsFound: result.itemsFound || 0,
            pagesCreated: result.pagesCreated || 0,
            errors: result.errors || [],
        }
    });
}

export async function runDispensaryScan(limit: number, dryRun: boolean) {
    let jobId;
    try {
        jobId = await logJobStart('dispensaries', { limit, dryRun });

        const service = new PageGeneratorService();
        const result = await service.scanAndGenerateDispensaries({ limit, dryRun });

        await logJobComplete(jobId, result);
        return result;
    } catch (error: any) {
        const result = { success: false, itemsFound: 0, pagesCreated: 0, errors: [error.message] };
        if (jobId) await logJobComplete(jobId, result);
        return result;
    }
}

export async function runBrandScan(limit: number, dryRun: boolean) {
    let jobId;
    try {
        jobId = await logJobStart('brands', { limit, dryRun });

        const service = new PageGeneratorService();
        const result = await service.scanAndGenerateBrands({ limit, dryRun });

        await logJobComplete(jobId, result);
        return result;
    } catch (error: any) {
        const result = { success: false, itemsFound: 0, pagesCreated: 0, errors: [error.message] };
        if (jobId) await logJobComplete(jobId, result);
        return result;
    }
}

export async function runStateScan(dryRun: boolean) {
    let jobId;
    try {
        jobId = await logJobStart('states', { dryRun });

        const service = new PageGeneratorService();
        const result = await service.scanAndGenerateStates({ dryRun });

        await logJobComplete(jobId, result);
        return result;
    } catch (error: any) {
        const result = { success: false, itemsFound: 0, pagesCreated: 0, errors: [error.message] };
        if (jobId) await logJobComplete(jobId, result);
        return result;
    }
}

export async function runCityScan(limit: number, dryRun: boolean) {
    let jobId;
    try {
        jobId = await logJobStart('cities', { limit, dryRun });

        const service = new PageGeneratorService();
        const result = await service.scanAndGenerateCities({ limit, dryRun });

        await logJobComplete(jobId, result);
        return result;
    } catch (error: any) {
        const result = { success: false, itemsFound: 0, pagesCreated: 0, errors: [error.message] };
        if (jobId) await logJobComplete(jobId, result);
        return result;
    }
}
