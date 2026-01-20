'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { createSlug } from '@/lib/utils/slug';


/**
 * Check if a slug is available for use
 */
export async function checkSlugAvailability(slug: string): Promise<{ available: boolean; suggestion?: string }> {
    const { firestore } = await createServerClient();
    
    // Normalize the slug
    const normalizedSlug = createSlug(slug);
    
    if (!normalizedSlug || normalizedSlug.length < 3) {
        return { available: false, suggestion: undefined };
    }
    
    // Check if slug exists in brands collection
    const brandDoc = await firestore.collection('brands').doc(normalizedSlug).get();
    
    if (!brandDoc.exists) {
        return { available: true };
    }
    
    // If taken, suggest alternatives
    const suggestion = `${normalizedSlug}-${Math.floor(Math.random() * 100)}`;
    return { available: false, suggestion };
}

/**
 * Reserve a slug for a brand (set the brand document with slug field)
 */
export async function reserveSlug(slug: string, brandId: string): Promise<{ success: boolean; error?: string }> {
    const user = await requireUser(['brand', 'super_user']);
    const { firestore } = await createServerClient();

    const normalizedSlug = createSlug(slug);

    if (!normalizedSlug || normalizedSlug.length < 3) {
        return { success: false, error: 'Slug must be at least 3 characters' };
    }

    // Check availability first
    const { available } = await checkSlugAvailability(normalizedSlug);

    if (!available) {
        return { success: false, error: 'This URL is already taken. Try a different one.' };
    }

    // Get existing organization data to populate brand
    const orgDoc = await firestore.collection('organizations').doc(brandId).get();
    const orgData = orgDoc.exists ? orgDoc.data() : null;

    // Determine brand name - use org name, user display name, or slug
    const brandName = orgData?.name || (user as any)?.displayName || normalizedSlug;

    // Reserve the slug by creating/updating the brand document with full brand info
    await firestore.collection('brands').doc(normalizedSlug).set({
        id: normalizedSlug,
        slug: normalizedSlug,
        name: brandName,
        originalBrandId: brandId,
        ownerId: user.uid,
        description: orgData?.description || '',
        logoUrl: orgData?.logoUrl || '',
        verificationStatus: 'verified',
        claimStatus: 'claimed',
        type: 'brand',
        createdAt: new Date(),
        updatedAt: new Date(),
    }, { merge: true });

    // Also update the organization with the slug
    await firestore.collection('organizations').doc(brandId).set({
        slug: normalizedSlug,
        updatedAt: new Date(),
    }, { merge: true });

    return { success: true };
}

/**
 * Get brand's current slug
 */
export async function getBrandSlug(brandId: string): Promise<string | null> {
    const { firestore } = await createServerClient();
    
    // Check organizations first
    const orgDoc = await firestore.collection('organizations').doc(brandId).get();
    if (orgDoc.exists) {
        const data = orgDoc.data();
        if (data?.slug) return data.slug;
    }
    
    // Fallback to brands collection
    const brandDoc = await firestore.collection('brands').doc(brandId).get();
    if (brandDoc.exists) {
        const data = brandDoc.data();
        return data?.slug || brandId;
    }
    
    return null;
}
