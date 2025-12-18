/**
 * Claim Exclusivity Logic - Model B
 * 
 * One brand/dispensary can "own" a given ZIP page at a time (per type).
 * Others can be listed but not featured.
 * Claimed pages offer exclusive placement, data access, and messaging rights.
 */

import { createServerClient } from '@/firebase/server-client';
import { CoveragePackTier, COVERAGE_PACK_TIERS } from './coverage-packs';

// Claim status types
export type ClaimStatus = 'pending' | 'approved' | 'active' | 'expired' | 'revoked';
export type ClaimEntityType = 'brand' | 'dispensary';
export type PageType = 'zip' | 'city' | 'dispensary';

// Claim record stored in Firestore
export interface PageClaim {
    id: string; // claim_${pageType}_${pageId}_${entityType}
    pageId: string; // e.g., "zip_60601" or "city_chicago"
    pageType: PageType;
    entityType: ClaimEntityType;
    entityId: string; // Brand or dispensary ID
    entityName: string;

    // Claim status
    status: ClaimStatus;
    claimedAt: Date;
    expiresAt: Date | null;

    // Billing (Authorize.net)
    tierId: string;
    authorizeNetSubscriptionId?: string;

    // Invite tracking
    invitedBy?: string; // User ID of inviter
    inviteCode?: string;

    // Usage tracking
    usageThisMonth: {
        pageviews: number;
        smokeySessions: number;
        menuSyncs: number;
        deeboChecks: number;
    };

    // Exclusive features unlocked
    featuresUnlocked: string[];
}

// Invite record for invite-only access
export interface ClaimInvite {
    id: string;
    code: string;
    email: string;
    entityType: ClaimEntityType;
    pageIds: string[]; // Pages this invite covers
    createdBy: string;
    createdAt: Date;
    expiresAt: Date;
    usedAt?: Date;
    usedBy?: string;
}

/**
 * Check if a page is available to claim
 */
export async function isPageClaimable(
    pageId: string,
    pageType: PageType,
    entityType: ClaimEntityType
): Promise<{ claimable: boolean; currentOwner?: string; reason?: string }> {
    const { firestore } = await createServerClient();

    // Query for active claims on this page
    const claimsSnapshot = await firestore
        .collection('page_claims')
        .where('pageId', '==', pageId)
        .where('pageType', '==', pageType)
        .where('entityType', '==', entityType)
        .where('status', 'in', ['active', 'approved'])
        .limit(1)
        .get();

    if (!claimsSnapshot.empty) {
        const existingClaim = claimsSnapshot.docs[0].data() as PageClaim;
        return {
            claimable: false,
            currentOwner: existingClaim.entityName,
            reason: `This ${pageType} page is already claimed by ${existingClaim.entityName}`
        };
    }

    return { claimable: true };
}

/**
 * Get all claims for an entity (brand or dispensary)
 */
export async function getEntityClaims(
    entityId: string,
    entityType: ClaimEntityType
): Promise<PageClaim[]> {
    const { firestore } = await createServerClient();

    const snapshot = await firestore
        .collection('page_claims')
        .where('entityId', '==', entityId)
        .where('entityType', '==', entityType)
        .where('status', 'in', ['active', 'approved', 'pending'])
        .get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as PageClaim));
}

/**
 * Check if entity can claim more pages based on tier
 */
export async function canEntityClaimMore(
    entityId: string,
    entityType: ClaimEntityType,
    tierId: string
): Promise<{ canClaim: boolean; currentCount: number; limit: number; remaining: number }> {
    const tier = COVERAGE_PACK_TIERS.find(t => t.id === tierId);
    if (!tier) {
        return { canClaim: false, currentCount: 0, limit: 0, remaining: 0 };
    }

    // Unlimited tier
    if (tier.zipLimit === -1) {
        const claims = await getEntityClaims(entityId, entityType);
        return { canClaim: true, currentCount: claims.length, limit: -1, remaining: -1 };
    }

    const claims = await getEntityClaims(entityId, entityType);
    const currentCount = claims.length;
    const remaining = Math.max(0, tier.zipLimit - currentCount);

    return {
        canClaim: remaining > 0,
        currentCount,
        limit: tier.zipLimit,
        remaining
    };
}

/**
 * Create a claim request (pending approval)
 */
