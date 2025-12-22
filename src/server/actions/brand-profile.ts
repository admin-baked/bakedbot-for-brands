
'use server';

import { createServerClient } from '@/firebase/server-client';
import { DeeboGuardrails } from '@/server/services/deebo-guardrails';
import { revalidatePath } from 'next/cache';

export async function updateBrandProfile(brandId: string, formData: FormData) {
    const { firestore } = await createServerClient();

    const description = formData.get('description') as string;
    const websiteUrl = formData.get('websiteUrl') as string;
    const logoUrl = formData.get('logoUrl') as string;
    const coverImageUrl = formData.get('coverImageUrl') as string;
    const name = formData.get('name') as string | null;
    const isInitialNameSet = formData.get('isInitialNameSet') === 'true';

    // 1. Run Deebo Guardrails on description
    const compliance = DeeboGuardrails.validateContent(description || '');

    if (!compliance.isValid) {
        return {
            success: false,
            error: `Content contains prohibited terms: ${compliance.violations.join(', ')}`
        };
    }

    // 2. Also validate name if provided
    if (name) {
        const nameCompliance = DeeboGuardrails.validateContent(name);
        if (!nameCompliance.isValid) {
            return {
                success: false,
                error: `Brand name contains prohibited terms: ${nameCompliance.violations.join(', ')}`
            };
        }
    }

    // 3. Build update payload
    const updateData: Record<string, any> = {
        description,
        websiteUrl,
        logoUrl,
        coverImageUrl,
        updatedAt: new Date()
    };

    // 4. Handle name update - only allowed for initial set
    if (name && isInitialNameSet) {
        updateData.name = name.trim();
        updateData.nameSetByUser = true;
        updateData.slug = createSlug(name);
    }

    // 5. Update Firestore (use set with merge to handle creation if missing)
    await firestore.collection('brands').doc(brandId).set(updateData, { merge: true });

    // 6. Revalidate
    const slug = updateData.slug || brandId;
    revalidatePath(`/brands/${slug}`);
    revalidatePath('/dashboard/content/brand-page');

    return { success: true, nameUpdated: !!name && isInitialNameSet };
}

/**
 * Create a URL-safe slug from a brand name
 */
function createSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Request a brand name change (for brands that already have a name set)
 */
export async function requestBrandNameChange(
    brandId: string,
    currentName: string,
    requestedName: string,
    reason: string
) {
    const { firestore } = await createServerClient();

    // Create a name change request document
    await firestore.collection('brandNameChangeRequests').add({
        brandId,
        currentName,
        requestedName,
        reason,
        status: 'pending',
        createdAt: new Date()
    });

    return { success: true, message: 'Name change request submitted for review.' };
}
