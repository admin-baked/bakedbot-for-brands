'use server';

import { PageGeneratorService } from '@/server/services/page-generator';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser } from '@/server/auth/auth';

// Location filter interface for batch page generation
export interface ScanFilters {
    state?: string;
    city?: string;
    zipCodes?: string[];
    marketType?: 'cannabis' | 'hemp';
}

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

export async function runDispensaryScan(limit: number, dryRun: boolean, filters?: ScanFilters) {
    let jobId;
    try {
        const user = await requireUser(['owner', 'admin']);
        jobId = await logJobStart('dispensaries', { limit, dryRun, filters });

        const service = new PageGeneratorService();

        // Enforce coverage limits only for real runs (not dry runs, or maybe both?)
        // Let's enforce for both to show "upgrade needed" early.
        if (user.role !== 'owner') {
            await service.checkCoverageLimit(user.uid);
        }

        // Pass user.uid as brandId for attribution
        const result = await service.scanAndGenerateDispensaries({ limit, dryRun, ...filters, brandId: user.uid });

        await logJobComplete(jobId, result);
        return result;
    } catch (error: any) {
        const result = { success: false, itemsFound: 0, pagesCreated: 0, errors: [error.message] };
        if (jobId) await logJobComplete(jobId, result);
        return result;
    }
}

export async function runBrandScan(limit: number, dryRun: boolean, filters?: ScanFilters) {
    let jobId;
    try {
        const user = await requireUser(['owner', 'admin']);
        jobId = await logJobStart('brands', { limit, dryRun, filters });

        const service = new PageGeneratorService();

        // Enforce for brands too?
        if (user.role !== 'owner') {
            await service.checkCoverageLimit(user.uid);
        }

        const result = await service.scanAndGenerateBrands({ limit, dryRun, ...filters, brandId: user.uid });

        await logJobComplete(jobId, result);
        return result;
    } catch (error: any) {
        const result = { success: false, itemsFound: 0, pagesCreated: 0, errors: [error.message] };
        if (jobId) await logJobComplete(jobId, result);
        return result;
    }
}

export async function runStateScan(dryRun: boolean, filters?: ScanFilters) {
    let jobId;
    try {
        jobId = await logJobStart('states', { dryRun, filters });

        const service = new PageGeneratorService();
        const result = await service.scanAndGenerateStates({ dryRun, ...filters });

        await logJobComplete(jobId, result);
        return result;
    } catch (error: any) {
        const result = { success: false, itemsFound: 0, pagesCreated: 0, errors: [error.message] };
        if (jobId) await logJobComplete(jobId, result);
        return result;
    }
}

export async function runCityScan(limit: number, dryRun: boolean, filters?: ScanFilters) {
    let jobId;
    try {
        const user = await requireUser(['owner', 'admin']);
        jobId = await logJobStart('cities', { limit, dryRun, filters });

        const service = new PageGeneratorService();

        // Cities might not count towards coverage limits? 
        // "Claim Pro includes 25 ZIPs". Usually means "My Brand in 25 ZIPs".
        // Cities are aggregations.
        // But for safety let's enforce or at least require user.
        // Assuming City generation is exempt from *ZIP* limits but restricted to admins.

        const result = await service.scanAndGenerateCities({ limit, dryRun, ...filters });

        await logJobComplete(jobId, result);
        return result;
    } catch (error: any) {
        const result = { success: false, itemsFound: 0, pagesCreated: 0, errors: [error.message] };
        if (jobId) await logJobComplete(jobId, result);
        return result;
    }
}

