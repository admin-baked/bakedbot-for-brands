'use server';

/**
 * Public Delivery Tracking Actions
 *
 * NO authentication required - customers can track with delivery ID
 * Limited information exposed for privacy
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/monitoring';
import type { Delivery } from '@/types/delivery';

/**
 * Get delivery status for public tracking (no auth required)
 * Returns limited information for customer privacy
 */
export async function getPublicDeliveryStatus(deliveryId: string) {
    try {
        const { firestore } = await createServerClient();

        const deliveryDoc = await firestore.collection('deliveries').doc(deliveryId).get();

        if (!deliveryDoc.exists) {
            return {
                success: false,
                error: 'Delivery not found',
            };
        }

        const delivery = {
            id: deliveryDoc.id,
            ...deliveryDoc.data(),
        } as Delivery;

        // Return only customer-safe information
        // Do NOT expose: driver personal info, customer phone, order contents
        const publicDelivery = {
            id: delivery.id,
            orderId: delivery.orderId,
            status: delivery.status,
            deliveryAddress: {
                street: delivery.deliveryAddress.street,
                city: delivery.deliveryAddress.city,
                state: delivery.deliveryAddress.state,
                zip: delivery.deliveryAddress.zip,
                // Hide phone number for privacy
            },
            deliveryWindow: delivery.deliveryWindow,
            deliveryFee: delivery.deliveryFee,
            createdAt: delivery.createdAt,
            departedAt: delivery.departedAt,
            arrivedAt: delivery.arrivedAt,
            deliveredAt: delivery.deliveredAt,
            // Include driver location only when in transit (for ETA calculation)
            driverLocation: ['in_transit', 'arrived'].includes(delivery.status)
                ? delivery.driverLocation
                : null,
        };

        return {
            success: true,
            delivery: publicDelivery as any,
        };
    } catch (error) {
        logger.error('Get public delivery status failed', { error, deliveryId });
        return {
            success: false,
            error: 'Failed to load delivery status',
        };
    }
}
