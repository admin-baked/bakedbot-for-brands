'use server';

import { createServerClient } from '@/firebase/server-client';
import { BrandClaim } from '@/types/brand-page';
import { v4 as uuidv4 } from 'uuid';

export type SubmitClaimState = {
    success?: boolean;
    error?: string;
    claimId?: string;
};

export async function submitBrandClaim(prevState: SubmitClaimState, formData: FormData): Promise<SubmitClaimState> {
    try {
        const { firestore } = await createServerClient();

        const brandName = formData.get('brandName') as string;
        const brandId = formData.get('brandId') as string || 'pending-resolution'; // We might not have an ID yet if it's a new brand
        const website = formData.get('website') as string;
        const contactName = formData.get('contactName') as string;
        const businessEmail = formData.get('businessEmail') as string;
        const role = formData.get('role') as string;
        const phone = formData.get('phone') as string;

        if (!brandName || !businessEmail || !contactName) {
            return { error: 'Missing required fields' };
        }

        const claimId = uuidv4();
        const now = new Date();

        const newClaim: BrandClaim = {
            id: claimId,
            brandId: brandId,
            userId: 'guest', // TODO: Link to auth user if logged in
            businessEmail,
            role,
            website,
            status: 'pending',
            submittedAt: now,
            // Additional fields captured from form not in strict BrandClaim type but useful
            // We might want to extend BrandClaim or just store them freely in Firestore
        };

        // We'll store the extra contact info in the document as well, even if not in the strict shared type yet
        const claimData = {
            ...newClaim,
            contactName,
            phone,
            brandName, // Store name explicitly as ID might be fuzzy
        };

        await firestore.collection('brandClaims').doc(claimId).set(claimData);

        return { success: true, claimId };

    } catch (error) {
        console.error('Error submitting brand claim:', error);
        return { error: 'Failed to submit claim. Please try again.' };
    }
}
