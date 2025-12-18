'use server';

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/monitoring';

/**
 * Check if a brand or dispensary is claimed (and paid)
 * Returns true only if the entity has an approved claim AND active subscription
 */
export async function isEntityClaimed(
    entityId: string,
    entityType: 'brand' | 'dispensary'
): Promise<boolean> {
    try {
        const { firestore } = await createServerClient();

        // 1. Check for approved claim
        const claimsSnapshot = await firestore
            .collection('brandClaims')
            .where(entityType === 'brand' ? 'brandId' : 'dispensaryId', '==', entityId)
            .where('status', '==', 'verified')
            .limit(1)
            .get();

        if (claimsSnapshot.empty) {
            return false;
        }

        const claim = claimsSnapshot.docs[0].data();
        const userId = claim.userId;

        // 2. Check for active subscription
        const subscriptionsSnapshot = await firestore
            .collection('subscriptions')
            .where('userId', '==', userId)
            .where('status', 'in', ['active', 'trialing'])
            .limit(1)
            .get();

        // Only return true if claim is verified AND has active subscription
        return !subscriptionsSnapshot.empty;
    } catch (error) {
        logger.error('Error checking entity claim status:', error);
        return false;
    }
}

/**
 * Get claim details for display
 */
export async function getClaimDetails(
    entityId: string,
    entityType: 'brand' | 'dispensary'
): Promise<{
    isClaimed: boolean;
    isPaid: boolean;
    claimId?: string;
    verifiedAt?: Date;
}> {
    try {
        const { firestore } = await createServerClient();

        const claimsSnapshot = await firestore
            .collection('brandClaims')
            .where(entityType === 'brand' ? 'brandId' : 'dispensaryId', '==', entityId)
            .where('status', '==', 'verified')
            .limit(1)
            .get();

        if (claimsSnapshot.empty) {
            return { isClaimed: false, isPaid: false };
        }

        const claimDoc = claimsSnapshot.docs[0];
        const claim = claimDoc.data();

        const subscriptionsSnapshot = await firestore
            .collection('subscriptions')
            .where('userId', '==', claim.userId)
            .where('status', 'in', ['active', 'trialing'])
            .limit(1)
            .get();

        return {
            isClaimed: true,
            isPaid: !subscriptionsSnapshot.empty,
            claimId: claimDoc.id,
            verifiedAt: claim.verifiedAt?.toDate?.() || undefined,
        };
    } catch (error) {
        logger.error('Error getting claim details:', error);
        return { isClaimed: false, isPaid: false };
    }
}
