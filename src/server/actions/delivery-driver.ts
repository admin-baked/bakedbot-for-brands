'use server';

/**
 * Delivery Driver Server Actions
 *
 * Actions for driver mobile app
 * Handles: Fetching assigned deliveries, updating status, GPS location updates
 */

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/lib/auth-helpers';
import { logger } from '@/lib/monitoring';
import type { Delivery } from '@/types/delivery';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

/**
 * Get deliveries assigned to the current driver
 */
export async function getDriverDeliveries() {
    try {
        const currentUser = await requireUser(['delivery_driver']);
        const { firestore } = await createServerClient();

        // Get driver ID from user document
        const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
        if (!userDoc.exists) {
            return {
                success: false,
                error: 'User profile not found',
                deliveries: [],
            };
        }

        const userData = userDoc.data();
        const driverId = userData?.driverId;

        if (!driverId) {
            return {
                success: false,
                error: 'Driver profile not linked. Please contact dispatch.',
                deliveries: [],
            };
        }

        // Query deliveries assigned to this driver
        const deliveriesSnapshot = await firestore
            .collection('deliveries')
            .where('driverId', '==', driverId)
            .where('status', 'in', ['assigned', 'in_transit', 'arrived', 'delivered'])
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const deliveries: Delivery[] = [];
        deliveriesSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
            deliveries.push({
                id: doc.id,
                ...doc.data(),
            } as Delivery);
        });

        return {
            success: true,
            deliveries,
        };
    } catch (error) {
        logger.error('Get driver deliveries failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to load deliveries',
            deliveries: [],
        };
    }
}

/**
 * Get a single delivery by ID (for driver app)
 */
export async function getDeliveryDetails(deliveryId: string) {
    try {
        const currentUser = await requireUser(['delivery_driver']);
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

        // Verify this delivery is assigned to the current driver
        const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        const driverId = userData?.driverId;

        if (delivery.driverId !== driverId) {
            return {
                success: false,
                error: 'Access denied. This delivery is not assigned to you.',
            };
        }

        return {
            success: true,
            delivery,
        };
    } catch (error) {
        logger.error('Get delivery details failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to load delivery',
        };
    }
}

/**
 * Update driver GPS location
 */
export async function updateDriverLocation(lat: number, lng: number) {
    try {
        const currentUser = await requireUser(['delivery_driver']);
        const { firestore } = await createServerClient();

        // Get driver ID
        const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        const driverId = userData?.driverId;

        if (!driverId) {
            return {
                success: false,
                error: 'Driver profile not found',
            };
        }

        // Update driver location
        await firestore
            .collection('drivers')
            .doc(driverId)
            .update({
                currentLocation: {
                    lat,
                    lng,
                    updatedAt: FieldValue.serverTimestamp(),
                },
                updatedAt: FieldValue.serverTimestamp(),
            });

        // Also update location in active delivery
        const activeDeliverySnapshot = await firestore
            .collection('deliveries')
            .where('driverId', '==', driverId)
            .where('status', 'in', ['in_transit', 'arrived'])
            .limit(1)
            .get();

        if (!activeDeliverySnapshot.empty) {
            const deliveryDoc = activeDeliverySnapshot.docs[0];
            await deliveryDoc.ref.update({
                'driverLocation.lat': lat,
                'driverLocation.lng': lng,
                'driverLocation.updatedAt': FieldValue.serverTimestamp(),
            });
        }

        return {
            success: true,
        };
    } catch (error) {
        logger.error('Update driver location failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update location',
        };
    }
}

/**
 * Start delivery (driver has departed dispensary)
 */
