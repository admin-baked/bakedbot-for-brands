
'use server';

import { createServerClient } from '@/firebase/server-client';
import { revalidatePath } from 'next/cache';
import { getServerSessionUser } from '@/server/auth/session';
import { isSuperUser } from './delete-account';

export async function verifyClaimAction(claimId: string, entityId: string) {
    // Security: Require Super User access for claim verification
    const currentUser = await getServerSessionUser();
    if (!currentUser || !(await isSuperUser(currentUser.uid, currentUser.email))) {
        throw new Error('Unauthorized: Super User access required');
    }

    const { firestore } = await createServerClient();

    // 1. Update Claim Status
    await firestore.collection('brandClaims').doc(claimId).update({
        status: 'verified',
        verifiedAt: new Date(),
        verifiedBy: currentUser.uid
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
    // Security: Require Super User access for claim rejection
    const currentUser = await getServerSessionUser();
    if (!currentUser || !(await isSuperUser(currentUser.uid, currentUser.email))) {
        throw new Error('Unauthorized: Super User access required');
    }

    const { firestore } = await createServerClient();

    await firestore.collection('brandClaims').doc(claimId).update({
        status: 'rejected',
        verifiedAt: new Date(),
        verifiedBy: currentUser.uid
    });

    revalidatePath('/admin/claims');
}
