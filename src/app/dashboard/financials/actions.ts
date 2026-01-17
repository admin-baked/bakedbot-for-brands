'use server';

import { createServerClient } from '@/firebase/server-client';
import { orderConverter, type OrderDoc } from '@/firebase/converters';
import { requireUser } from '@/server/auth/auth';
import type { Product } from '@/types/products';

export interface ProductFinancials {
    productId: string;
    productName: string;
    unitsSold: number;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    grossMargin: number; // Percentage 0-1
}

export interface FinancialData {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    grossMargin: number;
    products: ProductFinancials[];
}

export async function getFinancialData(brandId: string): Promise<FinancialData> {
    const user = await requireUser(['brand', 'super_user']);
    if (user.brandId !== brandId && user.role !== 'super_user') {
        throw new Error('Forbidden');
    }

    const { firestore } = await createServerClient();

    // 1. Fetch Products to get Cost Data
    const productsQuery = firestore.collection('products').where('brandId', '==', brandId);
    const productsSnap = await productsQuery.get();

    const costMap = new Map<string, number>();
    productsSnap.forEach(doc => {
        const p = doc.data() as Product;
        // Default to 0 cost if not set, or estimate cost as 50% of price if absolutely needed?
        // For Money Mike, we'll be strict: if no cost, COGS is 0 (100% margin).
        // Or we can assume 50% for demo purposes? Let's stick to real data (0).
        costMap.set(p.id, p.cost || 0);
    });

    // 2. Fetch Orders for Revenue and Volume
    const ordersQuery = firestore.collection('orders')
        .where('brandId', '==', brandId)
        .where('status', 'in', ['submitted', 'confirmed', 'ready', 'completed'])
        .withConverter(orderConverter as any);

    const ordersSnap = await ordersQuery.get();
    const orders = ordersSnap.docs.map((doc: any) => doc.data()) as OrderDoc[];

    const productStats = new Map<string, {
        name: string;
        units: number;
        revenue: number;
        cost: number;
    }>();

    let totalRevenue = 0;
    let totalCost = 0;

    orders.forEach(order => {
        // We rely on order totals for aggregate revenue to account for taxes/fees if we wanted Net Revenue
        // But for Gross Profit from Products, we should sum item revenues.
        // Let's stick to Item Level for granular accuracy.

        order.items.forEach(item => {
            const itemRevenue = item.price * item.qty;
            const unitCost = costMap.get(item.productId) || 0;
            const itemCost = unitCost * item.qty;

            totalRevenue += itemRevenue;
            totalCost += itemCost;

            const existing = productStats.get(item.productId);
            if (existing) {
                existing.units += item.qty;
                existing.revenue += itemRevenue;
                existing.cost += itemCost;
            } else {
                productStats.set(item.productId, {
                    name: item.name,
                    units: item.qty,
                    revenue: itemRevenue,
                    cost: itemCost
                });
            }
        });
    });

    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? grossProfit / totalRevenue : 0;

    const products = Array.from(productStats.entries()).map(([id, stats]) => {
        const profit = stats.revenue - stats.cost;
        const margin = stats.revenue > 0 ? profit / stats.revenue : 0;
        return {
            productId: id,
            productName: stats.name,
            unitsSold: stats.units,
            totalRevenue: stats.revenue,
            totalCost: stats.cost,
            grossProfit: profit,
            grossMargin: margin
        };
    }).sort((a, b) => b.grossProfit - a.grossProfit); // Sort by Profit contribution

    return {
        totalRevenue,
        totalCost,
        grossProfit,
        grossMargin,
        products
    };
}
