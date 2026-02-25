/**
 * Delivery FCM Push Notification Service
 *
 * Sends Firebase Cloud Messaging push notifications to drivers
 * when new deliveries are assigned to them.
 *
 * Server-side only — uses Firebase Admin SDK.
 * Non-fatal: token errors (expired, unregistered) are logged and swallowed.
 */

import 'server-only';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from '@/lib/logger';

/**
 * Ensure the Firebase Admin app is initialized and return a Messaging instance.
 * Follows the same initialization pattern as src/firebase/admin.ts.
 */
function getAdminMessaging() {
    if (getApps().length === 0) {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (serviceAccountKey) {
            let serviceAccount;
            try {
                serviceAccount = JSON.parse(serviceAccountKey);
            } catch {
                try {
                    serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));
                } catch {
                    // fall through to applicationDefault
                }
            }
            if (serviceAccount) {
                initializeApp({ credential: cert(serviceAccount) });
            } else {
                initializeApp({
                    credential: applicationDefault(),
                    projectId: 'studio-567050101-bc6e8',
                });
            }
        } else {
            initializeApp({
                credential: applicationDefault(),
                projectId: 'studio-567050101-bc6e8',
            });
        }
    }
    const app = getApps()[0];
    if (!app) throw new Error('Firebase Admin app not initialized');
    return getMessaging(app);
}

/**
 * Send a push notification to a driver when a delivery is assigned.
 * Errors are swallowed — FCM failure should never fail a dispatch.
 */
export async function sendDriverAssignmentPush(
    fcmToken: string,
    deliveryId: string,
    orderId: string,
    address: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const messaging = getAdminMessaging();

        const messageId = await messaging.send({
            token: fcmToken,
            notification: {
                title: 'New Delivery Assigned',
                body: `Order #${orderId.slice(-8).toUpperCase()} — ${address}`,
            },
            data: {
                deliveryId,
                type: 'new_assignment',
                clickAction: `/driver/delivery/${deliveryId}`,
            },
            webpush: {
                fcmOptions: {
                    link: `/driver/delivery/${deliveryId}`,
                },
                notification: {
                    icon: '/icons/driver-icon-192.png',
                    badge: '/icons/driver-icon-192.png',
                    requireInteraction: true,
                },
            },
        });

        logger.info('Driver FCM push sent', { deliveryId, messageId });
        return { success: true, messageId };
    } catch (error) {
        // Non-fatal: token expired, app uninstalled, etc.
        logger.warn('FCM push failed (non-fatal)', {
            error,
            deliveryId,
            tokenPrefix: fcmToken.slice(0, 20),
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'FCM send failed',
        };
    }
}
