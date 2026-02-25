'use server';

/**
 * Driver FCM Token Registration
 *
 * Called from the DriverFcmRegistrar client component after the driver
 * grants notification permission. Saves the FCM token to the driver document
 * so the dispatch system can send push notifications on assignment.
 */

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Save or update the FCM push token for the current driver.
 */
export async function registerDriverFcmToken(fcmToken: string) {
    try {
        const currentUser = await requireUser(['delivery_driver']);
        const { firestore } = await createServerClient();

        const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
        const driverId = userDoc.data()?.driverId;

        if (!driverId) {
            return { success: false, error: 'Driver profile not linked to this account' };
        }

        await firestore.collection('drivers').doc(driverId).update({
            fcmToken,
            fcmTokenUpdatedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Driver FCM token registered', { driverId, userId: currentUser.uid });
        return { success: true };
    } catch (error) {
        logger.error('Failed to register FCM token', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save push token',
        };
    }
}
