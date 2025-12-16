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

        // Support both brandName and entityName inputs
        const entityName = (formData.get('entityName') as string) || (formData.get('brandName') as string);
        const entityId = (formData.get('entityId') as string) || (formData.get('brandId') as string) || 'pending-resolution';
        const entityType = (formData.get('entityType') as string) || 'brand';

        const website = formData.get('website') as string;
        const contactName = formData.get('contactName') as string;
        const businessEmail = formData.get('businessEmail') as string;
        const role = formData.get('role') as string;
        const phone = formData.get('phone') as string;

        if (!entityName || !businessEmail || !contactName) {
            return { error: 'Missing required fields' };
        }

        const claimId = uuidv4();
        const now = new Date();

        const newClaim = {
            id: claimId,
            entityId,
            brandId: entityType === 'brand' ? entityId : undefined, // Legacy support
            dispensaryId: entityType === 'dispensary' ? entityId : undefined,
            entityType,
            entityName,
            userId: 'guest', // TODO: Link to auth user if logged in
            businessEmail,
            role,
            website,
            status: 'pending',
            submittedAt: now,
            contactName,
            phone
        };

        // Determine collection based on type, or keep centralized
        // Centralizing in 'claims' or keeping 'brandClaims' for now?
        // Let's use a unified 'entity_claims' collection or backward compatible 'brandClaims' with type field
        await firestore.collection('brandClaims').doc(claimId).set(newClaim);

        return { success: true, claimId };

    } catch (error) {
        console.error('Error submitting claim:', error);
        return { error: 'Failed to submit claim. Please try again.' };
    }
}
