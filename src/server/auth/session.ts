'use server';

/**
 * Get server session user for server actions
 * Simplified wrapper around requireUser for common use case
 */

import { requireUser } from './auth';
import { adminDb } from '@/firebase/admin';

export async function getServerSessionUser() {
    try {
        const token = await requireUser();
        return {
            uid: token.uid,
            email: token.email || null,
            role: token.role || null,
        };
    } catch (error) {
        return null;
    }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string) {
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
        return null;
    }
    return { id: userDoc.id, ...userDoc.data() };
}
