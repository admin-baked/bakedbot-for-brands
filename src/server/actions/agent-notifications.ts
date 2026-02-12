'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import type { AgentNotification, AgentNotificationType } from '@/types/agent-notification';

// =============================================================================
// GET NOTIFICATIONS
// =============================================================================

export async function getNotifications(options?: {
    limit?: number;
    status?: 'unread' | 'read' | 'dismissed';
    type?: AgentNotificationType;
}): Promise<AgentNotification[]> {
    try {
        const user = await requireUser();
        const { firestore } = await createServerClient();

        let query: FirebaseFirestore.Query = firestore
            .collection('users')
            .doc(user.uid)
            .collection('agent_notifications')
            .orderBy('createdAt', 'desc');

        if (options?.status) {
            query = query.where('status', '==', options.status);
        }

        query = query.limit(options?.limit || 50);

        const snap = await query.get();

        return snap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || new Date(),
                updatedAt: data.updatedAt?.toDate?.() || new Date(),
            } as AgentNotification;
        });
    } catch (error) {
        logger.error('[AGENT_NOTIFICATIONS] Failed to get notifications', {
            error: (error as Error).message,
        });
        return [];
    }
}

// =============================================================================
// UNREAD COUNT
// =============================================================================

export async function getUnreadCount(): Promise<number> {
    try {
        const user = await requireUser();
        const { firestore } = await createServerClient();

        const snap = await firestore
            .collection('users')
            .doc(user.uid)
            .collection('agent_notifications')
            .where('status', '==', 'unread')
            .count()
            .get();

        return snap.data().count;
    } catch (error) {
        logger.error('[AGENT_NOTIFICATIONS] Failed to get unread count', {
            error: (error as Error).message,
        });
        return 0;
    }
}

// =============================================================================
// MARK READ / DISMISS
// =============================================================================

export async function markNotificationRead(notificationId: string): Promise<boolean> {
    try {
        const user = await requireUser();
        const { firestore } = await createServerClient();

        await firestore
            .collection('users')
            .doc(user.uid)
            .collection('agent_notifications')
            .doc(notificationId)
            .update({
                status: 'read',
                updatedAt: new Date(),
            });

        return true;
    } catch (error) {
        logger.error('[AGENT_NOTIFICATIONS] Failed to mark read', {
            error: (error as Error).message,
            notificationId,
        });
        return false;
    }
}

export async function markAllRead(): Promise<boolean> {
    try {
        const user = await requireUser();
        const { firestore } = await createServerClient();

        const snap = await firestore
            .collection('users')
            .doc(user.uid)
            .collection('agent_notifications')
            .where('status', '==', 'unread')
            .limit(100)
            .get();

        if (snap.empty) return true;

        const batch = firestore.batch();
        snap.docs.forEach(doc => {
            batch.update(doc.ref, { status: 'read', updatedAt: new Date() });
        });
        await batch.commit();

        return true;
    } catch (error) {
        logger.error('[AGENT_NOTIFICATIONS] Failed to mark all read', {
            error: (error as Error).message,
        });
        return false;
    }
}

export async function dismissNotification(notificationId: string): Promise<boolean> {
    try {
        const user = await requireUser();
        const { firestore } = await createServerClient();

        await firestore
            .collection('users')
            .doc(user.uid)
            .collection('agent_notifications')
            .doc(notificationId)
            .update({
                status: 'dismissed',
                updatedAt: new Date(),
            });

        return true;
    } catch (error) {
        logger.error('[AGENT_NOTIFICATIONS] Failed to dismiss notification', {
            error: (error as Error).message,
            notificationId,
        });
        return false;
    }
}
