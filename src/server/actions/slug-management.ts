'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

/**
 * Create a URL-safe slug from a brand name
 */
export function createSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

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
    await requireUser(['brand', 'super_user']);
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
    
    // Reserve the slug by creating/updating the brand document
    await firestore.collection('brands').doc(normalizedSlug).set({
        id: normalizedSlug,
        slug: normalizedSlug,
        originalBrandId: brandId,
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
