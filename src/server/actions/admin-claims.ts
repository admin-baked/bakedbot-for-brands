
'use server';

import { createServerClient } from '@/firebase/server-client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function verifyClaimAction(claimId: string, entityId: string) {
    const { firestore } = await createServerClient();

    // 1. Update Claim Status
    await firestore.collection('brandClaims').doc(claimId).update({
        status: 'verified',
        verifiedAt: new Date(),
        verifiedBy: 'admin' // In real app, get current user ID
    });

    // 2. Update Entity Status (Brand/Retailer)
    // Assuming 'brands' collection for now, would need entityType from claim to be dynamic
    await firestore.collection('brands').doc(entityId).update({
        verificationStatus: 'verified',
        claimStatus: 'claimed',
        updatedAt: new Date()
    });

    revalidatePath('/admin/claims');
}

export async function rejectClaimAction(claimId: string) {
    const { firestore } = await createServerClient();

    await firestore.collection('brandClaims').doc(claimId).update({
        status: 'rejected',
        verifiedAt: new Date(),
        verifiedBy: 'admin'
    });

    revalidatePath('/admin/claims');
}
