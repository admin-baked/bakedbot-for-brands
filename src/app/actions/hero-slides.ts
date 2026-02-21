'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { HeroSlide, HeroSlideInput } from '@/types/hero-slides';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/auth/auth';

const HERO_SLIDES_COLLECTION = 'hero_slides';

/**
 * Verify user has access to the specified org
 */
async function verifyOrgAccess(userId: string, targetOrgId: string): Promise<boolean> {
    try {
        const db = getAdminFirestore();
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            logger.warn(`[HeroSlides] User ${userId} not found`);
            return false;
        }

        const userData = userDoc.data();
        const userOrgId = userData?.currentOrgId || userData?.orgId;

        if (userOrgId !== targetOrgId) {
            logger.warn(`[HeroSlides] Org mismatch: user ${userId} (${userOrgId}) vs target (${targetOrgId})`);
            return false;
        }

        return true;
    } catch (error) {
        logger.error('[HeroSlides] Error verifying org access:', {
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}

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
 * Create a new hero slide (requires authentication and org access)
 */
export async function createHeroSlide(
    orgId: string,
    data: Omit<HeroSlideInput, 'orgId'>
): Promise<{ success: boolean; data?: HeroSlide; error?: string }> {
    try {
        if (!orgId) throw new Error('Organization ID is required');
        if (!data.title || !data.description) throw new Error('Title and description are required');

        const user = await requireUser();
        const hasAccess = await verifyOrgAccess(user.uid, orgId);
        if (!hasAccess) {
            logger.warn(`[HeroSlides] User ${user.uid} denied create access to org ${orgId}`);
            return { success: false, error: 'Unauthorized' };
        }

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
        logger.info(`[HeroSlides] Created slide ${id} for org ${orgId} by user ${user.uid}`);

        return { success: true, data: newSlide };
    } catch (error: unknown) {
        logger.error('[HeroSlides] Error creating slide:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to create hero slide' };
    }
}

/**
 * Update an existing hero slide (requires authentication and org access)
 */
export async function updateHeroSlide(
    id: string,
    data: Partial<HeroSlideInput>
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) throw new Error('Slide ID is required');

        const user = await requireUser();
        const db = getAdminFirestore();

        const slideDoc = await db.collection(HERO_SLIDES_COLLECTION).doc(id).get();
        if (!slideDoc.exists) {
            return { success: false, error: 'Slide not found' };
        }

        const slideData = slideDoc.data()!;
        const hasAccess = await verifyOrgAccess(user.uid, slideData.orgId);
        if (!hasAccess) {
            logger.warn(`[HeroSlides] User ${user.uid} denied update access to slide ${id}`);
            return { success: false, error: 'Unauthorized' };
        }

        await db.collection(HERO_SLIDES_COLLECTION).doc(id).update({
            ...data,
            updatedAt: new Date(),
        });

        revalidatePath('/dashboard');
        logger.info(`[HeroSlides] Updated slide ${id} by user ${user.uid}`);

        return { success: true };
    } catch (error: unknown) {
        logger.error('[HeroSlides] Error updating slide:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to update hero slide' };
    }
}

/**
 * Delete a hero slide (requires authentication and org access)
 */
export async function deleteHeroSlide(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) throw new Error('Slide ID is required');

        const user = await requireUser();
        const db = getAdminFirestore();

        const slideDoc = await db.collection(HERO_SLIDES_COLLECTION).doc(id).get();
        if (!slideDoc.exists) {
            return { success: false, error: 'Slide not found' };
        }

        const slideData = slideDoc.data()!;
        const hasAccess = await verifyOrgAccess(user.uid, slideData.orgId);
        if (!hasAccess) {
            logger.warn(`[HeroSlides] User ${user.uid} denied delete access to slide ${id}`);
            return { success: false, error: 'Unauthorized' };
        }

        await db.collection(HERO_SLIDES_COLLECTION).doc(id).delete();

        revalidatePath('/dashboard');
        logger.info(`[HeroSlides] Deleted slide ${id} by user ${user.uid}`);

        return { success: true };
    } catch (error: unknown) {
        logger.error('[HeroSlides] Error deleting slide:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to delete hero slide' };
    }
}

/**
 * Reorder hero slides by updating displayOrder (requires authentication and org access)
 */
export async function reorderHeroSlides(
    slides: { id: string; displayOrder: number }[]
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!slides || slides.length === 0) {
            return { success: false, error: 'No slides to reorder' };
        }

        const user = await requireUser();
        const db = getAdminFirestore();

        // Verify user has access to all slides in the batch
        for (const slide of slides) {
            const slideDoc = await db.collection(HERO_SLIDES_COLLECTION).doc(slide.id).get();
            if (!slideDoc.exists) {
                return { success: false, error: `Slide ${slide.id} not found` };
            }

            const slideData = slideDoc.data()!;
            const hasAccess = await verifyOrgAccess(user.uid, slideData.orgId);
            if (!hasAccess) {
                logger.warn(`[HeroSlides] User ${user.uid} denied reorder access to slide ${slide.id}`);
                return { success: false, error: 'Unauthorized' };
            }
        }

        const batch = db.batch();
        slides.forEach(slide => {
            const docRef = db.collection(HERO_SLIDES_COLLECTION).doc(slide.id);
            batch.update(docRef, { displayOrder: slide.displayOrder, updatedAt: new Date() });
        });

        await batch.commit();

        revalidatePath('/dashboard');
        logger.info(`[HeroSlides] Reordered ${slides.length} slides by user ${user.uid}`);

        return { success: true };
    } catch (error: unknown) {
        logger.error('[HeroSlides] Error reordering slides:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to reorder hero slides' };
    }
}
