/**
 * Page Claims Server Actions - Model B
 * 
 * Server actions for the claim workflow:
 * - Claim a page (with optional invite code)
 * - Check claim status
 * - Manage claims (admin)
 */

'use server';

import {
    createClaimRequest,
    approveClaim,
    activateClaim,
    revokeClaim,
    isPageClaimable,
    getEntityClaims,
    canEntityClaimMore,
    generateInviteCode,
    getClaimStatus,
    getPageOwner,
    PageClaim,
    ClaimEntityType,
    PageType
} from '@/lib/claim-exclusivity';
import { createServerClient } from '@/firebase/server-client';

// Re-export types for client use
export type { PageClaim, ClaimEntityType, PageType };

/**
 * Claim a ZIP or city page
 */
export async function claimPage(
    pageId: string,
    pageType: PageType,
    entityId: string,
    entityType: ClaimEntityType,
    entityName: string,
    tierId: string,
    inviteCode?: string
): Promise<{ success: boolean; claimId?: string; error?: string }> {
    try {
        return await createClaimRequest(
            pageId,
            pageType,
            entityId,
            entityType,
            entityName,
            tierId,
            inviteCode
        );
    } catch (error) {
        console.error('Error claiming page:', error);
        return { success: false, error: 'Failed to process claim request' };
    }
}

/**
 * Check if a page is available for claiming
 */
export async function checkPageAvailability(
    pageId: string,
    pageType: PageType,
    entityType: ClaimEntityType
): Promise<{ available: boolean; currentOwner?: string; reason?: string }> {
    try {
        const result = await isPageClaimable(pageId, pageType, entityType);
        return {
            available: result.claimable,
            currentOwner: result.currentOwner,
            reason: result.reason
        };
    } catch (error) {
        console.error('Error checking availability:', error);
        return { available: false, reason: 'Failed to check availability' };
    }
}

/**
 * Get all claims for the current entity
 */
export async function getMyClaims(
    entityId: string,
    entityType: ClaimEntityType
): Promise<PageClaim[]> {
    try {
        return await getEntityClaims(entityId, entityType);
    } catch (error) {
        console.error('Error fetching claims:', error);
        return [];
    }
}

/**
 * Check claim capacity for an entity
 */
export async function getClaimCapacity(
    entityId: string,
    entityType: ClaimEntityType,
    tierId: string
): Promise<{ canClaim: boolean; used: number; limit: number; remaining: number }> {
    try {
        const result = await canEntityClaimMore(entityId, entityType, tierId);
        return {
            canClaim: result.canClaim,
            used: result.currentCount,
            limit: result.limit,
            remaining: result.remaining
        };
    } catch (error) {
        console.error('Error checking capacity:', error);
        return { canClaim: false, used: 0, limit: 0, remaining: 0 };
    }
}

/**
 * Admin: Approve a pending claim
 */
export async function adminApproveClaim(
    claimId: string,
    adminUserId: string
): Promise<{ success: boolean; error?: string }> {
    // TODO: Verify admin permissions
    try {
        return await approveClaim(claimId, adminUserId);
    } catch (error) {
        console.error('Error approving claim:', error);
        return { success: false, error: 'Failed to approve claim' };
    }
}

/**
 * Admin: Revoke a claim
 */
export async function adminRevokeClaim(
    claimId: string,
    adminUserId: string,
    reason: string
): Promise<{ success: boolean; error?: string }> {
    // TODO: Verify admin permissions
    try {
        return await revokeClaim(claimId, adminUserId, reason);
    } catch (error) {
        console.error('Error revoking claim:', error);
        return { success: false, error: 'Failed to revoke claim' };
    }
}

/**
 * Admin: Generate an invite code
 */
export async function adminGenerateInvite(
    email: string,
    entityType: ClaimEntityType,
    pageIds: string[],
    adminUserId: string,
    expiresInDays?: number
): Promise<{ success: boolean; code?: string; error?: string }> {
    // TODO: Verify admin permissions
    try {
        return await generateInviteCode(email, entityType, pageIds, adminUserId, expiresInDays);
    } catch (error) {
        console.error('Error generating invite:', error);
        return { success: false, error: 'Failed to generate invite' };
    }
}

/**
 * Billing webhook: Activate claim after payment
 */
export async function handleBillingActivation(
    claimId: string,
    stripeSubscriptionId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        return await activateClaim(claimId, stripeSubscriptionId);
    } catch (error) {
        console.error('Error activating claim:', error);
        return { success: false, error: 'Failed to activate claim' };
    }
}

/**
 * Get claim details for a page
 */
export async function getPageClaimDetails(
    pageId: string,
    pageType: PageType,
    entityId: string,
    entityType: ClaimEntityType
): Promise<PageClaim | null> {
    try {
        return await getClaimStatus(pageId, pageType, entityId, entityType);
    } catch (error) {
        console.error('Error getting claim details:', error);
        return null;
    }
}

/**
 * Get current owner of a page
 */
export async function getCurrentPageOwner(
    pageId: string,
    pageType: PageType,
    entityType: ClaimEntityType
): Promise<{ claimed: boolean; owner?: { id: string; name: string } }> {
    try {
        const owner = await getPageOwner(pageId, pageType, entityType);
        if (!owner) {
            return { claimed: false };
        }
        return {
            claimed: true,
            owner: {
                id: owner.entityId,
                name: owner.entityName
            }
        };
    } catch (error) {
        console.error('Error getting page owner:', error);
        return { claimed: false };
    }
}

/**
 * Admin: Get all pending claims for review
 */
export async function getPendingClaims(): Promise<PageClaim[]> {
    try {
        const { firestore } = await createServerClient();

        const snapshot = await firestore
            .collection('page_claims')
            .where('status', '==', 'pending')
            .orderBy('claimedAt', 'desc')
            .limit(50)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as PageClaim));
    } catch (error) {
        console.error('Error fetching pending claims:', error);
        return [];
    }
}

/**
 * Admin: Get all active claims
 */
export async function getActiveClaims(limit: number = 100): Promise<PageClaim[]> {
    try {
        const { firestore } = await createServerClient();

        const snapshot = await firestore
            .collection('page_claims')
            .where('status', '==', 'active')
            .orderBy('claimedAt', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as PageClaim));
    } catch (error) {
        console.error('Error fetching active claims:', error);
        return [];
    }
}
