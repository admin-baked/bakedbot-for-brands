/**
 * Admin Server Action - Set User Role and Custom Claims
 *
 * Allows super_user to assign roles and custom claims to users.
 * Use this to enroll interns in the training program.
 */

'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminAuth } from '@/firebase/admin';
import { logger } from '@/lib/logger';

type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

interface SetUserRoleInput {
    uid: string;
    role: 'super_user' | 'owner' | 'brand' | 'dispensary' | 'customer' | 'intern';
    additionalClaims?: {
        orgId?: string;
        brandId?: string;
        planId?: string;
        cohortId?: string;
        enrollmentDate?: string;
    };
}

/**
 * Set custom claims for a user (super_user only)
 */
export async function setUserRole(input: SetUserRoleInput): Promise<ActionResult<{ message: string }>> {
    try {
        // Only super users can set roles
        await requireUser(['super_user']);

        const auth = getAdminAuth();

        // Get current user to verify they exist
        const user = await auth.getUser(input.uid);

        if (!user) {
            return {
                success: false,
                error: 'User not found'
            };
        }

        // Prepare custom claims
        const customClaims: Record<string, any> = {
            role: input.role,
            ...input.additionalClaims
        };

        // Set custom claims
        await auth.setCustomUserClaims(input.uid, customClaims);

        logger.info('Custom claims set', {
            uid: input.uid,
            role: input.role,
            email: user.email,
            claims: customClaims
        });

        return {
            success: true,
            data: {
                message: `Successfully set role to '${input.role}' for ${user.email}. User must sign out and back in for changes to take effect.`
            }
        };
    } catch (error) {
        logger.error('Failed to set user role', error instanceof Error ? error : new Error(String(error)));
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to set user role'
        };
    }
}

/**
 * Get user's current custom claims (super_user only)
 */
export async function getUserClaims(uid: string): Promise<ActionResult<Record<string, any>>> {
    try {
        await requireUser(['super_user']);

        const auth = getAdminAuth();
        const user = await auth.getUser(uid);

        return {
            success: true,
            data: user.customClaims || {}
        };
    } catch (error) {
        logger.error('Failed to get user claims', error instanceof Error ? error : new Error(String(error)));
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get user claims'
        };
    }
}

/**
 * Enroll user in training program as intern
 */
export async function enrollIntern(input: {
    uid: string;
    cohortId?: string;
}): Promise<ActionResult<{ message: string }>> {
    try {
        await requireUser(['super_user']);

        const auth = getAdminAuth();
        const user = await auth.getUser(input.uid);

        const customClaims: Record<string, any> = {
            role: 'intern',
            enrollmentDate: new Date().toISOString(),
        };

        if (input.cohortId) {
            customClaims.cohortId = input.cohortId;
        }

        await auth.setCustomUserClaims(input.uid, customClaims);

        logger.info('Intern enrolled', {
            uid: input.uid,
            email: user.email,
            cohortId: input.cohortId
        });

        return {
            success: true,
            data: {
                message: `Successfully enrolled ${user.email} as intern. They must sign out and back in to access training.`
            }
        };
    } catch (error) {
        logger.error('Failed to enroll intern', error instanceof Error ? error : new Error(String(error)));
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to enroll intern'
        };
    }
}