export async function createClaimRequest(
    pageId: string,
    pageType: PageType,
    entityId: string,
    entityType: ClaimEntityType,
    entityName: string,
    tierId: string,
    inviteCode?: string
): Promise<{ success: boolean; claimId?: string; error?: string }> {
    const { firestore } = await createServerClient();

    // Check if page is claimable
    const { claimable, reason } = await isPageClaimable(pageId, pageType, entityType);
    if (!claimable) {
        return { success: false, error: reason };
    }

    // Check if entity can claim more
    const { canClaim, remaining } = await canEntityClaimMore(entityId, entityType, tierId);
    if (!canClaim) {
        return {
            success: false,
            error: `You've reached your claim limit. Upgrade your plan to claim more pages. (${remaining} remaining)`
        };
    }

    // Validate invite code if required
    if (inviteCode) {
        const inviteSnapshot = await firestore
            .collection('claim_invites')
            .where('code', '==', inviteCode)
            .where('usedAt', '==', null)
            .limit(1)
            .get();

        if (inviteSnapshot.empty) {
            return { success: false, error: 'Invalid or expired invite code' };
        }
    }

    // Get tier for features
    const tier = COVERAGE_PACK_TIERS.find(t => t.id === tierId);

    const claimId = `claim_${pageType}_${pageId}_${entityType}_${entityId}`;
    const claim: Omit<PageClaim, 'id'> = {
        pageId,
        pageType,
        entityType,
        entityId,
        entityName,
        status: inviteCode ? 'approved' : 'pending', // Auto-approve if using invite
        claimedAt: new Date(),
        expiresAt: null,
        tierId,
        inviteCode,
        usageThisMonth: {
            pageviews: 0,
            smokeySessions: 0,
            menuSyncs: 0,
            deeboChecks: 0
        },
        featuresUnlocked: tier?.exclusiveFeatures || []
    };

    await firestore.collection('page_claims').doc(claimId).set(claim);

    // Mark invite as used
    if (inviteCode) {
        const inviteSnapshot = await firestore
            .collection('claim_invites')
            .where('code', '==', inviteCode)
            .limit(1)
            .get();

        if (!inviteSnapshot.empty) {
            await inviteSnapshot.docs[0].ref.update({
                usedAt: new Date(),
                usedBy: entityId
            });
        }
    }

    return { success: true, claimId };
}

/**
 * Approve a pending claim (admin action)
 */
export async function approveClaim(
    claimId: string,
    approvedBy: string
): Promise<{ success: boolean; error?: string }> {
    const { firestore } = await createServerClient();

    const claimRef = firestore.collection('page_claims').doc(claimId);
    const claimDoc = await claimRef.get();

    if (!claimDoc.exists) {
        return { success: false, error: 'Claim not found' };
    }

    const claim = claimDoc.data() as PageClaim;
    if (claim.status !== 'pending') {
        return { success: false, error: `Claim is not pending (status: ${claim.status})` };
    }

    await claimRef.update({
        status: 'approved',
        approvedBy,
        approvedAt: new Date()
    });

    return { success: true };
}

/**
 * Activate a claim (after billing confirmed)
 */
export async function activateClaim(
    claimId: string,
    authorizeNetSubscriptionId: string
): Promise<{ success: boolean; error?: string }> {
    const { firestore } = await createServerClient();

    const claimRef = firestore.collection('page_claims').doc(claimId);
    const claimDoc = await claimRef.get();

    if (!claimDoc.exists) {
        return { success: false, error: 'Claim not found' };
    }

    await claimRef.update({
        status: 'active',
        authorizeNetSubscriptionId,
        activatedAt: new Date()
    });

    return { success: true };
}

/**
 * Revoke a claim (admin action)
 */
export async function revokeClaim(
    claimId: string,
    revokedBy: string,
    reason: string
): Promise<{ success: boolean; error?: string }> {
    const { firestore } = await createServerClient();

    const claimRef = firestore.collection('page_claims').doc(claimId);
    const claimDoc = await claimRef.get();

    if (!claimDoc.exists) {
        return { success: false, error: 'Claim not found' };
    }

    await claimRef.update({
        status: 'revoked',
        revokedBy,
        revokedAt: new Date(),
        revokeReason: reason
    });

    return { success: true };
}

/**
 * Generate an invite code
 */
export async function generateInviteCode(
    email: string,
    entityType: ClaimEntityType,
    pageIds: string[],
    createdBy: string,
    expiresInDays: number = 30
): Promise<{ success: boolean; code?: string; error?: string }> {
    const { firestore } = await createServerClient();

    // Generate unique code
    const code = `BKD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const invite: Omit<ClaimInvite, 'id'> = {
        code,
        email,
        entityType,
        pageIds,
        createdBy,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    };

    const inviteId = `invite_${code}`;
    await firestore.collection('claim_invites').doc(inviteId).set(invite);

    return { success: true, code };
}

/**
 * Check entity's claim status on a specific page
 */
export async function getClaimStatus(
    pageId: string,
    pageType: PageType,
    entityId: string,
    entityType: ClaimEntityType
): Promise<PageClaim | null> {
    const { firestore } = await createServerClient();

    const claimId = `claim_${pageType}_${pageId}_${entityType}_${entityId}`;
    const claimDoc = await firestore.collection('page_claims').doc(claimId).get();

    if (!claimDoc.exists) {
        return null;
    }

    return { id: claimDoc.id, ...claimDoc.data() } as PageClaim;
}

/**
 * Get the current owner of a page (if any)
 */
export async function getPageOwner(
    pageId: string,
    pageType: PageType,
    entityType: ClaimEntityType
): Promise<PageClaim | null> {
    const { firestore } = await createServerClient();

    const snapshot = await firestore
        .collection('page_claims')
        .where('pageId', '==', pageId)
        .where('pageType', '==', pageType)
        .where('entityType', '==', entityType)
        .where('status', '==', 'active')
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as PageClaim;
}
