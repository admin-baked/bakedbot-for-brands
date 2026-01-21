'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

export type IntegrationStatus = 'active' | 'disconnected' | 'error';

export interface SystemIntegrations {
    gmail: IntegrationStatus;
    calendar: IntegrationStatus;
    drive: IntegrationStatus;
    sheets: IntegrationStatus;
}

/**
 * Check the status of Google Workspace integrations for the current user.
 * Returns 'disconnected' for all services if user is not authenticated or Firebase is unavailable.
 */
export async function checkIntegrationsStatus(): Promise<SystemIntegrations> {
    // Default status when Firebase isn't available or user isn't authenticated
    const defaultStatus: SystemIntegrations = {
        gmail: 'disconnected',
        calendar: 'disconnected',
        drive: 'disconnected',
        sheets: 'disconnected'
    };

    try {
        // First check if user is authenticated
        let user;
        try {
            user = await requireUser();
        } catch (authError) {
            // User not authenticated - return disconnected (not error)
            console.log('[integrations] User not authenticated, returning disconnected status');
            return defaultStatus;
        }

        // Try to get Firestore client
        let firestore;
        try {
            const client = await createServerClient();
            firestore = client.firestore;
        } catch (firebaseError) {
            // Firebase not initialized - return disconnected with warning
            console.warn('[integrations] Firebase not available:', firebaseError);
            return defaultStatus;
        }

        const integrationsRef = firestore.collection('users').doc(user.uid).collection('integrations');

        // Parallel fetch for all services
        const [gmailDoc, calendarDoc, driveDoc, sheetsDoc] = await Promise.all([
            integrationsRef.doc('gmail').get(),
            integrationsRef.doc('calendar').get(),
            integrationsRef.doc('drive').get(),
            integrationsRef.doc('sheets').get()
        ]);

        const checkStatus = (doc: FirebaseFirestore.DocumentSnapshot): IntegrationStatus => {
            if (!doc.exists) return 'disconnected';
            const data = doc.data();
            // Basic check: if we have an encrypted refresh token, we're likely good.
            // In a real system, we might test the token validity here.
            return data?.refreshTokenEncrypted ? 'active' : 'disconnected';
        };

        return {
            gmail: checkStatus(gmailDoc),
            calendar: checkStatus(calendarDoc),
            drive: checkStatus(driveDoc),
            sheets: checkStatus(sheetsDoc)
        };

    } catch (error) {
        console.error('[integrations] Failed to check integration status:', error);
        // Return disconnected instead of error for better UX
        return defaultStatus;
    }
}
