'use server';

import { createServerClient } from '@/firebase/server-client';
import { orderConverter, type OrderDoc } from '@/firebase/converters';
import { requireUser } from '@/server/auth/auth';
import { CustomerProfile, CustomerSegment } from '@/types/customers';

export interface CustomersData {
    customers: CustomerProfile[];
    stats: {
        totalCustomers: number;
        vipCount: number;
        newCount: number;
        churnRiskCount: number;
    };
}

export async function getCustomers(brandId: string): Promise<CustomersData> {
    const user = await requireUser(['brand', 'owner']);
    if (user.brandId !== brandId && user.role !== 'owner') {
        throw new Error('Forbidden');
    }

    const { firestore } = await createServerClient();

    const ordersQuery = firestore.collection('orders')
        .where('brandId', '==', brandId)
        .orderBy('createdAt', 'desc')
        .withConverter(orderConverter as any);

    // Note: orderBy might require index with brandId. 
    // If index missing, we can fetch all by brandId and sort in memory.
    // For safety against missing index errors in this MVP:
    const safeOrdersQuery = firestore.collection('orders')
        .where('brandId', '==', brandId)
        .withConverter(orderConverter as any);

    const ordersSnap = await safeOrdersQuery.get();
    const orders = ordersSnap.docs.map((doc: any) => doc.data()) as OrderDoc[];

    const customerMap = new Map<string, CustomerProfile>();

    orders.forEach(order => {
        const email = order.customer.email.toLowerCase();
        if (!email) return;

        const existing = customerMap.get(email);
        const orderDate = order.createdAt.toDate();
        const orderTotal = order.totals.total;

        if (existing) {
            existing.visits++;
            existing.totalSpent += orderTotal;
            // Since we iterate randomly (if not sorted), ensure we capture the latest date
            const currentLast = new Date(existing.lastVisit);
            if (orderDate > currentLast) {
                existing.lastVisit = orderDate.toISOString();
            }
        } else {
            customerMap.set(email, {
                id: email,
                name: order.customer.name,
                email: email,
                phone: '', // Phone not clearly in OrderDoc top level, but maybe in customer object if we update OrderDoc
                visits: 1,
                lastVisit: orderDate.toISOString(),
                totalSpent: orderTotal,
                segment: 'New', // Default, will recalculate
                tier: 'Bronze', // Default
                points: 0,
                lifetimeValue: 0
            });
        }
    });

    const now = new Date();
    let vipCount = 0;
    let newCount = 0;
    let churnRiskCount = 0;

    const customers = Array.from(customerMap.values()).map(c => {
        const lastVisitDate = new Date(c.lastVisit);
        const daysSinceVisit = Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 3600 * 24));

        // Segment Logic
        let segment: CustomerSegment = 'Loyal';
        if (c.totalSpent > 500 || c.visits >= 5) {
            segment = 'VIP';
        } else if (c.visits === 1 && daysSinceVisit < 30) {
            segment = 'New';
        } else if (daysSinceVisit > 180) {
            segment = 'Churned';
        } else if (daysSinceVisit > 90) {
            segment = 'Risk';
        } else if (daysSinceVisit > 60) {
            segment = 'Slipping';
        }

        // Tier Logic
        let tier = 'Bronze';
        if (c.totalSpent > 2000) tier = 'Gold';
        else if (c.totalSpent > 500) tier = 'Silver';

        // Points (Simple 1x calculation for now, in real app fetch settings)
        const points = Math.floor(c.totalSpent);

        // Update object
        c.segment = segment;
        c.tier = tier;
        c.points = points;
        c.lifetimeValue = c.totalSpent; // CLTV simplified for now

        // Update Stats
        if (segment === 'VIP') vipCount++;
        if (segment === 'New') newCount++;
        if (['Risk', 'Churned', 'Slipping'].includes(segment)) churnRiskCount++;

        return c;
    }).sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());

    return {
        customers,
        stats: {
            totalCustomers: customers.length,
            vipCount,
            newCount,
            churnRiskCount
        }
    };
}
