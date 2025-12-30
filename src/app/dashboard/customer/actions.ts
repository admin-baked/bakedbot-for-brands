'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

export interface CustomerDashboardData {
    profile: {
        preferredDispensary: string | null;
        preferredDispensaryId: string | null;
        fulfillmentType: 'pickup' | 'delivery' | null;
        zipCode: string | null;
    };
    rewards: {
        points: number;
        discount: string;
        label: string;
    };
    deals: {
        count: number;
        label: string;
    };
    favorites: {
        inStock: number;
        total: number;
        label: string;
    };
    activeOrder: {
        status: string | null;
        eta: string | null;
        active: boolean;
    } | null;
    cart: {
        itemCount: number;
        total: number;
        hasDealApplied: boolean;
    };
}

export async function getCustomerDashboardData(): Promise<CustomerDashboardData | null> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser();

        // Fetch user profile
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        
        // Fetch user's preferred dispensary
        const preferredDispensaryId = userData.preferredDispensaryId;
        let preferredDispensary = null;
        if (preferredDispensaryId) {
            const dispDoc = await firestore.collection('dispensaries').doc(preferredDispensaryId).get();
            preferredDispensary = dispDoc.data()?.name || null;
        }

        // Fetch loyalty points
        let loyaltyPoints = 0;
        try {
            const loyaltyDoc = await firestore.collection('loyalty_accounts')
                .where('userId', '==', user.uid)
                .limit(1)
                .get();
            if (!loyaltyDoc.empty) {
                loyaltyPoints = loyaltyDoc.docs[0].data().points || 0;
            }
        } catch {
            // Collection may not exist
        }

        // Calculate available discount (simple: 100 points = $1)
        const availableDiscount = Math.floor(loyaltyPoints / 100);

        // Fetch deals matched to user (would need recommendations service)
        let matchedDealsCount = 0;
        try {
            const dealsSnap = await firestore.collection('deals')
                .where('active', '==', true)
                .limit(20)
                .get();
            matchedDealsCount = dealsSnap.size;
        } catch {
            // Fallback
        }

        // Fetch user favorites
        let favorites = { inStock: 0, total: 0 };
        try {
            const favsSnap = await firestore.collection('favorites')
                .where('userId', '==', user.uid)
                .get();
            favorites.total = favsSnap.size;
            // Would need to cross-reference with product inventory for inStock count
            favorites.inStock = favorites.total; // Assume all in stock for now
        } catch {
            // Collection may not exist
        }

        // Fetch active order
        let activeOrder = null;
        try {
            const ordersSnap = await firestore.collection('orders')
                .where('userId', '==', user.uid)
                .where('status', 'in', ['pending', 'processing', 'ready'])
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
            if (!ordersSnap.empty) {
                const orderData = ordersSnap.docs[0].data();
                const statusMap: Record<string, string> = {
                    'pending': 'Order Received',
                    'processing': 'Being Prepared',
                    'ready': 'Ready for Pickup'
                };
                activeOrder = {
                    status: statusMap[orderData.status] || orderData.status,
                    eta: orderData.estimatedReadyAt ? 'ETA available' : 'Review details',
                    active: true
                };
            }
        } catch {
            // Query may fail without index
        }

        // Fetch cart
        let cart = { itemCount: 0, total: 0, hasDealApplied: false };
        try {
            const cartDoc = await firestore.collection('carts').doc(user.uid).get();
            if (cartDoc.exists) {
                const cartData = cartDoc.data() || {};
                const items = cartData.items || [];
                cart.itemCount = items.length;
                cart.total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity || 0), 0);
                cart.hasDealApplied = !!cartData.appliedDeal;
            }
        } catch {
            // Cart may not exist
        }

        return {
            profile: {
                preferredDispensary,
                preferredDispensaryId,
                fulfillmentType: userData.fulfillmentType || null,
                zipCode: userData.zipCode || null
            },
            rewards: {
                points: loyaltyPoints,
                discount: availableDiscount > 0 ? `$${availableDiscount} off` : 'Earn more!',
                label: availableDiscount > 0 ? 'Available now' : 'Keep earning'
            },
            deals: {
                count: matchedDealsCount,
                label: matchedDealsCount > 0 ? 'New matches for you' : 'Check back soon'
            },
            favorites: {
                inStock: favorites.inStock,
                total: favorites.total,
                label: 'Items available'
            },
            activeOrder,
            cart
        };
    } catch (error) {
        console.error('Failed to fetch customer dashboard data:', error);
        return null;
    }
}
