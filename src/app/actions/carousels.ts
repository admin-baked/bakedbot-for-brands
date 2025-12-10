'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { Carousel } from '@/types/carousels';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

const db = getAdminFirestore();
const CAROUSELS_COLLECTION = 'carousels';

export async function getCarousels(orgId: string): Promise<{ success: boolean; data?: Carousel[]; error?: string }> {
    try {
        if (!orgId) throw new Error('Organization ID is required');

        const snapshot = await db.collection(CAROUSELS_COLLECTION)
            .where('orgId', '==', orgId)
            .orderBy('displayOrder', 'asc')
            .get();

        const carousels = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            createdAt: (doc.data().createdAt as any).toDate ? (doc.data().createdAt as any).toDate() : new Date(doc.data().createdAt),
            updatedAt: (doc.data().updatedAt as any).toDate ? (doc.data().updatedAt as any).toDate() : new Date(doc.data().updatedAt),
        })) as Carousel[];

        return { success: true, data: carousels };
    } catch (error) {
        console.error('Error fetching carousels:', error);
        return { success: false, error: 'Failed to fetch carousels' };
    }
}

export async function createCarousel(data: Partial<Carousel>): Promise<{ success: boolean; data?: Carousel; error?: string }> {
    try {
        if (!data.title || !data.orgId) {
            throw new Error('Title and Organization ID are required');
        }

        const id = uuidv4();
        const now = new Date();

        const newCarousel: Carousel = {
            // Defaults
            active: true,
            productIds: [],
            displayOrder: 0,

            // Override
            ...data,

            id,
            createdAt: now,
            updatedAt: now,
        } as Carousel;

        await db.collection(CAROUSELS_COLLECTION).doc(id).set(newCarousel);

        revalidatePath('/dashboard/carousels');
        return { success: true, data: newCarousel };
    } catch (error) {
        console.error('Error creating carousel:', error);
        return { success: false, error: 'Failed to create carousel' };
    }
}

export async function updateCarousel(id: string, data: Partial<Carousel>): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) throw new Error('ID is required');

        await db.collection(CAROUSELS_COLLECTION).doc(id).update({
            ...data,
            updatedAt: new Date(),
        });

        revalidatePath('/dashboard/carousels');
        return { success: true };
    } catch (error) {
        console.error('Error updating carousel:', error);
        return { success: false, error: 'Failed to update carousel' };
    }
}

export async function deleteCarousel(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) throw new Error('ID is required');

        await db.collection(CAROUSELS_COLLECTION).doc(id).delete();

        revalidatePath('/dashboard/carousels');
        return { success: true };
    } catch (error) {
        console.error('Error deleting carousel:', error);
        return { success: false, error: 'Failed to delete carousel' };
    }
}
