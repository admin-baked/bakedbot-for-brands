'use server';

/**
 * Club member data fetching for the customer PWA.
 * Queries top-level Firestore collections: members, memberships, passes, rewards.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { Member, Membership, Pass, Reward } from '@/types/club';

// ── Read operations ───────────────────────────────────────────────────────────

export async function getClubMemberData(orgId: string, phone: string): Promise<{
    member: Member | null;
    membership: Membership | null;
    pass: Pass | null;
    pointsBalance: number;
    rewards: Reward[];
}> {
    const empty = { member: null, membership: null, pass: null, pointsBalance: 0, rewards: [] };

    if (!orgId || !phone) return empty;

    try {
        const db = getAdminFirestore();

        // Normalize phone: strip non-digits, ensure 11-digit US format
        const digits = phone.replace(/\D/g, '');
        const normalizedPhone = digits.length === 10 ? `1${digits}` : digits;

        // 1. Find member by orgId + phone
        const memberSnap = await db.collection('members')
            .where('organizationId', '==', orgId)
            .where('phone', '==', normalizedPhone)
            .limit(1)
            .get();

        if (memberSnap.empty) return empty;

        const member = memberSnap.docs[0].data() as Member;

        // 2. Find active membership for this member
        const mshipSnap = await db.collection('memberships')
            .where('memberId', '==', member.id)
            .where('organizationId', '==', orgId)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        const membership = mshipSnap.empty ? null : (mshipSnap.docs[0].data() as Membership);

        // 3. Find active pass
        const passSnap = await db.collection('passes')
            .where('memberId', '==', member.id)
            .where('organizationId', '==', orgId)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        const pass = passSnap.empty ? null : (passSnap.docs[0].data() as Pass);

        // 4. Calculate points balance from membership stats
        const pointsBalance = membership
            ? (membership.stats.lifetimePointsEarned - membership.stats.lifetimePointsRedeemed)
            : 0;

        // 5. Fetch rewards
        const rewards = await getClubRewards(orgId, member.id);

        return { member, membership, pass, pointsBalance, rewards };
    } catch (err) {
        logger.error('[club] getClubMemberData failed', { orgId, error: err });
        return empty;
    }
}

export async function getClubRewards(orgId: string, memberId: string): Promise<Reward[]> {
    try {
        const db = getAdminFirestore();

        const snap = await db.collection('rewards')
            .where('organizationId', '==', orgId)
            .where('memberId', '==', memberId)
            .where('status', 'in', ['available', 'locked'])
            .get();

        const rewards = snap.docs.map(d => d.data() as Reward);

        // Sort: available first, then locked; within each group sort by expiresAt ascending
        rewards.sort((a, b) => {
            if (a.status !== b.status) return a.status === 'available' ? -1 : 1;
            const aExp = a.expiresAt ?? '9999';
            const bExp = b.expiresAt ?? '9999';
            return aExp.localeCompare(bExp);
        });

        return rewards;
    } catch (err) {
        logger.error('[club] getClubRewards failed', { orgId, memberId, error: err });
        return [];
    }
}

// ── Write operations ──────────────────────────────────────────────────────────

export async function updateMemberProfile(memberId: string, updates: {
    firstName?: string;
    lastName?: string;
    email?: string;
    preferences?: { favoriteCategories?: string[]; favoriteBrands?: string[] };
    communicationConsent?: { sms?: boolean; email?: boolean; push?: boolean };
}): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminFirestore();
        const ref = db.collection('members').doc(memberId);
        const doc = await ref.get();

        if (!doc.exists) {
            return { success: false, error: 'Member not found' };
        }

        const now = new Date().toISOString();
        const patch: Record<string, unknown> = { updatedAt: now };

        if (updates.firstName !== undefined) {
            patch.firstName = updates.firstName;
            patch.fullName = `${updates.firstName} ${updates.lastName ?? doc.data()?.lastName ?? ''}`.trim();
        }
        if (updates.lastName !== undefined) {
            patch.lastName = updates.lastName;
            patch.fullName = `${updates.firstName ?? doc.data()?.firstName ?? ''} ${updates.lastName}`.trim();
        }
        if (updates.email !== undefined) patch.email = updates.email;
        if (updates.preferences) patch.preferences = updates.preferences;
        if (updates.communicationConsent) {
            patch.communicationConsent = {
                ...updates.communicationConsent,
                updatedAt: now,
            };
        }

        await ref.update(patch);
        return { success: true };
    } catch (err) {
        logger.error('[club] updateMemberProfile failed', { memberId, error: err });
        return { success: false, error: 'Failed to update profile' };
    }
}
