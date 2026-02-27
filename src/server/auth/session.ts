'use server';

/**
 * Get server session user for server actions
 * Simplified wrapper around requireUser for common use case
 */

import { requireUser } from './auth';
import { getAdminFirestore } from '@/firebase/admin';

export async function getServerSessionUser() {
    try {
        const token = await requireUser();
        return {
            uid: token.uid,
            email: token.email || null,
            role: token.role || null,
            orgId: (token as { orgId?: string }).orgId || null,
            currentOrgId: (token as { currentOrgId?: string }).currentOrgId || null,
            brandId: (token as { brandId?: string }).brandId || null,
        };
    } catch (error) {
        return null;
    }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string) {
    const adminDb = getAdminFirestore();
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
        return null;
    }
    return { id: userDoc.id, ...userDoc.data() };
}
