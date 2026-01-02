'use server';

import { createServerClient } from '@/firebase/server-client';
import { CRMBrand, CRMDispensary } from '@/server/services/crm-service';

export type TenantContext = {
    type: 'brand' | 'dispensary';
    crmData: CRMBrand | CRMDispensary;
    orgId?: string; // If claimed
};

/**
 * Resolve a slug to a Tenant (Brand or Dispensary).
 * Checks 'crm_brands' and 'crm_dispensaries'.
 */
export async function getTenantBySlugAction(slug: string): Promise<TenantContext | null> {
    const { firestore } = await createServerClient();

    // 1. Check Brands
    const brandQuery = await firestore.collection('crm_brands').where('slug', '==', slug).limit(1).get();
    if (!brandQuery.empty) {
        const doc = brandQuery.docs[0];
        const data = doc.data() as CRMBrand;
        return {
            type: 'brand',
            crmData: { ...data, id: doc.id },
            orgId: data.claimedOrgId || undefined
        };
    }

    // 2. Check Dispensaries
    const dispQuery = await firestore.collection('crm_dispensaries').where('slug', '==', slug).limit(1).get();
    if (!dispQuery.empty) {
        const doc = dispQuery.docs[0];
        const data = doc.data() as CRMDispensary;
        return {
            type: 'dispensary',
            crmData: { ...data, id: doc.id },
            orgId: data.claimedOrgId || undefined
        };
    }

    return null;
}
