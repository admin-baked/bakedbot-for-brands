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

export async function checkIntegrationsStatus(): Promise<SystemIntegrations> {
    try {
        const user = await requireUser();
        const { firestore } = await createServerClient();
        
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
        console.error('Failed to check integration status:', error);
        return {
            gmail: 'error',
            calendar: 'error',
            drive: 'error',
            sheets: 'error'
        };
    }
}
