
'use server';

import { createServerClient } from '@/firebase/server-client';

export interface DropAlertResult {
    success: boolean;
    message: string;
}

export async function subscribeToDropAlert(email: string, zipCode: string, metadata?: { ageVerified: boolean }): Promise<DropAlertResult> {
    // Basic validation
    if (!email || !email.includes('@')) {
        return { success: false, message: 'Please enter a valid email address.' };
    }

    if (!zipCode || zipCode.length !== 5) {
        return { success: false, message: 'Invalid location context.' };
    }

    try {
        const { firestore } = await createServerClient();

        // Check if already subscribed to prevent duplicates (optional, but good practice)
        // For MVP, we'll just add a new record or overwrite.
        // Let's use a composite ID to prevent duplicate docs: email_zip
        const docId = `${email}_${zipCode}`.replace(/[^a-zA-Z0-9_]/g, '_');

        await firestore.collection('foot_traffic').doc('data').collection('alerts').doc(docId).set({
            email,
            zipCode,
            type: 'drop_alert',
            createdAt: new Date(),
            status: 'active',
            source: 'seo_page',
            metadata: metadata || {}
        });

        return { success: true, message: "You're on the list! We'll notify you when fresh drops land." };
    } catch (error) {
        console.error('Error subscribing to drop alert:', error);
        return { success: false, message: 'Something went wrong. Please try again later.' };
    }
}
