'use server';

import { requireSuperUser } from '@/server/auth/auth';
import { getAdminAuth, getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export interface CreateOrgOwnerResult {
    success: boolean;
    uid?: string;
    email?: string;
    created: boolean; // true = new user, false = existing user linked
    error?: string;
}

export async function createOrgOwner(
    orgId: string,
    email: string,
    displayName?: string
): Promise<CreateOrgOwnerResult> {
    await requireSuperUser();

    const auth = getAdminAuth();
    const db = getAdminFirestore();

    const orgRef = db.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
        return { success: false, created: false, error: `Org not found: ${orgId}` };
    }
    const org = orgSnap.data() as Record<string, unknown>;
    const name = displayName ?? (org.name as string) ?? orgId;

    let uid: string;
    let created = false;

    // Create or fetch the Auth user
    try {
        const existing = await auth.getUserByEmail(email);
        uid = existing.uid;
    } catch {
        // User doesn't exist — create with a temp password (owner must reset)
        const tempPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10).toUpperCase() + '!1';
        const newUser = await auth.createUser({ email, displayName: name, password: tempPassword });
        uid = newUser.uid;
        created = true;
        logger.info('[CreateOrgOwner] Created Auth user', { uid, email, orgId });
    }

    try {
        // Set custom claims: dispensary role + orgId
        await auth.setCustomUserClaims(uid, { role: 'dispensary', orgId });

        // Write/merge user profile
        await db.collection('users').doc(uid).set({
            uid,
            email,
            displayName: name,
            role: 'dispensary',
            approvalStatus: 'approved',
            organizationIds: [orgId],
            currentOrgId: orgId,
            updatedAt: new Date(),
            ...(created ? { createdAt: new Date() } : {}),
        }, { merge: true });

        // Set ownerId on org doc
        await orgRef.update({ ownerId: uid, updatedAt: new Date() });

        logger.info('[CreateOrgOwner] Owner linked', { orgId, uid, email, created });
        return { success: true, uid, email, created };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error('[CreateOrgOwner] Failed', { orgId, email, error: msg });
        return { success: false, created, error: msg };
    }
}
