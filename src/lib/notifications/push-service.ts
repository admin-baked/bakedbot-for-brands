/**
 * Push Notification Service
 * Handles FCM push notifications
 */

'use server';

import { createServerClient } from '@/firebase/server-client';

export interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    url?: string;
    data?: Record<string, string>;
}

/**
 * Send push notification to user
 */
export async function sendPushNotification(
    userId: string,
    payload: NotificationPayload
): Promise<boolean> {
    try {
        const { firestore } = await createServerClient();

        // Get user's FCM tokens
        const userDoc = await firestore.collection('users').doc(userId).get();
        const fcmTokens = userDoc.data()?.fcmTokens || [];

        if (fcmTokens.length === 0) {
            console.log('[Push] No FCM tokens for user:', userId);
            return false;
        }

        // TODO: Implement actual FCM sending
        // This requires Firebase Admin SDK messaging
        // For now, store notification in Firestore
        await firestore.collection('users').doc(userId).collection('notifications').add({
            ...payload,
            read: false,
            createdAt: new Date(),
        });

        console.log('[Push] Notification queued for user:', userId);
        return true;
    } catch (error) {
        console.error('[Push] Error sending notification:', error);
        return false;
    }
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeToPush(
    userId: string,
    fcmToken: string
): Promise<void> {
    const { firestore } = await createServerClient();

    await firestore.collection('users').doc(userId).update({
        fcmTokens: firestore.FieldValue.arrayUnion(fcmToken),
    });
}

/**
 * Unsubscribe user from push notifications
 */
export async function unsubscribeFromPush(
    userId: string,
    fcmToken: string
): Promise<void> {
    const { firestore } = await createServerClient();

    await firestore.collection('users').doc(userId).update({
        fcmTokens: firestore.FieldValue.arrayRemove(fcmToken),
    });
}
