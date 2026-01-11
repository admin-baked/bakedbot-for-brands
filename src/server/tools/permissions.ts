
/**
 * Permissions Tool
 * Allows agents to request specific permissions from the user
 * directly in the chat interface.
 */

export interface PermissionRequestResult {
    success: boolean;
    status: 'requested' | 'granted' | 'denied' | 'error';
    message: string;
    metadata?: any;
}

/**
 * Requests a specific permission from the user.
 * This function returns a formatted string that the Frontend UI
 * (PuffChat) intercepts to render a Permission Card.
 * 
 * @param permissionType - The type of permission (e.g., 'gmail', 'calendar')
 * @param reason - Why the agent needs this permission
 */
export async function requestPermission(permissionType: string, reason: string): Promise<PermissionRequestResult> {
    // Return a structured response that the UI can detect.
    // The UI looks for metadata or specific patterns.
    
    const validPermissions = ['gmail', 'calendar', 'drive', 'sheets'];
    const pType = permissionType.toLowerCase();
    
    if (!validPermissions.includes(pType)) {
        return {
            success: false,
            status: 'error',
            message: `Invalid permission type '${permissionType}'. Supported: ${validPermissions.join(', ')}`
        };
    }

    return {
        success: true,
        status: 'requested',
        message: `[PERMISSION_REQUEST:${pType.toUpperCase()}] Requesting access to ${pType} for: ${reason}`,
        metadata: {
            type: 'permission_request',
            permission: pType,
            reason: reason
        }
    };
}
