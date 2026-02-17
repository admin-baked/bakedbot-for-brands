/**
 * Delivery Management Server Actions
 *
 * Handles driver management, delivery creation, zone configuration,
 * and fee calculation for NY OCM-compliant cannabis delivery
 */

'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/auth/auth';
import { Timestamp, FieldValue } from '@google-cloud/firestore';
import { DISPENSARY_ADMIN_ROLES } from '@/types/roles';
import { revalidatePath } from 'next/cache';
import type {
    Driver,
    CreateDriverInput,
    UpdateDriverInput,
    Delivery,
    CreateDeliveryInput,
    UpdateDeliveryStatusInput,
    DeliveryZone,
    CreateZoneInput,
    UpdateZoneInput,
    FeeCalculation,
    DeliveryStats,
    DriverPerformance,
    DeliveryStatus,
} from '@/types/delivery';
import type { ShippingAddress } from '@/types/orders';

// ===========================
// Driver Management Actions
// ===========================

/**
 * Create a new delivery driver
 * Requires: dispensary_admin role
 */
export async function createDriver(input: CreateDriverInput) {
    try {
        const user = await requireUser(['dispensary_admin', 'super_user']);
        const db = getAdminFirestore();

        // Validate driver age (must be 21+ per NY OCM)
        if (input.birthDate) {
            const birthDate = new Date(input.birthDate);
            const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            if (age < 21) {
                return {
                    success: false,
                    error: 'Driver must be at least 21 years old (NY OCM requirement)',
                };
            }
        }

        // Validate license expiry
        const licenseExpiry = new Date(input.licenseExpiry);
        if (licenseExpiry < new Date()) {
            return {
                success: false,
                error: 'Driver license is expired',
            };
        }

        // Generate driver ID
        const driverId = `driver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const driverData: Driver = {
            id: driverId,
            userId: input.userId || user.uid, // Link to user account
            orgId: input.orgId,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            email: input.email,
            licenseNumber: input.licenseNumber,
            licenseState: input.licenseState,
            licenseExpiry: Timestamp.fromDate(licenseExpiry),
            birthDate: input.birthDate,
            vehicleType: input.vehicleType,
            vehicleMake: input.vehicleMake,
            vehicleModel: input.vehicleModel,
            vehicleYear: input.vehicleYear,
            vehiclePlate: input.vehiclePlate,
            status: 'active',
            isAvailable: false, // Off duty by default
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        await db.collection('drivers').doc(driverId).set(driverData);

        logger.info('Driver created', { driverId, orgId: input.orgId });

        revalidatePath('/dashboard/delivery');

        return {
            success: true,
            driver: driverData,
        };
    } catch (error) {
        logger.error('Failed to create driver', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create driver',
        };
    }
}

/**
 * Update driver information
 */
export async function updateDriver(driverId: string, input: UpdateDriverInput) {
    try {
        await requireUser(['dispensary_admin', 'super_user']);
        const db = getAdminFirestore();

        const updateData: any = {
            ...input,
            updatedAt: Timestamp.now(),
        };

        // Convert date to Timestamp if provided
        if (input.licenseExpiry) {
            updateData.licenseExpiry = Timestamp.fromDate(new Date(input.licenseExpiry));
        }

        await db.collection('drivers').doc(driverId).update(updateData);

        logger.info('Driver updated', { driverId });

        revalidatePath('/dashboard/delivery');

        return { success: true };
    } catch (error) {
        logger.error('Failed to update driver', { error, driverId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update driver',
        };
    }
}

/**
 * Toggle driver availability (on/off duty)
 */
export async function toggleDriverAvailability(driverId: string) {
    try {
        await requireUser(['dispensary_admin', 'super_user', 'delivery_driver']);
        const db = getAdminFirestore();

        const driverRef = db.collection('drivers').doc(driverId);
        const driverDoc = await driverRef.get();

        if (!driverDoc.exists) {
            return { success: false, error: 'Driver not found' };
        }

        const currentAvailability = driverDoc.data()?.isAvailable || false;

        await driverRef.update({
            isAvailable: !currentAvailability,
            updatedAt: Timestamp.now(),
        });

        logger.info('Driver availability toggled', { driverId, newStatus: !currentAvailability });

        revalidatePath('/dashboard/delivery');

        return { success: true, isAvailable: !currentAvailability };
    } catch (error) {
        logger.error('Failed to toggle driver availability', { error, driverId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to toggle availability',
        };
    }
}

/**
 * Get all drivers for a location
 */
export async function getDrivers(orgId: string) {
    try {
        await requireUser(['dispensary_admin', 'dispensary_staff', 'super_user']);
        const db = getAdminFirestore();

        const driversSnapshot = await db
            .collection('drivers')
            .where('orgId', '==', orgId)
            .where('status', '==', 'active')
            .get();

        const drivers = driversSnapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
        })) as Driver[];

        return { success: true, drivers };
    } catch (error) {
        logger.error('Failed to fetch drivers', { error, orgId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch drivers',
            drivers: [],
        };
    }
}

/**
 * Get available drivers for assignment
 */
export async function getAvailableDrivers(orgId: string) {
    try {
        await requireUser(['dispensary_admin', 'dispensary_staff', 'super_user']);
        const db = getAdminFirestore();

        const driversSnapshot = await db
            .collection('drivers')
            .where('orgId', '==', orgId)
            .where('status', '==', 'active')
            .where('isAvailable', '==', true)
            .get();

        const drivers = driversSnapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
        })) as Driver[];

        return { success: true, drivers };
    } catch (error) {
        logger.error('Failed to fetch available drivers', { error, orgId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch available drivers',
            drivers: [],
        };
    }
}

// ===========================
// Delivery Management Actions
// ===========================

/**
 * Create a delivery record after order confirmation
 * Called automatically when order is placed with fulfillmentType='delivery'
 */
export async function createDelivery(input: CreateDeliveryInput) {
    try {
        const db = getAdminFirestore();

        // Generate delivery ID
        const deliveryId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Generate manifest number (required for NY OCM)
        const manifestNumber = `MAN-${input.locationId.toUpperCase()}-${Date.now()}`;

        const deliveryData: Delivery = {
            id: deliveryId,
            orderId: input.orderId,
            locationId: input.locationId,
            status: 'pending',
            deliveryAddress: input.deliveryAddress,
            deliveryWindow: input.deliveryWindow,
            deliveryFee: input.deliveryFee,
            zoneId: input.zoneId,
            idVerification: { verified: false },
            manifestNumber,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        await db.collection('deliveries').doc(deliveryId).set(deliveryData);

        logger.info('Delivery created', { deliveryId, orderId: input.orderId });

        return {
            success: true,
            delivery: deliveryData,
        };
    } catch (error) {
        logger.error('Failed to create delivery', { error, orderId: input.orderId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create delivery',
        };
    }
}

/**
 * Assign driver to delivery (manual dispatch)
 */
export async function assignDriver(deliveryId: string, driverId: string) {
    try {
        await requireUser(['dispensary_admin', 'dispensary_staff', 'super_user']);
        const db = getAdminFirestore();

        // Use transaction to prevent double-assignment
        await db.runTransaction(async (transaction) => {
            const deliveryRef = db.collection('deliveries').doc(deliveryId);
            const driverRef = db.collection('drivers').doc(driverId);

            const [deliveryDoc, driverDoc] = await Promise.all([
                transaction.get(deliveryRef),
                transaction.get(driverRef),
            ]);

            if (!deliveryDoc.exists) {
                throw new Error('Delivery not found');
            }

            if (!driverDoc.exists) {
                throw new Error('Driver not found');
            }

            const driver = driverDoc.data() as Driver;

            if (!driver.isAvailable) {
                throw new Error('Driver is not available');
            }

            // Update delivery with driver assignment
            transaction.update(deliveryRef, {
                driverId,
                status: 'assigned',
                assignedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        });

        logger.info('Driver assigned to delivery', { deliveryId, driverId });

        revalidatePath('/dashboard/delivery');

        return { success: true };
    } catch (error) {
        logger.error('Failed to assign driver', { error, deliveryId, driverId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to assign driver',
        };
    }
}

/**
 * Update delivery status with validation
 */
export async function updateDeliveryStatus(input: UpdateDeliveryStatusInput) {
    try {
        await requireUser(['dispensary_admin', 'dispensary_staff', 'delivery_driver', 'super_user']);
        const db = getAdminFirestore();

        const deliveryRef = db.collection('deliveries').doc(input.deliveryId);
        const deliveryDoc = await deliveryRef.get();

        if (!deliveryDoc.exists) {
            return { success: false, error: 'Delivery not found' };
        }

        const updateData: any = {
            status: input.status,
            updatedAt: Timestamp.now(),
        };

        // Add timestamp fields based on status
        switch (input.status) {
            case 'in_transit':
                updateData.departedAt = Timestamp.now();
                break;
            case 'arrived':
                updateData.arrivedAt = Timestamp.now();
                if (input.estimatedArrival) {
                    updateData.estimatedArrival = input.estimatedArrival;
                }
                break;
            case 'delivered':
                updateData.deliveredAt = Timestamp.now();
                break;
            case 'failed':
                updateData.failedAt = Timestamp.now();
                if (input.failureReason) {
                    updateData.failureReason = input.failureReason;
                }
                break;
        }

        // Update driver location if provided
        if (input.driverLocation) {
            updateData.driverLocation = input.driverLocation;
        }

        await deliveryRef.update(updateData);

        logger.info('Delivery status updated', { deliveryId: input.deliveryId, status: input.status });

        revalidatePath('/dashboard/delivery');

        return { success: true };
    } catch (error) {
        logger.error('Failed to update delivery status', { error, deliveryId: input.deliveryId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update status',
        };
    }
}

/**
 * Get active deliveries for a location
 */
export async function getActiveDeliveries(locationId: string) {
    try {
        await requireUser(['dispensary_admin', 'dispensary_staff', 'super_user']);
        const db = getAdminFirestore();

        const deliveriesSnapshot = await db
            .collection('deliveries')
            .where('locationId', '==', locationId)
            .where('status', 'in', ['pending', 'assigned', 'in_transit', 'arrived'])
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const deliveries = deliveriesSnapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
        })) as Delivery[];

        return { success: true, deliveries };
    } catch (error) {
        logger.error('Failed to fetch active deliveries', { error, locationId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch deliveries',
            deliveries: [],
        };
    }
}

/**
 * Get delivery by ID
 */
export async function getDelivery(deliveryId: string) {
    try {
        const db = getAdminFirestore();

        const deliveryDoc = await db.collection('deliveries').doc(deliveryId).get();

        if (!deliveryDoc.exists) {
            return { success: false, error: 'Delivery not found' };
        }

        const delivery = { ...deliveryDoc.data(), id: deliveryDoc.id } as Delivery;

        return { success: true, delivery };
    } catch (error) {
        logger.error('Failed to fetch delivery', { error, deliveryId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch delivery',
        };
    }
}

// ===========================
// Zone Management Actions
// ===========================

/**
 * Create a delivery zone
 */
export async function createDeliveryZone(input: CreateZoneInput) {
    try {
        await requireUser(['dispensary_admin', 'super_user']);
        const db = getAdminFirestore();

        const zoneId = `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const zoneData: DeliveryZone = {
            id: zoneId,
            locationId: input.locationId,
            name: input.name,
            radiusMiles: input.radiusMiles,
            baseFee: input.baseFee,
            minimumOrder: input.minimumOrder,
            isActive: input.isActive !== undefined ? input.isActive : true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        await db
            .collection('locations')
            .doc(input.locationId)
            .collection('delivery_zones')
            .doc(zoneId)
            .set(zoneData);

        logger.info('Delivery zone created', { zoneId, locationId: input.locationId });

        revalidatePath('/dashboard/delivery');

        return { success: true, zone: zoneData };
    } catch (error) {
        logger.error('Failed to create delivery zone', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create zone',
        };
    }
}

/**
 * Update delivery zone
 */
export async function updateDeliveryZone(locationId: string, zoneId: string, input: UpdateZoneInput) {
    try {
        await requireUser(['dispensary_admin', 'super_user']);
        const db = getAdminFirestore();

        const updateData = {
            ...input,
            updatedAt: Timestamp.now(),
        };

        await db
            .collection('locations')
            .doc(locationId)
            .collection('delivery_zones')
            .doc(zoneId)
            .update(updateData);

        logger.info('Delivery zone updated', { zoneId, locationId });

        revalidatePath('/dashboard/delivery');

        return { success: true };
    } catch (error) {
        logger.error('Failed to update delivery zone', { error, zoneId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update zone',
        };
    }
}

/**
 * Get all delivery zones for a location
 */
export async function getDeliveryZones(locationId: string) {
    try {
        const db = getAdminFirestore();

        const zonesSnapshot = await db
            .collection('locations')
            .doc(locationId)
            .collection('delivery_zones')
            .orderBy('radiusMiles', 'asc')
            .get();

        const zones = zonesSnapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
        })) as DeliveryZone[];

        return { success: true, zones };
    } catch (error) {
        logger.error('Failed to fetch delivery zones', { error, locationId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch zones',
            zones: [],
        };
    }
}