export async function startDelivery(deliveryId: string) {
    try {
        const currentUser = await requireUser(['delivery_driver']);
        const { firestore } = await createServerClient();

        const deliveryRef = firestore.collection('deliveries').doc(deliveryId);
        const deliveryDoc = await deliveryRef.get();

        if (!deliveryDoc.exists) {
            return {
                success: false,
                error: 'Delivery not found',
            };
        }

        const delivery = deliveryDoc.data() as Delivery;

        // Verify driver ownership
        const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
        const driverId = userDoc.data()?.driverId;

        if (delivery.driverId !== driverId) {
            return {
                success: false,
                error: 'Access denied',
            };
        }

        if (delivery.status !== 'assigned') {
            return {
                success: false,
                error: 'Delivery has already been started',
            };
        }

        // Update status to in_transit
        await deliveryRef.update({
            status: 'in_transit',
            departedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Delivery started', {
            deliveryId,
            driverId,
            userId: currentUser.uid,
        });

        return {
            success: true,
        };
    } catch (error) {
        logger.error('Start delivery failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to start delivery',
        };
    }
}

/**
 * Mark delivery as arrived (driver at customer location)
 */
export async function markArrived(deliveryId: string) {
    try {
        const currentUser = await requireUser(['delivery_driver']);
        const { firestore } = await createServerClient();

        const deliveryRef = firestore.collection('deliveries').doc(deliveryId);
        const deliveryDoc = await deliveryRef.get();

        if (!deliveryDoc.exists) {
            return {
                success: false,
                error: 'Delivery not found',
            };
        }

        const delivery = deliveryDoc.data() as Delivery;

        // Verify driver ownership
        const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
        const driverId = userDoc.data()?.driverId;

        if (delivery.driverId !== driverId) {
            return {
                success: false,
                error: 'Access denied',
            };
        }

        if (delivery.status !== 'in_transit') {
            return {
                success: false,
                error: 'Delivery must be in transit',
            };
        }

        // Update status to arrived
        await deliveryRef.update({
            status: 'arrived',
            arrivedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Delivery arrived', {
            deliveryId,
            driverId,
            userId: currentUser.uid,
        });

        return {
            success: true,
        };
    } catch (error) {
        logger.error('Mark arrived failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to mark arrived',
        };
    }
}

/**
 * Complete delivery (ID verified, signature captured, product handed off)
 */
export async function completeDelivery(deliveryId: string, proofData: {
    idVerified: boolean;
    idType?: string;
    idNumber?: string;
    birthDate?: string;
    signatureUrl?: string;
    proofPhotoUrl?: string;
}) {
    try {
        const currentUser = await requireUser(['delivery_driver']);
        const { firestore } = await createServerClient();

        const deliveryRef = firestore.collection('deliveries').doc(deliveryId);
        const deliveryDoc = await deliveryRef.get();

        if (!deliveryDoc.exists) {
            return {
                success: false,
                error: 'Delivery not found',
            };
        }

        const delivery = deliveryDoc.data() as Delivery;

        // Verify driver ownership
        const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
        const driverId = userDoc.data()?.driverId;

        if (delivery.driverId !== driverId) {
            return {
                success: false,
                error: 'Access denied',
            };
        }

        if (delivery.status !== 'arrived') {
            return {
                success: false,
                error: 'Must mark delivery as arrived first',
            };
        }

        // Validate ID verification
        if (!proofData.idVerified) {
            return {
                success: false,
                error: 'ID verification is required to complete delivery',
            };
        }

        // Update delivery status
        await deliveryRef.update({
            status: 'delivered',
            deliveredAt: FieldValue.serverTimestamp(),
            idVerification: {
                verified: proofData.idVerified,
                verifiedAt: FieldValue.serverTimestamp(),
                idType: proofData.idType || null,
                idNumber: proofData.idNumber || null,
                birthDate: proofData.birthDate || null,
            },
            signatureUrl: proofData.signatureUrl || null,
            proofOfDeliveryPhoto: proofData.proofPhotoUrl || null,
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Update order status to completed
        const ordersSnapshot = await firestore
            .collection('orders')
            .where('id', '==', delivery.orderId)
            .limit(1)
            .get();

        if (!ordersSnapshot.empty) {
            await ordersSnapshot.docs[0].ref.update({
                fulfillmentStatus: 'completed',
                updatedAt: FieldValue.serverTimestamp(),
            });
        }

        logger.info('Delivery completed', {
            deliveryId,
            orderId: delivery.orderId,
            driverId,
            userId: currentUser.uid,
        });

        return {
            success: true,
        };
    } catch (error) {
        logger.error('Complete delivery failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to complete delivery',
        };
    }
}
