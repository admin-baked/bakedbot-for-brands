/**
 * User Administration Tools
 *
 * Super User agents can approve, reject, and manage users via these tools.
 * Available to: Leo (COO), Linus (CTO), Jack (CRO), Glenda (CMO), Mike (CFO)
 */

import { getAdminAuth } from '@/firebase/admin';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { userNotification } from '@/server/services/user-notification';

/**
 * Get all users with lifecycle stage
 */
export const userGetAll = async (filters?: { role?: string; lifecycleStage?: string; limit?: number }) => {
    try {
        const auth = getAdminAuth();
        const db = getAdminFirestore();
        const limit = filters?.limit || 100;

        const userRecords = await auth.listUsers(limit);
        const users = [];

        for (const userRecord of userRecords.users) {
            const userDoc = await db.collection('users').doc(userRecord.uid).get();
            const userData = userDoc.data();

            // Filter by role if specified
            if (filters?.role && userData?.role !== filters.role) continue;
            // Filter by lifecycle stage if specified
            if (filters?.lifecycleStage && userData?.lifecycleStage !== filters.lifecycleStage) continue;

            users.push({
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName || 'Unknown',
                role: userData?.role || 'unknown',
                lifecycleStage: userData?.lifecycleStage || 'unknown',
                createdAt: userRecord.metadata.creationTime,
                lastSignIn: userRecord.metadata.lastSignInTime,
            });
        }

        return {
            success: true,
            users,
            total: users.length,
        };
    } catch (e: any) {
        logger.error('[User Admin Tool] Failed to get users:', e);
        return { success: false, error: e.message, users: [], total: 0 };
    }
};

/**
 * Approve a pending user account
 */
export const userApprove = async (uid: string, approvedBy: string = 'super_user') => {
    try {
        const db = getAdminFirestore();
        const auth = getAdminAuth();

        // Get user info
        const userRecord = await auth.getUser(uid);
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();

        if (!userData) {
            return { success: false, error: `User ${uid} not found in Firestore` };
        }

        // Update approval status in Firestore
        await db.collection('users').doc(uid).update({
            status: 'active',
            approvedAt: new Date(),
            lifecycleStage: 'customer',
        });

        // Send approval notification email
        await userNotification.notifyUserApproved(uid, approvedBy);

        logger.info(`[User Admin Tool] User ${userRecord.email} approved`);

        return {
            success: true,
            message: `User ${userRecord.email} approved and activated`,
            notificationSent: true,
        };
    } catch (e: any) {
        logger.error('[User Admin Tool] Failed to approve user:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Reject a pending user account
 */
export const userReject = async (uid: string, reason?: string, rejectedBy: string = 'super_user') => {
    try {
        const db = getAdminFirestore();
        const auth = getAdminAuth();

        // Get user info
        const userRecord = await auth.getUser(uid);

        // Update status in Firestore
        await db.collection('users').doc(uid).update({
            status: 'rejected',
            rejectedAt: new Date(),
            rejectionReason: reason || 'No reason provided',
            lifecycleStage: 'rejected',
        });

        // Send rejection notification email
        await userNotification.notifyUserRejected(uid, rejectedBy, reason);

        logger.info(`[User Admin Tool] User ${userRecord.email} rejected: ${reason || 'No reason provided'}`);

        return {
            success: true,
            message: `User ${userRecord.email} rejected`,
            notificationSent: true,
        };
    } catch (e: any) {
        logger.error('[User Admin Tool] Failed to reject user:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Promote a user to super_user (requires confirmation)
 */
export const userPromote = async (uid: string, newRole: string, promotedBy: string = 'super_user') => {
    try {
        const db = getAdminFirestore();
        const auth = getAdminAuth();

        // Get user info
        const userRecord = await auth.getUser(uid);

        // Validate role
        const validRoles = ['super_user', 'super_admin', 'brand_admin', 'dispensary_admin'];
        if (!validRoles.includes(newRole)) {
            return { success: false, error: `Invalid role: ${newRole}` };
        }

        // Update custom claims (Firebase Auth)
        await auth.setCustomUserClaims(uid, { role: newRole } as Record<string, any>);

        // Update Firestore
        await db.collection('users').doc(uid).update({
            role: newRole,
            promotedAt: new Date(),
        });

        // Send promotion notification email
        await userNotification.notifyUserPromoted(uid, promotedBy, newRole);

        logger.info(`[User Admin Tool] User ${userRecord.email} promoted to ${newRole}`);

        return {
            success: true,
            message: `User ${userRecord.email} promoted to ${newRole}`,
            notificationSent: true,
        };
    } catch (e: any) {
        logger.error('[User Admin Tool] Failed to promote user:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Get pending users awaiting approval
 */
export const userGetPending = async (limit: number = 50) => {
    try {
        const db = getAdminFirestore();

        const snapshot = await db
            .collection('users')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const users = snapshot.docs.map(doc => ({
            uid: doc.id,
            email: doc.data().email,
            displayName: doc.data().displayName || 'Unknown',
            role: doc.data().role || 'unknown',
            createdAt: doc.data().createdAt,
            appliedReason: doc.data().appliedReason,
        }));

        return {
            success: true,
            users,
            total: users.length,
        };
    } catch (e: any) {
        logger.error('[User Admin Tool] Failed to get pending users:', e);
        return { success: false, error: e.message, users: [], total: 0 };
    }
};
