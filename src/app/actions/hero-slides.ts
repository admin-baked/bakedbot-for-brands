'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { HeroSlide, HeroSlideInput } from '@/types/hero-slides';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

const HERO_SLIDES_COLLECTION = 'hero_slides';

/**
 * Get active hero slides for public menu display (no auth required)
 * Returns serializable data (ISO strings for dates) for Server->Client Component passing
 */
export async function getHeroSlides(orgId: string): Promise<HeroSlide[]> {
    try {
        if (!orgId) return [];

        const db = getAdminFirestore();
        const snapshot = await db.collection(HERO_SLIDES_COLLECTION)
            .where('orgId', '==', orgId)
            .where('active', '==', true)
            .orderBy('displayOrder', 'asc')
            .get();

        if (snapshot.empty) {
            return [];
        }

        // Convert Firestore Timestamps to ISO strings for serialization
        return snapshot.docs.map(doc => {
            const data = doc.data();
            const toISOString = (val: any): string | undefined => {
                if (!val) return undefined;
                if (val.toDate) return val.toDate().toISOString();
                if (val instanceof Date) return val.toISOString();
                if (typeof val === 'string') return val;
                return undefined;
            };

            return {
                ...data,
                id: doc.id,
                createdAt: toISOString(data.createdAt) || new Date().toISOString(),
                updatedAt: toISOString(data.updatedAt) || new Date().toISOString(),
            } as HeroSlide;
        });
    } catch (error: any) {
        if (error?.code === 16 || error?.message?.includes('UNAUTHENTICATED')) {
            return [];
        }
        logger.error('[HeroSlides] Error fetching active slides:', error);
        return [];
    }
}

/**
 * Get all hero slides for an org (for dashboard management)
 */
export async function getAllHeroSlides(orgId: string): Promise<{ success: boolean; data?: HeroSlide[]; error?: string }> {
    try {
        if (!orgId) throw new Error('Organization ID is required');

        const db = getAdminFirestore();
        const snapshot = await db.collection(HERO_SLIDES_COLLECTION)
            .where('orgId', '==', orgId)
            .orderBy('displayOrder', 'asc')
            .get();

        const toISOString = (val: any): string | undefined => {
            if (!val) return undefined;
            if (val.toDate) return val.toDate().toISOString();
            if (val instanceof Date) return val.toISOString();
            if (typeof val === 'string') return val;
            return undefined;
        };

        const slides = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: toISOString(data.createdAt) || new Date().toISOString(),
                updatedAt: toISOString(data.updatedAt) || new Date().toISOString(),
            } as HeroSlide;
        });

        return { success: true, data: slides };
    } catch (error: unknown) {
        logger.error('[HeroSlides] Error fetching all slides:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to fetch hero slides' };
    }
}

/**
 * Create a new hero slide
 */
export async function createHeroSlide(
    orgId: string,
    data: Omit<HeroSlideInput, 'orgId'>
): Promise<{ success: boolean; data?: HeroSlide; error?: string }> {
    try {
        if (!orgId) throw new Error('Organization ID is required');
        if (!data.title || !data.description) throw new Error('Title and description are required');

        const id = uuidv4();
        const db = getAdminFirestore();
        const now = new Date();

        const newSlide: HeroSlide = {
            ...data,
            id,
            orgId,
            createdAt: now,
            updatedAt: now,
        };

        await db.collection(HERO_SLIDES_COLLECTION).doc(id).set(newSlide);

        revalidatePath('/dashboard');
        logger.info(`[HeroSlides] Created slide ${id} for org ${orgId}`);

        return { success: true, data: newSlide };
    } catch (error: unknown) {
        logger.error('[HeroSlides] Error creating slide:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to create hero slide' };
    }
}

/**
 * Update an existing hero slide
 */
export async function updateHeroSlide(
    id: string,
    data: Partial<HeroSlideInput>
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) throw new Error('Slide ID is required');

        const db = getAdminFirestore();
        await db.collection(HERO_SLIDES_COLLECTION).doc(id).update({
            ...data,
            updatedAt: new Date(),
        });

        revalidatePath('/dashboard');
        logger.info(`[HeroSlides] Updated slide ${id}`);

        return { success: true };
    } catch (error: unknown) {
        logger.error('[HeroSlides] Error updating slide:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to update hero slide' };
    }
}

/**
 * Delete a hero slide
 */
export async function deleteHeroSlide(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) throw new Error('Slide ID is required');

        const db = getAdminFirestore();
        await db.collection(HERO_SLIDES_COLLECTION).doc(id).delete();

        revalidatePath('/dashboard');
        logger.info(`[HeroSlides] Deleted slide ${id}`);

        return { success: true };
    } catch (error: unknown) {
        logger.error('[HeroSlides] Error deleting slide:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to delete hero slide' };
    }
}

/**
 * Reorder hero slides by updating displayOrder
 */
export async function reorderHeroSlides(
    slides: { id: string; displayOrder: number }[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminFirestore();
        const batch = db.batch();

        slides.forEach(slide => {
            const docRef = db.collection(HERO_SLIDES_COLLECTION).doc(slide.id);
            batch.update(docRef, { displayOrder: slide.displayOrder, updatedAt: new Date() });
        });

        await batch.commit();

        revalidatePath('/dashboard');
        logger.info(`[HeroSlides] Reordered ${slides.length} slides`);

        return { success: true };
    } catch (error: unknown) {
        logger.error('[HeroSlides] Error reordering slides:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to reorder hero slides' };
    }
}
