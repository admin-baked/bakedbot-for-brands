'use server';

/**
 * LinkedIn Session Management — Super User Only
 *
 * Stores the Super User's LinkedIn `li_at` session cookie in Firestore so
 * agents (Craig for posting, Leo for messaging) can act on their behalf.
 *
 * Path: users/{uid}/integrations/linkedin
 */

import { getAdminFirestore } from '@/firebase/admin';
import { requireSuperUser, requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { FieldValue } from '@google-cloud/firestore';

export interface LinkedInSessionStatus {
    connected: boolean;
    connectedAt?: string;
}

/**
 * Save the Super User's li_at cookie. Requires super_user/super_admin role.
 */
export async function saveLinkedInSession(liAt: string): Promise<{ success: boolean; error?: string }> {
    await requireSuperUser();
    const user = await requireUser();

    if (!liAt || liAt.length < 10) {
        return { success: false, error: 'Invalid session cookie' };
    }

    try {
        const db = getAdminFirestore();
        await db
            .collection('users')
            .doc(user.uid)
            .collection('integrations')
            .doc('linkedin')
            .set({ liAt, connectedAt: FieldValue.serverTimestamp() });

        logger.info('[LinkedIn] Session saved', { uid: user.uid });
        return { success: true };
    } catch (err) {
        logger.error('[LinkedIn] Failed to save session', { error: String(err) });
        return { success: false, error: 'Failed to save session' };
    }
}

/**
 * Get LinkedIn connection status for the current Super User.
 */
export async function getLinkedInSessionStatus(): Promise<LinkedInSessionStatus> {
    await requireSuperUser();
    const user = await requireUser();

    try {
        const db = getAdminFirestore();
        const doc = await db
            .collection('users')
            .doc(user.uid)
            .collection('integrations')
            .doc('linkedin')
            .get();

        if (!doc.exists) return { connected: false };

        const data = doc.data() as { liAt?: string; connectedAt?: FirebaseFirestore.Timestamp };
        return {
            connected: !!data?.liAt,
            connectedAt: data?.connectedAt?.toDate().toISOString(),
        };
    } catch {
        return { connected: false };
    }
}

/**
 * Disconnect LinkedIn — removes the stored session.
 */
export async function disconnectLinkedIn(): Promise<void> {
    await requireSuperUser();
    const user = await requireUser();

    const db = getAdminFirestore();
    await db
        .collection('users')
        .doc(user.uid)
        .collection('integrations')
        .doc('linkedin')
        .delete();

    logger.info('[LinkedIn] Session disconnected', { uid: user.uid });
}
