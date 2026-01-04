'use server';

import { createServerClient } from '@/firebase/server-client';

export interface ScanOrderData {
    order: {
        id: string;
        status: string;
        items: { name: string; qty: number; price: number }[];
        customer: { name: string; email: string; phone: string };
        totals: { subtotal: number; tax: number; total: number };
        createdAt: any;
    } | null;
    dispensary: {
        id: string;
        name: string;
        address: string;
        city: string;
        state: string;
        zip: string;
        claimed: boolean;
        claimedBy?: string;
    } | null;
}

/**
 * Get order data for budtender scan page
 */
export async function getScanOrderData(orderId: string): Promise<ScanOrderData> {
    const { firestore } = await createServerClient();

    // Fetch order
    const orderDoc = await firestore.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
        return { order: null, dispensary: null };
    }

    const orderData = orderDoc.data()!;
    
    // Fetch dispensary
    const retailerId = orderData.retailerId;
    let dispensary = null;
    
    if (retailerId) {
        const dispDoc = await firestore.collection('dispensaries').doc(retailerId).get();
        if (dispDoc.exists) {
            const dispData = dispDoc.data()!;
            dispensary = {
                id: retailerId,
                name: dispData.name || 'Dispensary',
                address: dispData.address || '',
                city: dispData.city || '',
                state: dispData.state || '',
                zip: dispData.zip || '',
                claimed: !!dispData.claimedBy,
                claimedBy: dispData.claimedBy,
            };
        }
    }

    return {
        order: {
            id: orderId,
            status: orderData.status,
            items: orderData.items || [],
            customer: orderData.customer || { name: '', email: '', phone: '' },
            totals: orderData.totals || { subtotal: 0, tax: 0, total: 0 },
            createdAt: orderData.createdAt,
        },
        dispensary,
    };
}

/**
 * Update order status (for budtender actions)
 */
export async function updateScanOrderStatus(
    orderId: string, 
    newStatus: 'confirmed' | 'ready' | 'completed'
): Promise<{ success: boolean; error?: string }> {
    const { firestore } = await createServerClient();

    try {
        await firestore.collection('orders').doc(orderId).update({
            status: newStatus,
            updatedAt: new Date(),
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to update order status:', error);
        return { success: false, error: 'Failed to update order' };
    }
}
