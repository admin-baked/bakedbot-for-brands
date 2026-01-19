/**
 * Tool Permissions Service
 * 
 * Manages user-level permissions for agent tools (NOT RBAC roles).
 * This is separate from the role-based access control in src/server/auth/rbac.ts.
 * 
 * Use Cases:
 * - Granting/revoking access to specific integrations (e.g., dutchie.sync)
 * - Tracking which tools a user has explicitly authorized
 * - Managing consent for data access tools
 * 
 * For role-based permissions (brand, dispensary, super_user), see:
 * - src/server/auth/rbac.ts
 * - src/server/auth/auth.ts (requireUser)
 */

import { createServerClient } from '@/firebase/server-client';

export type PermissionStatus = 'granted' | 'denied' | 'pending';

export interface ToolPermissionRecord {
    toolName: string;
    status: PermissionStatus;
    grantedAt: Date;
    grantedBy: string; // userId
}

/**
 * Checks if a user has permission to use a specific tool.
 * Returns false if no record exists or if status is not 'granted'.
 */
export async function checkToolPermission(userId: string, toolName: string): Promise<boolean> {
    const { firestore } = await createServerClient();
    // Normalize tool name (e.g., 'dutchie.sync' -> 'dutchie')
    // For now, we granulate by the full tool name or prefix. 
    // Let's assume per-tool granularity for safety.
    
    const doc = await firestore
        .collection('users')
        .doc(userId)
        .collection('permissions')
        .doc(toolName)
        .get();

    if (!doc.exists) return false;
    
    const data = doc.data();
    return data?.status === 'granted';
}

/**
 * Grants permission for a user to use a tool.
 */
export async function grantToolPermission(userId: string, toolName: string) {
    const { firestore } = await createServerClient();
    
    await firestore
        .collection('users')
        .doc(userId)
        .collection('permissions')
        .doc(toolName)
        .set({
            toolName,
            status: 'granted',
            grantedAt: new Date(),
            grantedBy: userId
        }, { merge: true });
        
    return true;
}

/**
 * Revokes permission.
 */
export async function revokeToolPermission(userId: string, toolName: string) {
    const { firestore } = await createServerClient();

    await firestore
        .collection('users')
        .doc(userId)
        .collection('permissions')
        .doc(toolName)
        .set({
            status: 'denied',
            revokedAt: new Date(),
        }, { merge: true });
        
    return true;
}

// Legacy export aliases for backward compatibility
export const checkPermission = checkToolPermission;
export const grantPermission = grantToolPermission;
export const revokePermission = revokeToolPermission;
export type PermissionRecord = ToolPermissionRecord;
