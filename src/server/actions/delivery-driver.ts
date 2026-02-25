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
import { sendEnRouteSms, sendDeliveredSms } from '@/server/services/delivery-sms';

// ============================================================
// ETA Calculation (Google Maps Directions API)
// ============================================================

async function calculateEta(
    driverLat: number,
    driverLng: number,
    deliveryAddress: { street: string; city: string; state: string; zip: string }
): Promise<Timestamp | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;

    const origin = `${driverLat},${driverLng}`;
    const destination = encodeURIComponent(
        `${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.zip}`
    );

    try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${apiKey}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const data = await response.json();

        if (data.status === 'OK' && data.routes?.[0]?.legs?.[0]?.duration?.value) {
            const durationSeconds: number = data.routes[0].legs[0].duration.value;
            return Timestamp.fromMillis(Date.now() + durationSeconds * 1000);
        }
    } catch (err) {
        logger.warn('Google Maps ETA failed (non-fatal)', { err });
    }

    return null;
}

// ============================================================
// QR Check-In Validation
// ============================================================

/**
 * Validate pickup QR code scanned by driver at dispensary.
 * Advances delivery status from 'assigned' → 'in_transit'.
 */
export async function validatePickupQr(deliveryId: string, scannedToken: string) {
    try {
        const currentUser = await requireUser(['delivery_driver']);
        const { firestore } = await createServerClient();

        const deliveryRef = firestore.collection('deliveries').doc(deliveryId);
        const deliveryDoc = await deliveryRef.get();

        if (!deliveryDoc.exists) {
            return { success: false, error: 'Delivery not found' };
        }

        const delivery = deliveryDoc.data() as Delivery;

        // Verify driver owns this delivery
        const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
        const driverId = userDoc.data()?.driverId;
        if (delivery.driverId !== driverId) {
            return { success: false, error: 'Access denied' };
        }

        if (delivery.status !== 'assigned') {
            return { success: false, error: 'Delivery is not in assigned state' };
        }

        // Validate QR token
        if (!delivery.pickupQrCode || scannedToken !== delivery.pickupQrCode) {
            return { success: false, error: "QR code doesn't match this order" };
        }

        // Advance to in_transit
        await deliveryRef.update({
            status: 'in_transit',
            pickupScannedAt: FieldValue.serverTimestamp(),
            departedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Pickup QR scanned — delivery started', { deliveryId, driverId });

        // Calculate ETA + send SMS asynchronously
        setImmediate(async () => {
            try {
                const orgName = 'Thrive'; // fallback; ideally fetched from org doc
                // ETA: read driver location and call Maps API
                const driverDoc = await firestore.collection('drivers').doc(driverId!).get();
                const loc = driverDoc.data()?.currentLocation;
                if (loc?.lat && loc?.lng) {
                    const eta = await calculateEta(loc.lat, loc.lng, delivery.deliveryAddress);
                    if (eta) {
                        await deliveryRef.update({ estimatedArrival: eta });
                    }
                }
                // En-route SMS
                if (delivery.deliveryAddress.phone) {
                    await sendEnRouteSms(delivery.deliveryAddress.phone, orgName, deliveryId);
                }
            } catch (err) {
                logger.warn('Post-pickup ETA/SMS failed (non-fatal)', { err, deliveryId });
            }
        });

        return { success: true };
    } catch (error) {
        logger.error('Validate pickup QR failed', { error, deliveryId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'QR validation failed',
        };
    }
}

/**
 * Validate delivery QR code scanned by driver at customer's door.
 * Advances delivery status from 'in_transit' → 'arrived'.
 */
export async function validateDeliveryQr(deliveryId: string, scannedToken: string) {
    try {
        const currentUser = await requireUser(['delivery_driver']);
        const { firestore } = await createServerClient();

        const deliveryRef = firestore.collection('deliveries').doc(deliveryId);
        const deliveryDoc = await deliveryRef.get();

        if (!deliveryDoc.exists) {
            return { success: false, error: 'Delivery not found' };
        }

        const delivery = deliveryDoc.data() as Delivery;

        // Verify driver
        const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
        const driverId = userDoc.data()?.driverId;
        if (delivery.driverId !== driverId) {
            return { success: false, error: 'Access denied' };
        }

        if (delivery.status !== 'in_transit') {
            return { success: false, error: 'Delivery must be in transit' };
        }

        // Validate QR token
        if (!delivery.deliveryQrCode || scannedToken !== delivery.deliveryQrCode) {
            return { success: false, error: "QR code doesn't match this order" };
        }

        // Advance to arrived
        await deliveryRef.update({
            status: 'arrived',
            deliveryScannedAt: FieldValue.serverTimestamp(),
            arrivedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Delivery QR scanned — driver arrived', { deliveryId, driverId });
        return { success: true };
    } catch (error) {
        logger.error('Validate delivery QR failed', { error, deliveryId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'QR validation failed',
        };
    }
}

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

        logger.info('Delivery started', { deliveryId, driverId, userId: currentUser.uid });

        // Calculate ETA + send en-route SMS asynchronously (non-blocking)
        setImmediate(async () => {
            try {
                // ETA: read driver's last known GPS position
                const driverDoc = await firestore.collection('drivers').doc(driverId!).get();
                const loc = driverDoc.data()?.currentLocation;
                if (loc?.lat && loc?.lng) {
                    const eta = await calculateEta(loc.lat, loc.lng, delivery.deliveryAddress);
                    if (eta) {
                        await deliveryRef.update({ estimatedArrival: eta });
                    }
                }
                // En-route SMS with QR link
                if (delivery.deliveryAddress.phone) {
                    await sendEnRouteSms(delivery.deliveryAddress.phone, 'Thrive', deliveryId);
                }
            } catch (err) {
                logger.warn('Post-start ETA/SMS failed (non-fatal)', { err, deliveryId });
            }
        });

        return { success: true };
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

        // Send delivered SMS (non-blocking)
        setImmediate(async () => {
            try {
                if (delivery.deliveryAddress?.phone) {
                    await sendDeliveredSms(delivery.deliveryAddress.phone, 'Thrive');
                }
            } catch (err) {
                logger.warn('Delivered SMS failed (non-fatal)', { err, deliveryId });
            }
        });

        return { success: true };
    } catch (error) {
        logger.error('Complete delivery failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to complete delivery',
        };
    }
}
