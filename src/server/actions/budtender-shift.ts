'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/lib/auth-helpers';
import { DISPENSARY_ALL_ROLES, BRAND_ALL_ROLES } from '@/types/roles';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const budtenderShiftSchema = z.object({
    orgId: z.string().min(1),
    userId: z.string().min(1),
    firstName: z.string().min(1),
});

export interface BudtenderShift {
    id: string;
    orgId: string;
    userId: string;
    firstName: string;
    role: string;
    clockedInAt: Date;
    clockedOutAt?: Date;
    status: 'active' | 'completed';
}

function shiftDocPath(orgId: string, shiftId: string) {
    return `tenants/${orgId}/budtender_shifts/${shiftId}`;
}

/**
 * Clock in a budtender as on-duty
 */
export async function clockInBudtender(
    orgId: string,
    userId: string,
    firstName: string,
    role: string = 'budtender',
): Promise<{ success: boolean; shiftId?: string; error?: string }> {
    try {
        const validated = budtenderShiftSchema.parse({ orgId, userId, firstName });
        const db = getAdminFirestore();

        // Check if already clocked in
        const existingActive = await db
            .collection(`tenants/${orgId}/budtender_shifts`)
            .where('userId', '==', userId)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (!existingActive.empty) {
            const existing = existingActive.docs[0].data();
            return {
                success: false,
                error: `Already clocked in as ${existing.firstName}`,
                shiftId: existingActive.docs[0].id,
            };
        }

        const now = new Date();
        const shiftRef = db.collection(`tenants/${orgId}/budtender_shifts`).doc();
        
        await shiftRef.set({
            id: shiftRef.id,
            orgId: validated.orgId,
            userId: validated.userId,
            firstName: validated.firstName,
            role,
            clockedInAt: now,
            clockedOutAt: null,
            status: 'active',
            createdAt: now,
            updatedAt: now,
        });

        logger.info('[BudtenderShift] Budtender clocked in', {
            orgId,
            userId,
            firstName,
            shiftId: shiftRef.id,
        });

        return { success: true, shiftId: shiftRef.id };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors[0]?.message || 'Invalid input' };
        }
        logger.error('[BudtenderShift] Failed to clock in', { orgId, userId, error: String(error) });
        return { success: false, error: 'Failed to clock in' };
    }
}

/**
 * Clock out a budtender
 */
export async function clockOutBudtender(
    orgId: string,
    shiftId: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminFirestore();
        const shiftRef = db.collection(`tenants/${orgId}/budtender_shifts`).doc(shiftId);
        const shiftDoc = await shiftRef.get();

        if (!shiftDoc.exists) {
            return { success: false, error: 'Shift not found' };
        }

        const shiftData = shiftDoc.data();
        if (shiftData?.status === 'completed') {
            return { success: false, error: 'Already clocked out' };
        }

        const now = new Date();
        await shiftRef.update({
            clockedOutAt: now,
            status: 'completed',
            updatedAt: now,
        });

        logger.info('[BudtenderShift] Budtender clocked out', {
            orgId,
            shiftId,
            userId: shiftData?.userId,
        });

        return { success: true };
    } catch (error) {
        logger.error('[BudtenderShift] Failed to clock out', { orgId, shiftId, error: String(error) });
        return { success: false, error: 'Failed to clock out' };
    }
}

/**
 * Get all active (on-duty) budtenders for an org
 */
export async function getActiveBudtenders(
    orgId: string,
): Promise<{ success: boolean; budtenders?: BudtenderShift[]; error?: string }> {
    try {
        const db = getAdminFirestore();
        const snapshot = await db
            .collection(`tenants/${orgId}/budtender_shifts`)
            .where('status', '==', 'active')
            .orderBy('clockedInAt', 'asc')
            .get();

        const budtenders: BudtenderShift[] = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                orgId: d.orgId,
                userId: d.userId,
                firstName: d.firstName,
                role: d.role,
                clockedInAt: d.clockedInAt?.toDate?.() ?? new Date(d.clockedInAt),
                clockedOutAt: d.clockedOutAt?.toDate?.() ?? undefined,
                status: d.status,
            };
        });

        return { success: true, budtenders };
    } catch (error) {
        logger.error('[BudtenderShift] Failed to get active budtenders', { orgId, error: String(error) });
        return { success: false, error: 'Failed to get active budtenders' };
    }
}

/**
 * Get today's shift history for an org (for the dashboard card)
 */
export async function getTodaysBudtenderShifts(
    orgId: string,
): Promise<{ success: boolean; shifts?: BudtenderShift[]; error?: string }> {
    try {
        const db = getAdminFirestore();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const snapshot = await db
            .collection(`tenants/${orgId}/budtender_shifts`)
            .where('clockedInAt', '>=', todayStart)
            .orderBy('clockedInAt', 'desc')
            .get();

        const shifts: BudtenderShift[] = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                orgId: d.orgId,
                userId: d.userId,
                firstName: d.firstName,
                role: d.role,
                clockedInAt: d.clockedInAt?.toDate?.() ?? new Date(d.clockedInAt),
                clockedOutAt: d.clockedOutAt?.toDate?.() ?? undefined,
                status: d.status,
            };
        });

        return { success: true, shifts };
    } catch (error) {
        logger.error('[BudtenderShift] Failed to get today shifts', { orgId, error: String(error) });
        return { success: false, error: 'Failed to get shifts' };
    }
}

/**
 * Check if a user is currently clocked in
 */
export async function isBudtenderClockedIn(
    orgId: string,
    userId: string,
): Promise<{ success: boolean; isClockedIn: boolean; shiftId?: string; error?: string }> {
    try {
        const db = getAdminFirestore();
        const snapshot = await db
            .collection(`tenants/${orgId}/budtender_shifts`)
            .where('userId', '==', userId)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { success: true, isClockedIn: false };
        }

        return {
            success: true,
            isClockedIn: true,
            shiftId: snapshot.docs[0].id,
        };
    } catch (error) {
        logger.error('[BudtenderShift] Failed to check clock-in status', { orgId, userId, error: String(error) });
        return { success: false, isClockedIn: false, error: 'Failed to check status' };
    }
}