/**
 * Calculate delivery fee based on address and zones
 * This is a simplified version - in production, you'd use actual geocoding
 */
export async function calculateDeliveryFee(
    address: ShippingAddress,
    locationId: string,
    subtotal: number
): Promise<{ success: boolean; calculation?: FeeCalculation; error?: string }> {
    try {
        const db = getAdminFirestore();

        // Get location details
        const locationDoc = await db.collection('locations').doc(locationId).get();
        if (!locationDoc.exists) {
            return { success: false, error: 'Location not found' };
        }

        const locationData = locationDoc.data();
        const locationAddress = locationData?.address;

        // Get all active zones
        const zonesResult = await getDeliveryZones(locationId);
        if (!zonesResult.success || !zonesResult.zones) {
            return { success: false, error: 'No delivery zones configured' };
        }

        const activeZones = zonesResult.zones.filter((z) => z.isActive);
        if (activeZones.length === 0) {
            return { success: false, error: 'No active delivery zones' };
        }

        // TODO: In production, use Google Geocoding API to calculate actual distance
        // For MVP, match by ZIP code proximity (simplified)
        // For now, use first zone as fallback
        const selectedZone = activeZones[0];

        const meetsMinimum = subtotal >= selectedZone.minimumOrder;

        const calculation: FeeCalculation = {
            zone: selectedZone,
            deliveryFee: selectedZone.baseFee,
            minimumOrder: selectedZone.minimumOrder,
            meetsMinimum,
            estimatedTime: '45-60 min', // Fixed for MVP
        };

        return { success: true, calculation };
    } catch (error) {
        logger.error('Failed to calculate delivery fee', { error, locationId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to calculate fee',
        };
    }
}

// ===========================
// Analytics Actions
// ===========================

/**
 * Get delivery statistics for a location
 */
export async function getDeliveryStats(locationId: string): Promise<DeliveryStats> {
    try {
        await requireUser(['dispensary_admin', 'dispensary_staff', 'super_user']);
        const db = getAdminFirestore();

        const deliveriesSnapshot = await db
            .collection('deliveries')
            .where('locationId', '==', locationId)
            .get();

        const deliveries = deliveriesSnapshot.docs.map((doc) => doc.data()) as Delivery[];

        const total = deliveries.length;
        const pending = deliveries.filter((d) => d.status === 'pending').length;
        const assigned = deliveries.filter((d) => d.status === 'assigned').length;
        const inTransit = deliveries.filter((d) => d.status === 'in_transit').length;
        const delivered = deliveries.filter((d) => d.status === 'delivered').length;
        const failed = deliveries.filter((d) => d.status === 'failed').length;

        const successRate = total > 0 ? (delivered / total) * 100 : 0;

        // Calculate average delivery time (for completed deliveries)
        const completedDeliveries = deliveries.filter(
            (d) => d.status === 'delivered' && d.createdAt && d.deliveredAt
        );
        const avgDeliveryTime =
            completedDeliveries.length > 0
                ? completedDeliveries.reduce((sum, d) => {
                      const created = d.createdAt?.toDate?.() || new Date();
                      const delivered = d.deliveredAt?.toDate?.() || new Date();
                      return sum + (delivered.getTime() - created.getTime()) / 60000; // minutes
                  }, 0) / completedDeliveries.length
                : 0;

        // Calculate on-time percentage (within delivery window)
        const onTimeDeliveries = completedDeliveries.filter((d) => {
            if (!d.deliveredAt || !d.deliveryWindow?.end) return false;
            const deliveredTime = d.deliveredAt.toDate();
            const windowEnd = d.deliveryWindow.end.toDate();
            return deliveredTime <= windowEnd;
        });
        const onTimePercentage =
            completedDeliveries.length > 0 ? (onTimeDeliveries.length / completedDeliveries.length) * 100 : 0;

        return {
            total,
            pending,
            assigned,
            inTransit,
            delivered,
            failed,
            successRate,
            avgDeliveryTime,
            onTimePercentage,
        };
    } catch (error) {
        logger.error('Failed to fetch delivery stats', { error, locationId });
        return {
            total: 0,
            pending: 0,
            assigned: 0,
            inTransit: 0,
            delivered: 0,
            failed: 0,
            successRate: 0,
            avgDeliveryTime: 0,
            onTimePercentage: 0,
        };
    }
}

/**
 * Reassign a delivery to a different driver
 */
export async function reassignDriver(deliveryId: string, newDriverId: string) {
    try {
        const currentUser = await requireUser(DISPENSARY_ADMIN_ROLES);
        const firestore = getAdminFirestore();

        const deliveryRef = firestore.collection('deliveries').doc(deliveryId);
        const deliveryDoc = await deliveryRef.get();

        if (!deliveryDoc.exists) {
            return {
                success: false,
                error: 'Delivery not found',
            };
        }

        const delivery = deliveryDoc.data() as Delivery;

        // Cannot reassign completed/failed deliveries
        if (delivery.status === 'delivered' || delivery.status === 'failed') {
            return {
                success: false,
                error: 'Cannot reassign completed or failed deliveries',
            };
        }

        // Verify new driver exists and is available
        const newDriverDoc = await firestore.collection('drivers').doc(newDriverId).get();
        if (!newDriverDoc.exists) {
            return {
                success: false,
                error: 'New driver not found',
            };
        }

        const newDriver = newDriverDoc.data() as Driver;
        if (newDriver.status !== 'active') {
            return {
                success: false,
                error: 'New driver is not active',
            };
        }

        // Update delivery
        await deliveryRef.update({
            driverId: newDriverId,
            reassignedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Delivery reassigned', {
            deliveryId,
            oldDriverId: delivery.driverId,
            newDriverId,
            userId: currentUser.uid,
        });

        return {
            success: true,
        };
    } catch (error) {
        logger.error('Reassign driver failed', { error, deliveryId, newDriverId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to reassign driver',
        };
    }
}

/**
 * Get driver performance metrics for analytics tab
 */
export async function getDriverPerformance(locationId: string) {
    try {
        await requireUser(DISPENSARY_ADMIN_ROLES);
        const db = getAdminFirestore();

        // Get completed deliveries grouped by driver
        const completedSnapshot = await db
            .collection('deliveries')
            .where('locationId', '==', locationId)
            .where('status', 'in', ['delivered', 'failed'])
            .get();

        // Aggregate by driverId
        const driverMap: Record<string, {
            completed: number;
            failed: number;
            totalMinutes: number;
            onTimeCount: number;
        }> = {};

        completedSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            const driverId = data.driverId;
            if (!driverId) return;

            if (!driverMap[driverId]) {
                driverMap[driverId] = { completed: 0, failed: 0, totalMinutes: 0, onTimeCount: 0 };
            }

            if (data.status === 'delivered') {
                driverMap[driverId].completed++;
                if (data.createdAt && data.deliveredAt) {
                    const created = data.createdAt.toDate();
                    const delivered = data.deliveredAt.toDate();
                    driverMap[driverId].totalMinutes += (delivered.getTime() - created.getTime()) / 60000;
                }
                if (data.deliveredAt && data.deliveryWindow?.end) {
                    const deliveredTime = data.deliveredAt.toDate();
                    const windowEnd = data.deliveryWindow.end.toDate();
                    if (deliveredTime <= windowEnd) driverMap[driverId].onTimeCount++;
                }
            } else {
                driverMap[driverId].failed++;
            }
        });

        // Fetch driver names
        const driverIds = Object.keys(driverMap);
        const drivers = [];

        for (const driverId of driverIds) {
            const driverDoc = await db.collection('drivers').doc(driverId).get();
            const driverData = driverDoc.data();
            const stats = driverMap[driverId];
            const totalDeliveries = stats.completed + stats.failed;

            drivers.push({
                driverId,
                name: driverData
                    ? `${driverData.firstName} ${driverData.lastName}`
                    : 'Unknown Driver',
                completed: stats.completed,
                failed: stats.failed,
                avgTime: stats.completed > 0 ? stats.totalMinutes / stats.completed : 0,
                onTimeRate: stats.completed > 0 ? (stats.onTimeCount / stats.completed) * 100 : 0,
            });
        }

        // Sort by completed deliveries descending
        drivers.sort((a, b) => b.completed - a.completed);

        return {
            success: true,
            drivers,
        };
    } catch (error) {
        logger.error('Get driver performance failed', { error, locationId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to load driver performance',
            drivers: [],
        };
    }
}
