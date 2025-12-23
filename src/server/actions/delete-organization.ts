'use server';

/**
 * Server actions for deleting organizations (brands/dispensaries)
 * SUPER USER ONLY - Destructive operations for testing
 */

import { adminDb } from '@/firebase/admin';
import { getServerSessionUser } from '@/server/auth/session';
import { isSuperUser } from './delete-account';

/**
 * Delete a brand and all associated data
 * @param brandId - Brand ID to delete
 * @returns Success status and error message if any
 */
export async function deleteBrand(brandId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const currentUser = await getServerSessionUser();
        if (!currentUser || !(await isSuperUser(currentUser.uid))) {
            return { success: false, error: 'Unauthorized: Super User access required' };
        }

        await deleteOrganizationData('brand', brandId);
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting brand:', error);
        return { success: false, error: error.message || 'Failed to delete brand' };
    }
}

/**
 * Delete a dispensary and all associated data
 * @param dispensaryId - Dispensary ID to delete
 * @returns Success status and error message if any
 */
export async function deleteDispensary(dispensaryId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const currentUser = await getServerSessionUser();
        if (!currentUser || !(await isSuperUser(currentUser.uid))) {
            return { success: false, error: 'Unauthorized: Super User access required' };
        }

        await deleteOrganizationData('dispensary', dispensaryId);
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting dispensary:', error);
        return { success: false, error: error.message || 'Failed to delete dispensary' };
    }
}

/**
 * Delete organization data and all associated records
 */
async function deleteOrganizationData(type: 'brand' | 'dispensary', orgId: string): Promise<void> {
    const batch = adminDb.batch();
    const collection = type === 'brand' ? 'brands' : 'retailers';

    // Delete main organization document
    const orgRef = adminDb.collection(collection).doc(orgId);
    batch.delete(orgRef);

    // Delete subcollections
    const subcollections = ['playbooks', 'agents', 'contacts'];
    for (const subcollection of subcollections) {
        const subDocs = await orgRef.collection(subcollection).listDocuments();
        for (const doc of subDocs) {
            batch.delete(doc);
        }
    }

    // Delete SEO pages for this organization
    const pageQuery = type === 'brand'
        ? adminDb.collection('seo_pages').where('brandId', '==', orgId)
        : adminDb.collection('seo_pages').where('dispensaryId', '==', orgId);
    
    const pages = await pageQuery.get();
    pages.docs.forEach(doc => batch.delete(doc.ref));

    // Delete claims for this organization
    const claimsQuery = adminDb.collection('claims').where('entityId', '==', orgId);
    const claims = await claimsQuery.get();
    claims.docs.forEach(doc => batch.delete(doc.ref));

    // Delete products (brands only)
    if (type === 'brand') {
        const products = await adminDb.collection('products').where('brandId', '==', orgId).get();
        products.docs.forEach(doc => batch.delete(doc.ref));
    }

    // Delete knowledge base entries for this org
    const kbField = type === 'brand' ? 'brandId' : 'dispensaryId';
    const kbEntries = await adminDb.collection('knowledge_base').where(kbField, '==', orgId).get();
    kbEntries.docs.forEach(doc => batch.delete(doc.ref));

    // Update users - remove org associations
    const users = await adminDb.collection('users')
        .where('organizationIds', 'array-contains', orgId)
        .get();
    
    for (const userDoc of users.docs) {
        const userData = userDoc.data();
        const updatedOrgIds = (userData.organizationIds || []).filter((id: string) => id !== orgId);
        const updateData: any = { organizationIds: updatedOrgIds };
        
        // Clear legacy fields if they match
        if (type === 'brand' && userData.brandId === orgId) {
            updateData.brandId = null;
        }
        if (type === 'dispensary' && userData.locationId === orgId) {
            updateData.locationId = null;
        }
        
        // Clear current org if it matches
        if (userData.currentOrgId === orgId) {
            updateData.currentOrgId = updatedOrgIds[0] || null;
        }

        batch.update(userDoc.ref, updateData);
    }

    await batch.commit();
}

/**
 * Get all brands for Super User management
 */
export async function getAllBrands(): Promise<Array<{
    id: string;
    name: string;
    claimed: boolean;
    pageCount: number;
}>> {
    try {
        const currentUser = await getServerSessionUser();
        if (!currentUser || !(await isSuperUser(currentUser.uid))) {
            throw new Error('Unauthorized: Super User access required');
        }

        const brandsSnapshot = await adminDb.collection('brands').get();
        
        const brands = await Promise.all(brandsSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            
            // Count SEO pages for this brand
            const pagesSnapshot = await adminDb.collection('seo_pages')
                .where('brandId', '==', doc.id)
                .count()
                .get();

            return {
                id: doc.id,
                name: data.name || 'Unknown',
                claimed: data.claimed || false,
                pageCount: pagesSnapshot.data().count,
            };
        }));

        return brands;
    } catch (error) {
        console.error('Error fetching brands:', error);
        throw error;
    }
}

/**
 * Get all dispensaries for Super User management
 */
export async function getAllDispensaries(): Promise<Array<{
    id: string;
    name: string;
    claimed: boolean;
    pageCount: number;
}>> {
    try {
        const currentUser = await getServerSessionUser();
        if (!currentUser || !(await isSuperUser(currentUser.uid))) {
            throw new Error('Unauthorized: Super User access required');
        }

        const dispensariesSnapshot = await adminDb.collection('retailers').get();
        
        const dispensaries = await Promise.all(dispensariesSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            
            // Count SEO pages for this dispensary
            const pagesSnapshot = await adminDb.collection('seo_pages')
                .where('dispensaryId', '==', doc.id)
                .count()
                .get();

            return {
                id: doc.id,
                name: data.name || 'Unknown',
                claimed: data.claimed || false,
                pageCount: pagesSnapshot.data().count,
            };
        }));

        return dispensaries;
    } catch (error) {
        console.error('Error fetching dispensaries:', error);
        throw error;
    }
}
