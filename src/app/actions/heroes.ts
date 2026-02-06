'use server';

/**
 * Hero Banner Server Actions
 *
 * CRUD operations for hero banners on brand and dispensary menu pages.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Hero } from '@/types/heroes';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

const HEROES_COLLECTION = 'heroes';

export async function getHeroes(orgId: string): Promise<{ success: boolean; data?: Hero[]; error?: string }> {
    try {
        if (!orgId) throw new Error('Organization ID is required');

        const db = getAdminFirestore();
        const snapshot = await db.collection(HEROES_COLLECTION)
            .where('orgId', '==', orgId)
            .orderBy('displayOrder', 'asc')
            .get();

        const heroes = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            createdAt: (doc.data().createdAt as any).toDate ? (doc.data().createdAt as any).toDate() : new Date(doc.data().createdAt),
            updatedAt: (doc.data().updatedAt as any).toDate ? (doc.data().updatedAt as any).toDate() : new Date(doc.data().updatedAt),
        })) as Hero[];

        return { success: true, data: heroes };
    } catch (error) {
        console.error('Error fetching heroes:', error);
        return { success: false, error: 'Failed to fetch heroes' };
    }
}

export async function getHeroById(id: string): Promise<{ success: boolean; data?: Hero; error?: string }> {
    try {
        if (!id) throw new Error('Hero ID is required');

        const db = getAdminFirestore();
        const doc = await db.collection(HEROES_COLLECTION).doc(id).get();

        if (!doc.exists) {
            return { success: false, error: 'Hero not found' };
        }

        const hero = {
            ...doc.data(),
            id: doc.id,
            createdAt: (doc.data()!.createdAt as any).toDate ? (doc.data()!.createdAt as any).toDate() : new Date(doc.data()!.createdAt),
            updatedAt: (doc.data()!.updatedAt as any).toDate ? (doc.data()!.updatedAt as any).toDate() : new Date(doc.data()!.updatedAt),
        } as Hero;

        return { success: true, data: hero };
    } catch (error) {
        console.error('Error fetching hero:', error);
        return { success: false, error: 'Failed to fetch hero' };
    }
}

export async function getActiveHero(orgId: string): Promise<{ success: boolean; data?: Hero; error?: string }> {
    try {
        if (!orgId) throw new Error('Organization ID is required');

        const db = getAdminFirestore();
        const snapshot = await db.collection(HEROES_COLLECTION)
            .where('orgId', '==', orgId)
            .where('active', '==', true)
            .orderBy('displayOrder', 'asc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { success: false, error: 'No active hero found' };
        }

        const doc = snapshot.docs[0];
        const hero = {
            ...doc.data(),
            id: doc.id,
            createdAt: (doc.data().createdAt as any).toDate ? (doc.data().createdAt as any).toDate() : new Date(doc.data().createdAt),
            updatedAt: (doc.data().updatedAt as any).toDate ? (doc.data().updatedAt as any).toDate() : new Date(doc.data().updatedAt),
        } as Hero;

        return { success: true, data: hero };
    } catch (error) {
        console.error('Error fetching active hero:', error);
        return { success: false, error: 'Failed to fetch active hero' };
    }
}

export async function createHero(data: Partial<Hero>): Promise<{ success: boolean; data?: Hero; error?: string }> {
    try {
        if (!data.brandName || !data.orgId) {
            throw new Error('Brand name and Organization ID are required');
        }

        const id = uuidv4();
        const db = getAdminFirestore();
        const now = new Date();

        const newHero: Hero = {
            // Defaults
            active: false,
            displayOrder: 0,
            tagline: 'Premium Cannabis Products',
            primaryColor: '#16a34a',
            style: 'default',
            purchaseModel: 'local_pickup',
            primaryCta: {
                label: 'Find Near Me',
                action: 'find_near_me',
            },
            verified: true,

            // Override with provided data
            ...data,

            id,
            createdAt: now,
            updatedAt: now,
        } as Hero;

        await db.collection(HEROES_COLLECTION).doc(id).set(newHero);

        revalidatePath('/dashboard/heroes');
        return { success: true, data: newHero };
    } catch (error) {
        console.error('Error creating hero:', error);
        return { success: false, error: 'Failed to create hero' };
    }
}

export async function updateHero(id: string, data: Partial<Hero>): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) throw new Error('Hero ID is required');

        const db = getAdminFirestore();
        await db.collection(HEROES_COLLECTION).doc(id).update({
            ...data,
            updatedAt: new Date(),
        });

        revalidatePath('/dashboard/heroes');
        return { success: true };
    } catch (error) {
        console.error('Error updating hero:', error);
        return { success: false, error: 'Failed to update hero' };
    }
}

export async function deleteHero(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) throw new Error('Hero ID is required');

        const db = getAdminFirestore();
        await db.collection(HEROES_COLLECTION).doc(id).delete();

        revalidatePath('/dashboard/heroes');
        return { success: true };
    } catch (error) {
        console.error('Error deleting hero:', error);
        return { success: false, error: 'Failed to delete hero' };
    }
}

export async function toggleHeroActive(id: string, active: boolean): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) throw new Error('Hero ID is required');

        const db = getAdminFirestore();

        // If activating, deactivate all others for this org first
        if (active) {
            const heroDoc = await db.collection(HEROES_COLLECTION).doc(id).get();
            if (!heroDoc.exists) {
                return { success: false, error: 'Hero not found' };
            }

            const orgId = heroDoc.data()!.orgId;
            const activeHeroes = await db.collection(HEROES_COLLECTION)
                .where('orgId', '==', orgId)
                .where('active', '==', true)
                .get();

            const batch = db.batch();
            activeHeroes.docs.forEach(doc => {
                batch.update(doc.ref, { active: false, updatedAt: new Date() });
            });
            await batch.commit();
        }

        await db.collection(HEROES_COLLECTION).doc(id).update({
            active,
            updatedAt: new Date(),
        });

        revalidatePath('/dashboard/heroes');
        return { success: true };
    } catch (error) {
        console.error('Error toggling hero active status:', error);
        return { success: false, error: 'Failed to toggle hero active status' };
    }
}

export async function duplicateHero(id: string): Promise<{ success: boolean; data?: Hero; error?: string }> {
    try {
        if (!id) throw new Error('Hero ID is required');

        const result = await getHeroById(id);
        if (!result.success || !result.data) {
            return { success: false, error: 'Hero not found' };
        }

        const original = result.data;
        const newHero = {
            ...original,
            brandName: `${original.brandName} (Copy)`,
            active: false,
        };

        delete (newHero as any).id;
        delete (newHero as any).createdAt;
        delete (newHero as any).updatedAt;

        return await createHero(newHero);
    } catch (error) {
        console.error('Error duplicating hero:', error);
        return { success: false, error: 'Failed to duplicate hero' };
    }
}
