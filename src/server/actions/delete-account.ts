'use server';

/**
 * Server actions for deleting user accounts
 * SUPER USER ONLY - Destructive operations for testing
 */

import { getAdminFirestore, getAdminAuth } from '@/firebase/admin';
import { getServerSessionUser } from '@/server/auth/session';
import { isSuperAdminEmail } from '@/lib/super-admin-config';

/**
 * Check if current user is a Super User
 * Checks both Firestore role/flag AND email whitelist
 */
export async function isSuperUser(uid: string, email?: string | null): Promise<boolean> {
    try {
        // Quick check: If email is provided and in whitelist, grant access immediately
        // This avoids Firestore lookup failures if user profile is missing/incomplete
        if (email && isSuperAdminEmail(email)) {
            return true;
        }

        const adminDb = getAdminFirestore();
        const userDoc = await adminDb.collection('users').doc(uid).get();
        const userData = userDoc.data();
        
        // Check for super_user role or admin with elevated permissions
        if (userData?.role === 'super_user' || userData?.isSuperAdmin === true) {
            return true;
        }
        
        // Also check email whitelist from Firestore doc if strictly relying on UID
        if (userData?.email && isSuperAdminEmail(userData.email)) {
            return true;
        }
        
        // Also check owner role (they have super admin access)
        if (userData?.role === 'super_user') {
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking super user status:', error);
        return false;
    }
}

/**
 * Delete a user account and all associated data
 * @param userId - User ID to delete
 * @returns Success status and error message if any
 */
export async function deleteUserAccount(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Get current user and verify Super User status
        const currentUser = await getServerSessionUser();
        if (!currentUser || !(await isSuperUser(currentUser.uid, currentUser.email))) {
            return { success: false, error: 'Unauthorized: Super User access required' };
        }

        // Prevent deleting Super Users
        // Check using both ID and email if available (usually we only have ID here for target)
        // We fetch the target user data first to check if they are a super user
        const adminDb = getAdminFirestore();
        const targetUserDoc = await adminDb.collection('users').doc(userId).get();
        const targetUserData = targetUserDoc.data();
        
        if (targetUserData?.email && isSuperAdminEmail(targetUserData.email)) {
             return { success: false, error: 'Cannot delete Super User accounts (email match)' };
        }
        
        if (await isSuperUser(userId)) {
            return { success: false, error: 'Cannot delete Super User accounts' };
        }

        // Delete Firebase Auth user
        try {
            const auth = getAdminAuth();
            await auth.deleteUser(userId);
        } catch (authError: any) {
            if (authError.code !== 'auth/user-not-found') {
                throw authError;
            }
            // Continue if user not found in Auth (maybe already deleted)
        }

        // Delete user document and subcollections
        await deleteUserData(userId);

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting user account:', error);
        return { success: false, error: error.message || 'Failed to delete user account' };
    }
}

/**
 * Delete user document and all subcollections/associated data
 */
async function deleteUserData(userId: string): Promise<void> {
    const adminDb = getAdminFirestore();
    const batch = adminDb.batch();
    
    // Delete main user document
    const userRef = adminDb.collection('users').doc(userId);
    batch.delete(userRef);

    // Delete subcollections
    const subcollections = [
        'chat_sessions',
        'chatSessions',
        'integrations',
        'notifications',
        'passport',
    ];

    for (const subcollection of subcollections) {
        const subDocs = await userRef.collection(subcollection).listDocuments();
        for (const doc of subDocs) {
            batch.delete(doc);
        }
    }

    // Delete related data across collections
    
    // 1. Knowledge base entries created by user
    const kbEntries = await adminDb.collection('knowledge_base')
        .where('createdBy', '==', userId)
        .get();
    kbEntries.docs.forEach((doc: any) => batch.delete(doc.ref));

    // 2. Tasks assigned to user
    const tasks = await adminDb.collection('tasks')
        .where('userId', '==', userId)
        .get();
    tasks.docs.forEach((doc: any) => batch.delete(doc.ref));

    // 3. Drop alerts/subscriptions
    const alerts = await adminDb.collection('drop_alerts')
        .where('userId', '==', userId)
        .get();
    alerts.docs.forEach((doc: any) => batch.delete(doc.ref));

    // 4. User sessions
    const sessions = await adminDb.collection('user_sessions')
        .where('userId', '==', userId)
        .get();
    sessions.docs.forEach((doc: any) => batch.delete(doc.ref));

    // Commit all deletions
    await batch.commit();
}

/**
 * Get all users for Super User management
 * @returns List of users with basic info
 */
export async function getAllUsers(): Promise<Array<{
    uid: string;
    email: string | null;
    displayName: string | null;
    role: string | null;
    createdAt: string | null;
}>> {
    try {
        const currentUser = await getServerSessionUser();
        if (!currentUser || !(await isSuperUser(currentUser.uid, currentUser.email))) {
            throw new Error('Unauthorized: Super User access required');
        }

        const adminDb = getAdminFirestore();
        const usersSnapshot = await adminDb.collection('users').get();
        
        return usersSnapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
                uid: doc.id,
                email: data.email || null,
                displayName: data.displayName || null,
                role: data.role || null,
                createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
            };
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
}
