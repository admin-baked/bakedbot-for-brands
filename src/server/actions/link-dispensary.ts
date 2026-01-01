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
 */
export async function linkDispensaryAction(
    cannmenusId: string,
    dispensaryName: string,
    dispensaryData?: Partial<DispensarySearchResult>
): Promise<ActionResult> {
    try {
        const user = await requireUser(['dispensary', 'owner', 'super_admin']);
        const { firestore } = await createServerClient();

        // Create/update dispensary document
        const dispensaryRef = firestore.collection('dispensaries').doc(user.uid);
        
        await dispensaryRef.set({
            name: dispensaryName,
            cannmenusId: cannmenusId,
            address: dispensaryData?.address || '',
            city: dispensaryData?.city || '',
            state: dispensaryData?.state || '',
            zip: dispensaryData?.zip || '',
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

        return {
            success: true,
            message: `Successfully linked ${dispensaryName}. Menu sync will begin shortly.`
        };
    } catch (error: any) {
        console.error('[LinkDispensary] Link error:', error);
        return { success: false, message: error.message || 'Failed to link dispensary' };
    }
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

        return {
            success: true,
            message: `Created ${dispensaryName}. You can now add products manually or connect a POS.`
        };
    } catch (error: any) {
        console.error('[LinkDispensary] Create error:', error);
        return { success: false, message: error.message || 'Failed to create dispensary' };
    }
}
