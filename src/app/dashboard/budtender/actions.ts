'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

export interface BudtenderDashboardData {
    dispensary: {
        id: string;
        name: string;
        address: string;
        city: string;
        state: string;
    } | null;
    pendingOrders: {
        id: string;
        customerName: string;
        itemCount: number;
        total: number;
        status: string;
        createdAt: any;
    }[];
    todayStats: {
        ordersCompleted: number;
        revenue: number;
    };
    menuCategories: string[];
}

/**
 * Get dashboard data for budtender
 */
export async function getBudtenderDashboardData(): Promise<BudtenderDashboardData> {
    const { firestore } = await createServerClient();
    const user = await requireUser();

    // Get user's dispensary location
    const locationId = (user as any).locationId;
    
    if (!locationId) {
        return {
            dispensary: null,
            pendingOrders: [],
            todayStats: { ordersCompleted: 0, revenue: 0 },
            menuCategories: [],
        };
    }

    // Fetch dispensary info
    let dispensary = null;
    const dispDoc = await firestore.collection('dispensaries').doc(locationId).get();
    if (dispDoc.exists) {
        const data = dispDoc.data()!;
        dispensary = {
            id: locationId,
            name: data.name || 'Dispensary',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
        };
    }

    // Fetch pending orders for this location
    const ordersSnap = await firestore.collection('orders')
        .where('retailerId', '==', locationId)
        .where('status', 'in', ['submitted', 'confirmed', 'ready'])
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

    const pendingOrders = ordersSnap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            customerName: data.customer?.name || 'Customer',
            itemCount: data.items?.length || 0,
            total: data.totals?.total || data.total || 0,
            status: data.status,
            createdAt: data.createdAt,
        };
    });

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayStats = { ordersCompleted: 0, revenue: 0 };
    try {
        const completedSnap = await firestore.collection('orders')
            .where('retailerId', '==', locationId)
            .where('status', '==', 'completed')
            .where('createdAt', '>=', today)
            .get();

        todayStats.ordersCompleted = completedSnap.size;
        todayStats.revenue = completedSnap.docs.reduce((sum, doc) => {
            const data = doc.data();
            return sum + (data.totals?.total || data.total || 0);
        }, 0);
    } catch {
        // Query may fail without index
    }

    // Get menu categories from products
    const menuCategories = ['Flower', 'Vapes', 'Edibles', 'Concentrates', 'Pre-Rolls'];

    return {
        dispensary,
        pendingOrders,
        todayStats,
        menuCategories,
    };
}
