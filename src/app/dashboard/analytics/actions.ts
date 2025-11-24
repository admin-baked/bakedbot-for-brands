
// src/app/dashboard/analytics/actions.ts
'use server';

import { createServerClient } from '@/firebase/server-client';
import { orderConverter, type OrderDoc } from '@/firebase/converters';
import { requireUser } from '@/server/auth/auth';

export interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  salesByProduct: {
    productName: string;
    revenue: number;
  }[];
}

export async function getAnalyticsData(brandId: string): Promise<AnalyticsData> {
  // Ensure the user has the right to access this brand's data.
  // Although the page is protected, it's good practice to secure the action too.
  const user = await requireUser(['brand', 'owner']);
  if (user.brandId !== brandId && user.role !== 'owner') {
    throw new Error('Forbidden: You do not have permission to access this data.');
  }

  const { firestore } = await createServerClient();

  const ordersQuery = firestore.collection('orders')
    .where('brandId', '==', brandId)
    // In a real scenario, you'd likely filter for completed orders.
    // For this demo, we'll include all non-cancelled to show more data.
    .where('status', 'in', ['submitted', 'confirmed', 'ready', 'completed'])
    .withConverter(orderConverter as any);
  
  const ordersSnap = await ordersQuery.get();
  
  const orders = ordersSnap.docs.map((doc: any) => doc.data()) as OrderDoc[];

  if (orders.length === 0) {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      salesByProduct: [],
    };
  }

  let totalRevenue = 0;
  const totalOrders = orders.length;
  const salesByProductMap = new Map<string, { productName: string; revenue: number }>();

  orders.forEach(order => {
    totalRevenue += order.totals.total;
    order.items.forEach(item => {
      const existing = salesByProductMap.get(item.productId);
      const itemRevenue = item.price * item.qty;
      if (existing) {
        existing.revenue += itemRevenue;
      } else {
        salesByProductMap.set(item.productId, {
          productName: item.name,
          revenue: itemRevenue,
        });
      }
    });
  });

  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  const salesByProduct = Array.from(salesByProductMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10); // Get top 10 products

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    salesByProduct,
  };
}
