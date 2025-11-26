'use server';

// src/app/checkout/actions/createOrder.ts
/**
 * Server action to create an order in Firestore
 */

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';

type CreateOrderInput = {
    items: any[];
    customer: {
        name: string;
        email: string;
        phone: string;
    };
    retailerId: string;
    paymentMethod: 'smokey_pay' | 'cash';
    paymentData?: any;
    total: number;
};

export async function createOrder(input: CreateOrderInput) {
    try {
        const { firestore } = await createServerClient();

        // Create the order object
        const order = {
            ...input,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const docRef = await firestore.collection('orders').add(order);

        return { success: true, orderId: docRef.id };
    } catch (error) {
        console.error('Failed to create order:', error);
        return { success: false, error: 'Failed to create order' };
    }
}
