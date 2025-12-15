
'use server';

import { createServerClient } from '@/firebase/server-client';
import { DeeboGuardrails } from '@/server/services/deebo-guardrails';
import { revalidatePath } from 'next/cache';

export async function updateBrandProfile(brandId: string, formData: FormData) {
    const { firestore } = await createServerClient();

    const description = formData.get('description') as string;
    const websiteUrl = formData.get('websiteUrl') as string;

    // 1. Run Deebo Guardrails
    const compliance = DeeboGuardrails.validateContent(description || '');

    if (!compliance.isValid) {
        return {
            success: false,
            error: `Content contains prohibited terms: ${compliance.violations.join(', ')}`
        };
    }

    // 2. Update Firestore
    await firestore.collection('brands').doc(brandId).update({
        description,
        websiteUrl,
        updatedAt: new Date()
    });

    // 3. Revalidate
    revalidatePath(`/brands/${brandId}`); // Assuming slug logic handles ID lookup or we pass slug
    return { success: true };
}
