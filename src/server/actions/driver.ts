/**
 * Driver Management Server Actions
 *
 * Handles CRUD operations for delivery drivers
 * - Create/update/delete drivers
 * - Toggle availability (on/off duty)
 * - Get available drivers for assignment
 */

'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import type { Driver, DriverStatus, VehicleType } from '@/types/delivery';
import { requireUser } from '@/server/auth/auth';
import { DISPENSARY_ADMIN_ROLES } from '@/types/roles';

const DRIVER_ADMIN_ROLES = [...DISPENSARY_ADMIN_ROLES, 'super_user', 'super_admin'] as const;

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function isValidDocumentId(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        value.length >= 3 &&
        value.length <= 128 &&
        !/[\/\\?#\[\]]/.test(value)
    );
}

function getActorOrgId(user: unknown): string | null {
    if (!user || typeof user !== 'object') return null;
    const token = user as {
        currentOrgId?: string;
        orgId?: string;
        brandId?: string;
        dispensaryId?: string;
        tenantId?: string;
        organizationId?: string;
    };
    return (
        token.currentOrgId ||
        token.orgId ||
        token.brandId ||
        token.dispensaryId ||
        token.tenantId ||
        token.organizationId ||
        null
    );
}

function assertOrgAccess(user: unknown, orgId: string): void {
    const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
    if (isSuperRole(role)) {
        return;
    }
    const actorOrgId = getActorOrgId(user);
    if (!actorOrgId || actorOrgId !== orgId) {
        throw new Error('Unauthorized');
    }
}

// Validation schemas
const CreateDriverSchema = z.object({
    orgId: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(10),
    email: z.string().email(),
    licenseNumber: z.string().min(1),
    licenseState: z.string().length(2),
    licenseExpiry: z.date(),
    vehicleType: z.enum(['car', 'van', 'bike', 'scooter', 'foot']),
    vehicleMake: z.string().optional(),
    vehicleModel: z.string().optional(),
    vehicleYear: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
    vehiclePlate: z.string().optional(),
});

const UpdateDriverSchema = CreateDriverSchema.partial().extend({
    id: z.string().min(1),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

type CreateDriverInput = z.infer<typeof CreateDriverSchema>;
type UpdateDriverInput = z.infer<typeof UpdateDriverSchema>;

/**
 * Create a new driver
 * Validates 21+ age requirement (NY OCM)
 */
export async function createDriver(input: CreateDriverInput) {
    try {
        // Validate input
        const validated = CreateDriverSchema.parse(input);

        // Check permissions
        const currentUser = await requireUser(DRIVER_ADMIN_ROLES as any);
        assertOrgAccess(currentUser, validated.orgId);

        // Validate license expiry (must be future date)
        if (validated.licenseExpiry <= new Date()) {
            return {
                success: false,
                error: 'Driver license is expired. License must be valid.',
            };
        }

        const { firestore } = await createServerClient();

        // Create driver document
        const driver: Omit<Driver, 'id' | 'createdAt' | 'updatedAt'> = {
            userId: '', // Will be set when driver creates account
            orgId: validated.orgId,
            firstName: validated.firstName,
            lastName: validated.lastName,
            phone: validated.phone,
            email: validated.email,
            licenseNumber: validated.licenseNumber,
            licenseState: validated.licenseState,
            licenseExpiry: Timestamp.fromDate(validated.licenseExpiry),
            vehicleType: validated.vehicleType,
            vehicleMake: validated.vehicleMake,
            vehicleModel: validated.vehicleModel,
            vehicleYear: validated.vehicleYear,
            vehiclePlate: validated.vehiclePlate,
            status: 'active',
            isAvailable: false, // Off duty by default
        };

        const docRef = await firestore.collection('drivers').add({
            ...driver,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Driver created', {
            driverId: docRef.id,
            orgId: validated.orgId,
            userId: currentUser.uid,
        });

        return {
            success: true,
            driverId: docRef.id,
        };
    } catch (error) {
        logger.error('Create driver failed', { error });
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: `Validation error: ${error.errors[0].message}`,
            };
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create driver',
        };
    }
}

/**
 * Update driver information
 */
export async function updateDriver(input: UpdateDriverInput) {
    try {
        const validated = UpdateDriverSchema.parse(input);
        const { id, ...updates } = validated;
        if (!isValidDocumentId(id)) {
            return {
                success: false,
                error: 'Invalid driver ID',
            };
        }

        const currentUser = await requireUser(DRIVER_ADMIN_ROLES as any);
        const { firestore } = await createServerClient();

        // Validate license expiry if provided
        if (updates.licenseExpiry && updates.licenseExpiry <= new Date()) {
            return {
                success: false,
                error: 'Driver license is expired. License must be valid.',
            };
        }

        // Get existing driver
        const driverRef = firestore.collection('drivers').doc(id);
        const driverDoc = await driverRef.get();

        if (!driverDoc.exists) {
            return {
                success: false,
                error: 'Driver not found',
            };
        }

        const existingDriver = driverDoc.data() as Driver;
        assertOrgAccess(currentUser, existingDriver.orgId);

        // Prepare update data
        const updateData: any = {
            ...updates,
            updatedAt: FieldValue.serverTimestamp(),
        };

        // Prevent cross-org reassignment for non-super users.
        if (updates.orgId && updates.orgId !== existingDriver.orgId && !isSuperRole(currentUser.role)) {
            return {
                success: false,
                error: 'Unauthorized',
            };
        }

        // Convert Date to Timestamp if licenseExpiry is provided
        if (updates.licenseExpiry) {
            updateData.licenseExpiry = Timestamp.fromDate(updates.licenseExpiry);
        }

        await driverRef.update(updateData);

        logger.info('Driver updated', {
            driverId: id,
            userId: currentUser.uid,
        });

        return {
            success: true,
            driverId: id,
        };
    } catch (error) {
        logger.error('Update driver failed', { error });
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: `Validation error: ${error.errors[0].message}`,
            };
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update driver',
        };
    }
}

