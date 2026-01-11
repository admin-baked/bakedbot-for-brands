'use server';

import { requireUser } from '@/server/auth/auth';
import { getGmailToken } from '@/server/integrations/gmail/token-storage';

/**
 * Checks if the current user has a valid Gmail connection.
 */
export async function checkGmailConnection() {
    try {
        const user = await requireUser();
        const token = await getGmailToken(user.uid);
        
        // We consider it connected if we have a refresh token (even if encrypted)
        // logic in getGmailToken returns credentials object if found.
        if (token && (token.refresh_token || token.access_token)) {
            return { isConnected: true, email: user.email };
        }
        return { isConnected: false };
    } catch (error) {
        console.error("Failed to check Gmail connection:", error);
        return { isConnected: false };
    }
}
