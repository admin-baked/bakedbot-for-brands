'use server';

/**
 * Dispensary Linking Actions
 * 
 * Server actions for searching and linking dispensaries from CannMenus
 * to a user's account. This enables users who skipped onboarding to
 * connect their dispensary data.
 */

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { CannMenusService } from '@/server/services/cannmenus';
// ActionResult type for server actions
interface ActionResult<T = undefined> {
    success: boolean;
    message?: string;
    data?: T;
}

interface DispensarySearchResult {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    source: 'cannmenus' | 'leafly' | 'manual';
    productCount?: number;
    menuUrl?: string;
}

/**
 * Search for dispensaries by name or location
 */
export async function searchDispensariesAction(
    query: string,
    zip?: string
): Promise<ActionResult<{ dispensaries: DispensarySearchResult[] }>> {
    try {
        await requireUser(['dispensary', 'owner', 'super_admin']);

        if (!query && !zip) {
            return { success: false, message: 'Please provide a search query or ZIP code' };
        }

        const cannMenus = new CannMenusService();
        const results: DispensarySearchResult[] = [];

        // If ZIP provided, search by location
        if (zip) {
            // Convert ZIP to lat/lng (simplified - in production use geocoding)
            // For now, we'll use the findRetailers method if we have coordinates
            // or fall back to name search
        }

        // Search by name in CannMenus
        if (query) {
            try {
                // Use existing CannMenus product search to find retailers
                // Ideally we'd have a dedicated retailer search endpoint
                const searchResult = await cannMenus.searchProducts({
                    search: query,
                    limit: 20
                });

                // Extract unique retailers from products
                const seenRetailers = new Set<string>();
                searchResult.products.forEach((product: any) => {
                    const retailer = product.retailer;
                    if (retailer && !seenRetailers.has(retailer.id)) {
                        seenRetailers.add(retailer.id);
                        results.push({
                            id: retailer.id,
                            name: retailer.name || 'Unknown',
                            address: retailer.address,
                            city: retailer.city,
                            state: retailer.state,
                            zip: retailer.zip,
                            source: 'cannmenus',
                            productCount: retailer.productCount,
                            menuUrl: retailer.menuUrl
                        });
                    }
                });
            } catch (error) {
                console.error('[LinkDispensary] CannMenus search failed:', error);
                // Continue without CannMenus results
            }
        }

        return {
            success: true,
            data: { dispensaries: results }
        };
    } catch (error: any) {
        console.error('[LinkDispensary] Search error:', error);
        return { success: false, message: error.message || 'Search failed' };
    }
}

/**
 * Link a CannMenus dispensary to the current user's account
 * After linking, triggers: menu sync, competitor discovery, page generation
 */
export async function linkDispensaryAction(
    cannmenusId: string,
    dispensaryName: string,
    dispensaryData?: Partial<DispensarySearchResult>
): Promise<ActionResult> {
    try {
        const user = await requireUser(['dispensary', 'owner', 'super_admin']);
        const { firestore } = await createServerClient();

        const zip = dispensaryData?.zip || '';

        // Create/update dispensary document
        const dispensaryRef = firestore.collection('dispensaries').doc(user.uid);
        
        await dispensaryRef.set({
            name: dispensaryName,
            cannmenusId: cannmenusId,
            address: dispensaryData?.address || '',
            city: dispensaryData?.city || '',
            state: dispensaryData?.state || '',
            zip: zip,
            source: 'cannmenus',
            linkedAt: new Date(),
            ownerId: user.uid,
            status: 'active'
        }, { merge: true });

        // Update user profile with linked dispensary
        await firestore.collection('users').doc(user.uid).set({
            linkedDispensary: {
                id: cannmenusId,
                name: dispensaryName,
                source: 'cannmenus',
                linkedAt: new Date()
            }
        }, { merge: true });

        // ========== POST-LINK SERVICE ACTIVATION ==========
        
        // 1. Trigger menu sync from CannMenus (async, don't wait)
        triggerMenuSync(cannmenusId, user.uid).catch(err => 
            console.error('[LinkDispensary] Menu sync failed:', err)
        );

        // 2. Auto-discover competitors using ZIP (async, don't wait)
        if (zip) {
            triggerCompetitorDiscovery(user.uid, zip, cannmenusId).catch(err =>
                console.error('[LinkDispensary] Competitor discovery failed:', err)
            );
        }

        // 3. Create initial headless menu page (async, don't wait)
        triggerPageGeneration(user.uid, dispensaryName).catch(err =>
            console.error('[LinkDispensary] Page generation failed:', err)
        );

        return {
            success: true,
            message: `Successfully linked ${dispensaryName}. Menu sync and competitor discovery starting...`
        };
    } catch (error: any) {
        console.error('[LinkDispensary] Link error:', error);
        return { success: false, message: error.message || 'Failed to link dispensary' };
    }
}

