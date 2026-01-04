'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Add a product to customer favorites
 */
export async function addFavorite(productId: string, retailerId: string): Promise<{ success: boolean }> {
    const { firestore } = await createServerClient();
    const user = await requireUser();

    try {
        const favoriteRef = firestore.collection('favorites').doc(`${user.uid}_${productId}`);
        
        await favoriteRef.set({
            userId: user.uid,
            productId,
            retailerId,
            createdAt: FieldValue.serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to add favorite:', error);
        return { success: false };
    }
}

/**
 * Remove a product from customer favorites
 */
export async function removeFavorite(productId: string): Promise<{ success: boolean }> {
    const { firestore } = await createServerClient();
    const user = await requireUser();

    try {
        await firestore.collection('favorites').doc(`${user.uid}_${productId}`).delete();
        return { success: true };
    } catch (error) {
        console.error('Failed to remove favorite:', error);
        return { success: false };
    }
}

/**
 * Check if a product is favorited
 */
export async function isFavorite(productId: string): Promise<boolean> {
    const { firestore } = await createServerClient();
    const user = await requireUser();

    try {
        const doc = await firestore.collection('favorites').doc(`${user.uid}_${productId}`).get();
        return doc.exists;
    } catch {
        return false;
    }
}

/**
 * Get all favorites for current user
 */
export async function getAllFavorites(): Promise<{ productId: string; retailerId: string }[]> {
    const { firestore } = await createServerClient();
    const user = await requireUser();

    try {
        const snap = await firestore.collection('favorites')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        return snap.docs.map(doc => ({
            productId: doc.data().productId,
            retailerId: doc.data().retailerId,
        }));
    } catch {
        return [];
    }
}
