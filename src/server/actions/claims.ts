
'use server';

import { createServerClient } from '@/firebase/server-client';

export interface ClaimRequestData {
    businessName: string;
    businessAddress: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    role: string;
    retailerId?: string; // Optional if they found it via search
}

export interface ClaimResult {
    success: boolean;
    message: string;
}

export async function submitClaimRequest(data: ClaimRequestData): Promise<ClaimResult> {
    // Validate required fields
    if (!data.businessName || !data.contactEmail || !data.contactPhone || !data.contactName) {
        return { success: false, message: 'Please fill in all required fields.' };
    }

    try {
        const { firestore } = await createServerClient();

        await firestore.collection('foot_traffic').doc('data').collection('claims').add({
            ...data,
            status: 'pending',
            createdAt: new Date(),
            source: 'claim_page'
        });

        return {
            success: true,
            message: 'Claim request submitted successfully! Our team will verify your ownership within 24-48 hours.'
        };
    } catch (error) {
        console.error('Error submitting claim:', error);
        return { success: false, message: 'Failed to submit claim. Please try again.' };
    }
}
