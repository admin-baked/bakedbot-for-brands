// src/app/dashboard/analytics/actions.ts
'use server';

import { createServerClient } from '@/firebase/server-client';
import { orderConverter, type OrderDoc } from '@/firebase/converters';
import { requireUser } from '@/server/auth/auth';

export interface DailyAnalytics {
  date: string;
  gmv: number;
  sessions: number;
  checkoutsStarted: number;
  paidCheckouts: number;
}

export interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  salesByProduct: {
    productName: string;
    revenue: number;
  }[];
  dailyStats: DailyAnalytics[];
  conversionFunnel: {
    stage: string;
    count: number;
  }[];
  channelPerformance: {
    channel: string;
    sessions: number;
    revenue: number; // Estimated based on attribution
    conversionRate: number;
  }[];
}

export async function getAnalyticsData(brandId: string): Promise<AnalyticsData> {
  const user = await requireUser(['brand', 'owner']);
  if (user.brandId !== brandId && user.role !== 'owner') {
    throw new Error('Forbidden: You do not have permission to access this data.');
  }

  const { firestore } = await createServerClient();

  // 1. Fetch Orders for Product Breakdown & Total Revenue (Source of Truth for Money)
  const ordersQuery = firestore.collection('orders')
    .where('brandId', '==', brandId)
    .where('status', 'in', ['submitted', 'confirmed', 'ready', 'completed'])
    .withConverter(orderConverter as any);

  const ordersSnap = await ordersQuery.get();
  const orders = ordersSnap.docs.map((doc: any) => doc.data()) as OrderDoc[];

  let totalRevenue = 0;
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

  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const salesByProduct = Array.from(salesByProductMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // 2. Fetch Daily Analytics from Pops (for Trends & Funnel)
  // We'll fetch the last 30 days.
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // Construct doc IDs for range query or just fetch all and filter in memory if volume is low.
  // Since it's one doc per day, 30 docs is tiny. We can fetch the collection.
  // Ideally we'd query by date field if indexed, or ID.
  // Let's just fetch the last 30 docs by ID pattern if possible, or just all for now (assuming < 365 docs).
  // Better: Query by 'date' field if we stored it as string YYYY-MM-DD.
  // The pops.ts stores 'date' field.

  const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];

  const analyticsQuery = firestore.collection('organizations')
    .doc(brandId)
    .collection('analytics')
    .where('date', '>=', startDateStr)
    .orderBy('date', 'asc');

  const analyticsSnap = await analyticsQuery.get();

  const dailyStats: DailyAnalytics[] = [];
  let totalSessions = 0;
  let totalCheckoutsStarted = 0;
  let totalPaidCheckouts = 0;
  const channelMap = new Map<string, { sessions: number; paidCheckouts: number }>();

  analyticsSnap.forEach(doc => {
    const data = doc.data();
    const totals = data.totals || {};
    const channels = data.channels || {};

    dailyStats.push({
      date: data.date,
      gmv: totals.gmv || 0,
      sessions: Object.values(channels).reduce((acc: number, ch: any) => acc + (ch.sessions || 0), 0), // Sum sessions from channels
      checkoutsStarted: totals.checkoutsStarted || 0,
      paidCheckouts: totals.paidCheckouts || 0,
    });

    totalSessions += Object.values(channels).reduce((acc: number, ch: any) => acc + (ch.sessions || 0), 0);
    totalCheckoutsStarted += totals.checkoutsStarted || 0;
    totalPaidCheckouts += totals.paidCheckouts || 0;

    // Aggregate Channel Data
    Object.entries(channels).forEach(([channelName, metrics]: [string, any]) => {
      const current = channelMap.get(channelName) || { sessions: 0, paidCheckouts: 0 };
      channelMap.set(channelName, {
        sessions: current.sessions + (metrics.sessions || 0),
        paidCheckouts: current.paidCheckouts + (metrics.paidCheckouts || 0),
      });
    });
  });

  // If no analytics data found (e.g. new brand), fill with 0s or use order data to backfill GMV
  if (dailyStats.length === 0 && orders.length > 0) {
    // Fallback: Group orders by date for the chart
    // This is a "better than nothing" fallback
    const ordersByDate = new Map<string, number>();
    orders.forEach(o => {
      const d = o.createdAt.toDate().toISOString().split('T')[0];
      ordersByDate.set(d, (ordersByDate.get(d) || 0) + o.totals.total);
    });
    // Fill last 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyStats.unshift({
        date: dateStr,
        gmv: ordersByDate.get(dateStr) || 0,
        sessions: 0,
        checkoutsStarted: 0,
        paidCheckouts: 0
      });
    }
  }

  const conversionFunnel = [
    { stage: 'Sessions', count: totalSessions },
    { stage: 'Checkouts Started', count: totalCheckoutsStarted },
    { stage: 'Paid Orders', count: totalPaidCheckouts },
  ];

  const channelPerformance = Array.from(channelMap.entries()).map(([channel, metrics]) => ({
    channel,
    sessions: metrics.sessions,
    revenue: 0, // We don't track revenue per channel in daily analytics yet, strictly speaking.
    conversionRate: metrics.sessions > 0 ? metrics.paidCheckouts / metrics.sessions : 0,
  })).sort((a, b) => b.sessions - a.sessions);

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    salesByProduct,
    dailyStats,
    conversionFunnel,
    channelPerformance,
  };
}