/**
 * Trigger CannMenus menu sync in background
 */
async function triggerMenuSync(cannmenusId: string, userId: string) {
    const cannMenus = new CannMenusService();
    try {
        // Fetch menu from CannMenus and store products
        const products = await cannMenus.getRetailerInventory(cannmenusId);
        
        if (products && products.length > 0) {
            const { firestore } = await createServerClient();
            const batch = firestore.batch();
            
            // Store products under the dispensary's menu
            const menuRef = firestore.collection('dispensaries').doc(userId).collection('menu');
            
            for (const product of products.slice(0, 200)) { // Limit to 200 for initial sync
                const docId = product.id || `${product.name?.replace(/\s+/g, '-')}-${Date.now()}`;
                const docRef = menuRef.doc(docId);
                batch.set(docRef, {
                    ...product,
                    syncedAt: new Date(),
                    source: 'cannmenus'
                }, { merge: true });
            }
            
            await batch.commit();
            console.log(`[LinkDispensary] Synced ${Math.min(products.length, 200)} products for ${userId}`);
        }
    } catch (error) {
        console.error('[LinkDispensary] Menu sync error:', error);
        throw error;
    }
}

/**
 * Trigger Ezal competitor discovery in background  
 */
async function triggerCompetitorDiscovery(tenantId: string, zip: string, ownId?: string) {
    const { autoSetupCompetitors } = await import('@/server/services/auto-competitor');
    const result = await autoSetupCompetitors(tenantId, zip, ownId);
    console.log(`[LinkDispensary] Discovered ${result.competitors.length} competitors for ${tenantId}`);
    return result;
}

/**
 * Trigger headless menu page generation in background
 */
async function triggerPageGeneration(userId: string, dispensaryName: string) {
    // Create a basic menu page record for the dispensary
    const { firestore } = await createServerClient();
    
    const slug = dispensaryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
    
    await firestore.collection('pages').doc(`menu-${userId}`).set({
        type: 'menu',
        ownerId: userId,
        title: `${dispensaryName} Menu`,
        slug: slug,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
    }, { merge: true });
    
    console.log(`[LinkDispensary] Created menu page for ${dispensaryName}`);
}

/**
 * Manually create a dispensary without linking to CannMenus
 */
export async function createManualDispensaryAction(
    dispensaryName: string,
    address: string,
    city: string,
    state: string,
    zip: string
): Promise<ActionResult> {
    try {
        const user = await requireUser(['dispensary', 'owner', 'super_admin']);
        const { firestore } = await createServerClient();

        const dispensaryRef = firestore.collection('dispensaries').doc(user.uid);
        
        await dispensaryRef.set({
            name: dispensaryName,
            address,
            city,
            state,
            zip,
            source: 'manual',
            createdAt: new Date(),
            ownerId: user.uid,
            status: 'active'
        }, { merge: true });

        // Update user profile
        await firestore.collection('users').doc(user.uid).set({
            linkedDispensary: {
                id: user.uid,
                name: dispensaryName,
                source: 'manual',
                linkedAt: new Date()
            }
        }, { merge: true });

        // ========== POST-CREATION SERVICE ACTIVATION ==========

        // 1. Auto-discover competitors using ZIP (async, don't wait)
        if (zip) {
            triggerCompetitorDiscovery(user.uid, zip, user.uid).catch(err =>
                console.error('[ManualCreate] Competitor discovery failed:', err)
            );
        }

        // 2. Create initial headless menu page (async, don't wait)
        triggerPageGeneration(user.uid, dispensaryName).catch(err =>
            console.error('[ManualCreate] Page generation failed:', err)
        );

        return {
            success: true,
            message: `Created ${dispensaryName}. You can now add products manually or connect a POS.`
        };

    } catch (error: any) {
        console.error('[LinkDispensary] Create error:', error);
        return { success: false, message: error.message || 'Failed to create dispensary' };
    }
}
