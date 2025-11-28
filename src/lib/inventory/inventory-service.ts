/**
 * Inventory Service
 * Handles stock validation and updates
 */

import { createServerClient } from '@/firebase/server-client';

export class InventoryService {
    async validateStock(items: { productId: string; quantity: number }[]): Promise<{ valid: boolean; errors: string[] }> {
        const { firestore } = await createServerClient();
        const errors: string[] = [];

        for (const item of items) {
            const productDoc = await firestore.collection('products').doc(item.productId).get();
            if (!productDoc.exists) {
                errors.push(`Product ${item.productId} not found`);
                continue;
            }

            const product = productDoc.data();
            if ((product?.stock || 0) < item.quantity) {
                errors.push(`Insufficient stock for ${product?.name || item.productId}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    async deductStock(items: { productId: string; quantity: number }[]) {
        const { firestore } = await createServerClient();
        const batch = firestore.batch();

        for (const item of items) {
            const productRef = firestore.collection('products').doc(item.productId);
            // Use Firestore increment for atomic updates
            batch.update(productRef, {
                stock: require('firebase-admin').firestore.FieldValue.increment(-item.quantity)
            });
        }

        await batch.commit();
    }
}

export const inventoryService = new InventoryService();
