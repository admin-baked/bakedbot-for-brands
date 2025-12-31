import { createServerClient } from '@/firebase/server-client';

export type PermissionStatus = 'granted' | 'denied' | 'pending';

export interface PermissionRecord {
    toolName: string;
    status: PermissionStatus;
    grantedAt: Date;
    grantedBy: string; // userId
}

/**
 * Checks if a user has permission to use a specific tool.
 * Returns false if no record exists or if status is not 'granted'.
 */
export async function checkPermission(userId: string, toolName: string): Promise<boolean> {
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
export async function grantPermission(userId: string, toolName: string) {
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
export async function revokePermission(userId: string, toolName: string) {
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
