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
        const brandId = formData.get('brandId') as string; // Optional slug override
        // orgId is the actual Firestore org document ID (e.g. org_thrive_syracuse)
        const orgId = formData.get('orgId') as string;
        const zipCode = formData.get('zipCode') as string;

        if (!brandName || !zipCode) {
            return { success: false, error: 'Brand name and ZIP code are required' };
        }

        const slugifiedId = brandId || brandName.toLowerCase().replace(/[^a-z0-9]/g, '-');

        // The tenantId for Firestore operations is the actual orgId (if provided),
        // NOT the slugified brand name. The slug is only for URL routing.
        const tenantId = orgId || slugifiedId;

        // 1. Create/Update Brand Profile (slug doc — for URL routing)
        await firestore.collection('brands').doc(slugifiedId).set({
            name: brandName,
            id: slugifiedId,
            originalBrandId: tenantId,
            zipCode,
            updatedAt: new Date(),
        }, { merge: true });

        // 2. Link brand to user profile and org doc
        await firestore.collection('users').doc(userId).update({
            brandId: tenantId,
            setupComplete: true,
        });
        if (orgId) {
            await firestore.collection('organizations').doc(orgId).set({
                zipCode,
                updatedAt: new Date(),
            }, { merge: true });
        }

        // 3. Trigger Auto-Competitor discovery (Ezal Lite)
        // Use actual tenantId (org_thrive_syracuse) so competitors land in the right Firestore path
        const discoveryResult = await autoSetupCompetitors(tenantId, zipCode);

        logger.info('Manual brand setup complete', {
            userId,
            tenantId,
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
            brandId: tenantId,
            competitors: discoveryResult.competitors,
            syncStatus
        };

    } catch (error: any) {
        logger.error('Brand setup failed:', error);
        return { success: false, error: error.message };
    }
}
