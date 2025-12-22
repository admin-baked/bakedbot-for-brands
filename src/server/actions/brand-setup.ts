'use server';

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/monitoring';
import { autoSetupCompetitors } from '@/server/services/auto-competitor';
import { revalidatePath } from 'next/cache';
import { CannMenusService } from '@/server/services/cannmenus';

export async function setupBrandAndCompetitors(formData: FormData) {
    try {
        const { firestore } = await createServerClient();

        // userId is passed from client-side (validated via client-side auth state)
        const userId = formData.get('userId') as string;

        if (!userId) {
            return { success: false, error: 'Authentication required' };
        }

        const brandName = formData.get('brandName') as string;
        const brandId = formData.get('brandId') as string; // Optional, can be slugified version
        const zipCode = formData.get('zipCode') as string;

        if (!brandName || !zipCode) {
            return { success: false, error: 'Brand name and ZIP code are required' };
        }

        const slugifiedId = brandId || brandName.toLowerCase().replace(/[^a-z0-9]/g, '-');

        // 1. Create/Update Brand Profile
        await firestore.collection('brands').doc(slugifiedId).set({
            name: brandName,
            id: slugifiedId,
            zipCode,
            updatedAt: new Date(),
        }, { merge: true });

        // 2. Link brand to user profile
        await firestore.collection('users').doc(userId).update({
            brandId: slugifiedId,
            setupComplete: true,
        });

        // 3. Trigger Auto-Competitor discovery (Ezal Lite)
        // We use the slugifiedId as tenantId for now
        const discoveryResult = await autoSetupCompetitors(slugifiedId, zipCode);

        logger.info('Manual brand setup complete', {
            userId,
            brandId: slugifiedId,
            competitorsFound: discoveryResult.competitors.length
        });

        revalidatePath('/dashboard');
        revalidatePath('/dashboard/settings');

        // 4. Trigger CannMenus Sync (Products & Retailers)
        let syncStatus = null;
        try {
            const cannMenusService = new CannMenusService();
            const syncResult = await cannMenusService.syncMenusForBrand(slugifiedId, brandName, {
                // Initial sync options
                maxRetailers: 25 // Conservative limit for onboarding
            });
            syncStatus = { started: true, details: syncResult };
            logger.info('Triggered initial menu sync', { brandId: slugifiedId });
        } catch (syncError) {
            logger.error('Failed to trigger initial sync', syncError);
            syncStatus = { started: false, error: 'Sync initiation failed' };
        }

        return {
            success: true,
            brandId: slugifiedId,
            competitors: discoveryResult.competitors,
            syncStatus
        };

    } catch (error: any) {
        logger.error('Brand setup failed:', error);
        return { success: false, error: error.message };
    }
}