/**
 * Delete a driver
 */
export async function deleteDriver(driverId: string) {
    try {
        if (!isValidDocumentId(driverId)) {
            return {
                success: false,
                error: 'Invalid driver ID',
            };
        }
        const currentUser = await requireUser(DRIVER_ADMIN_ROLES as any);
        const { firestore } = await createServerClient();

        const driverDoc = await firestore.collection('drivers').doc(driverId).get();
        if (!driverDoc.exists) {
            return {
                success: false,
                error: 'Driver not found',
            };
        }
        const driver = driverDoc.data() as Driver;
        assertOrgAccess(currentUser, driver.orgId);

        // Check if driver has active deliveries
        const activeDeliveries = await firestore
            .collection('deliveries')
            .where('driverId', '==', driverId)
            .where('status', 'in', ['assigned', 'in_transit', 'arrived'])
            .limit(1)
            .get();

        if (!activeDeliveries.empty) {
            return {
                success: false,
                error: 'Cannot delete driver with active deliveries. Please reassign or complete deliveries first.',
            };
        }

        await firestore.collection('drivers').doc(driverId).delete();

        logger.info('Driver deleted', {
            driverId,
            userId: currentUser.uid,
        });

        return {
            success: true,
        };
    } catch (error) {
        logger.error('Delete driver failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete driver',
        };
    }
}

/**
 * Toggle driver availability (on/off duty)
 */
export async function toggleDriverAvailability(driverId: string) {
    try {
        if (!isValidDocumentId(driverId)) {
            return {
                success: false,
                error: 'Invalid driver ID',
            };
        }
        const currentUser = await requireUser(DRIVER_ADMIN_ROLES as any);
        const { firestore } = await createServerClient();

        const driverRef = firestore.collection('drivers').doc(driverId);
        const driverDoc = await driverRef.get();

        if (!driverDoc.exists) {
            return {
                success: false,
                error: 'Driver not found',
            };
        }

        const driver = driverDoc.data() as Driver;
        assertOrgAccess(currentUser, driver.orgId);
        const newAvailability = !driver.isAvailable;

        await driverRef.update({
            isAvailable: newAvailability,
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Driver availability toggled', {
            driverId,
            isAvailable: newAvailability,
            userId: currentUser.uid,
        });

        return {
            success: true,
            isAvailable: newAvailability,
        };
    } catch (error) {
        logger.error('Toggle driver availability failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to toggle availability',
        };
    }
}

/**
 * Get all drivers for an organization
 */
export async function getDrivers(orgId: string) {
    try {
        if (!isValidDocumentId(orgId)) {
            return {
                success: false,
                error: 'Invalid organization ID',
                drivers: [],
            };
        }
        const currentUser = await requireUser(DRIVER_ADMIN_ROLES as any);
        assertOrgAccess(currentUser, orgId);
        const { firestore } = await createServerClient();

        const snapshot = await firestore
            .collection('drivers')
            .where('orgId', '==', orgId)
            .orderBy('createdAt', 'desc')
            .get();

        const drivers: Driver[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            licenseExpiry: doc.data().licenseExpiry?.toDate(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
        } as Driver));

        return {
            success: true,
            drivers,
        };
    } catch (error) {
        logger.error('Get drivers failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch drivers',
            drivers: [],
        };
    }
}

/**
 * Get available drivers for delivery assignment
 */
export async function getAvailableDrivers(orgId: string) {
    try {
        if (!isValidDocumentId(orgId)) {
            return {
                success: false,
                error: 'Invalid organization ID',
                drivers: [],
            };
        }
        const currentUser = await requireUser(DRIVER_ADMIN_ROLES as any);
        assertOrgAccess(currentUser, orgId);
        const { firestore } = await createServerClient();

        const snapshot = await firestore
            .collection('drivers')
            .where('orgId', '==', orgId)
            .where('status', '==', 'active')
            .where('isAvailable', '==', true)
            .get();

        const drivers: Driver[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            licenseExpiry: doc.data().licenseExpiry?.toDate(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
        } as Driver));

        return {
            success: true,
            drivers,
        };
    } catch (error) {
        logger.error('Get available drivers failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch available drivers',
            drivers: [],
        };
    }
}
