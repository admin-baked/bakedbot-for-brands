/**
 * Push Notification Service
 * Handles FCM push notifications
 */

'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';

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

        // Send FCM notifications
        const { getMessaging } = await import('firebase-admin/messaging');
        const messaging = getMessaging();

        const message = {
            notification: {
                title: payload.title,
                body: payload.body,
                ...(payload.icon && { imageUrl: payload.icon }),
            },
            ...(payload.data && { data: payload.data }),
            ...(payload.url && {
                webpush: {
                    fcmOptions: {
                        link: payload.url,
                    },
                },
            }),
        };

        // Send to all tokens
        const results = await Promise.allSettled(
            fcmTokens.map((token: string) =>
                messaging.send({ ...message, token })
            )
        );

        // Remove invalid tokens
        const invalidTokens = results
            .map((result, index) => {
                if (result.status === 'rejected') {
                    console.error('[Push] Failed to send to token:', fcmTokens[index], result.reason);
                    return fcmTokens[index];
                }
                return null;
            })
            .filter(Boolean);

        if (invalidTokens.length > 0) {
            await firestore.collection('users').doc(userId).update({
                fcmTokens: FieldValue.arrayRemove(...invalidTokens),
            });
        }

        // Also store notification in Firestore for in-app display
        await firestore.collection('users').doc(userId).collection('notifications').add({
            ...payload,
            read: false,
            createdAt: new Date(),
        });

        console.log('[Push] Notification sent to user:', userId);
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
        fcmTokens: FieldValue.arrayUnion(fcmToken),
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
        fcmTokens: FieldValue.arrayRemove(fcmToken),
    });
}
