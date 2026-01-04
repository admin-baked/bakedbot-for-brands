'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

export interface CustomerOrderHistoryData {
    orders: {
        id: string;
        status: string;
        retailerName: string;
        retailerId: string;
        items: { name: string; qty: number; price: number }[];
        total: number;
        createdAt: any;
    }[];
}

/**
 * Get customer order history
 */
export async function getCustomerOrderHistory(): Promise<CustomerOrderHistoryData> {
    const { firestore } = await createServerClient();
    const user = await requireUser();

    // Fetch orders for this customer
    const ordersSnap = await firestore.collection('orders')
        .where('customer.email', '==', user.email)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

    // Fetch retailer names
    const retailerIds = Array.from(new Set(ordersSnap.docs.map(doc => doc.data().retailerId).filter(Boolean)));
    const retailerMap: Record<string, string> = {};
    
    for (const id of retailerIds) {
        try {
            const dispDoc = await firestore.collection('dispensaries').doc(id).get();
            if (dispDoc.exists) {
                retailerMap[id] = dispDoc.data()?.name || 'Dispensary';
            }
        } catch {
            // Skip
        }
    }

    const orders = ordersSnap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            status: data.status || 'submitted',
            retailerName: retailerMap[data.retailerId] || 'Dispensary',
            retailerId: data.retailerId,
            items: data.items || [],
            total: data.totals?.total || data.total || 0,
            createdAt: data.createdAt,
        };
    });

    return { orders };
}
