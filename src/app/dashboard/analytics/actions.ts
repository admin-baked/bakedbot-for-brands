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
  salesByCategory: {
    category: string;
    revenue: number;
  }[];
  affinityPairs: {
    productA: string;
    productB: string;
    count: number;
    strength: number; // Normalized (0-1) or probability
  }[];
  dailyStats: DailyAnalytics[];
  conversionFunnel: {
    stage: string;
    count: number;
  }[];
  channelPerformance: {
    channel: string;
    sessions: number;
    revenue: number;
    conversionRate: number;
  }[];
  repeatCustomerRate: number;
  churnRate: number;
  cohorts: CohortData[]; // Added
}

export interface CohortData {
  month: string; // YYYY-MM
  initialSize: number;
  retention: number[]; // [Month 0 (100%), Month 1, Month 2...]
}

export async function getAnalyticsData(brandId: string): Promise<AnalyticsData> {
  const user = await requireUser(['brand', 'owner']);
  if (user.brandId !== brandId && user.role !== 'owner') {
    throw new Error('Forbidden: You do not have permission to access this data.');
  }

  const { firestore } = await createServerClient();

  // Fetch orders
  const ordersQuery = firestore.collection('orders')
    .where('brandId', '==', brandId)
    .where('status', 'in', ['submitted', 'confirmed', 'ready', 'completed'])
    .withConverter(orderConverter as any);

  const ordersSnap = await ordersQuery.get();
  const orders = ordersSnap.docs.map((doc: any) => doc.data()) as OrderDoc[];

  // --- COHORT ANALYSIS LOGIC (Task 401) ---
  const customerFirstOrderDate = new Map<string, string>(); // email -> YYYY-MM
  const cohortsMap = new Map<string, { initialSize: number, retained: Map<number, Set<string>> }>();

  // 1. Determine Acquisition Month for each customer
  orders.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis()); // Ensure chronological
  orders.forEach(order => {
    const email = order.customer.email;
    const month = order.createdAt.toDate().toISOString().substring(0, 7); // YYYY-MM

    if (!customerFirstOrderDate.has(email)) {
      customerFirstOrderDate.set(email, month);
      // Initialize cohort if new
      if (!cohortsMap.has(month)) {
        cohortsMap.set(month, { initialSize: 0, retained: new Map() });
      }
      cohortsMap.get(month)!.initialSize++;
      // Month 0 always retained
      if (!cohortsMap.get(month)!.retained.has(0)) cohortsMap.get(month)!.retained.set(0, new Set());
      cohortsMap.get(month)!.retained.get(0)!.add(email);
    } else {
      // Returning customer
      const acquisitionMonth = customerFirstOrderDate.get(email)!;
      const acqDate = new Date(acquisitionMonth + '-01');
      const orderDate = new Date(month + '-01');
      // Calculate month difference
      const diffMonths = (orderDate.getFullYear() - acqDate.getFullYear()) * 12 + (orderDate.getMonth() - acqDate.getMonth());

      if (cohortsMap.has(acquisitionMonth)) {
        if (!cohortsMap.get(acquisitionMonth)!.retained.has(diffMonths)) cohortsMap.get(acquisitionMonth)!.retained.set(diffMonths, new Set());
        cohortsMap.get(acquisitionMonth)!.retained.get(diffMonths)!.add(email);
      }
    }
  });

  const cohorts: CohortData[] = Array.from(cohortsMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0])) // Sort by month desc
    .slice(0, 12) // Last 12 months
    .map(([month, data]) => {
      const retentionArray: number[] = [];
      for (let i = 0; i <= 11; i++) {
        const retainedCount = data.retained.get(i)?.size || 0;
        const percentage = data.initialSize > 0 ? (retainedCount / data.initialSize) * 100 : 0;
        retentionArray.push(percentage);
      }
      return {
        month,
        initialSize: data.initialSize,
        retention: retentionArray
      };
    });

  // --- EXISTING LOGIC BELOW ---
  let totalRevenue = 0;
  const salesByProductMap = new Map<string, { productName: string; revenue: number }>();
  // ... rest of logic ...
  const salesByCategoryMap = new Map<string, number>();

  // Affinity Analysis: Pair co-occurrence counting
  const pairCounts = new Map<string, { productA: string; productB: string; count: number }>();

  orders.forEach(order => {
    totalRevenue += order.totals.total;

    // Sales Aggregation
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

      const cat = item.category || 'Uncategorized';
      salesByCategoryMap.set(cat, (salesByCategoryMap.get(cat) || 0) + itemRevenue);
    });

    // Affinity Logic (Task 403)
    // Only analyze if basket has > 1 item
    if (order.items.length > 1) {
      // Generate unique pairs
      for (let i = 0; i < order.items.length; i++) {
        for (let j = i + 1; j < order.items.length; j++) {
          const itemA = order.items[i];
          const itemB = order.items[j];

          // Create sorted Key to ensure A-B is same as B-A
          const [first, second] = [itemA.name, itemB.name].sort();
          const key = `${first}|${second}`;

          const current = pairCounts.get(key);
          if (current) {
            current.count++;
          } else {
            pairCounts.set(key, { productA: first, productB: second, count: 1 });
          }
        }
      }
    }
  });

  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const salesByProduct = Array.from(salesByProductMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const salesByCategory = Array.from(salesByCategoryMap.entries())
    .map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  const affinityPairs = Array.from(pairCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5) // Top 5
    .map(p => ({
      ...p,
      strength: totalOrders > 0 ? p.count / totalOrders : 0 // Rough probability
    }));

  // Repeat Purchase Logic (Task 402)
  const customerOrderCounts = new Map<string, number>();
  orders.forEach(o => {
    const email = o.customer.email;
    if (email) {
      customerOrderCounts.set(email, (customerOrderCounts.get(email) || 0) + 1);
    }
  });

  let repeatCustomers = 0;
  const totalUniqueCustomers = customerOrderCounts.size;
  customerOrderCounts.forEach(count => {
    if (count > 1) repeatCustomers++;
  });

  const repeatCustomerRate = totalUniqueCustomers > 0 ? repeatCustomers / totalUniqueCustomers : 0;
  // Churn Rate approximation (inverse of retention or customers who haven't bought in > 90 days / total)
  // For now, let's use a simpler placeholder or calculated metric if possible.
  // Let's assume churn is 1 - Repeat Rate for this MVP context or 0 if not enough data.
  const churnRate = 0; // Placeholder until strict churn definition (e.g., no visit in X days) is decided.

  // Daily Stats Logic (Simplified for brevity, same as before)
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
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
  const channelMap = new Map<string, any>();

  analyticsSnap.forEach(doc => {
    const data = doc.data();
    const totals = data.totals || {};
    const channels = data.channels || {};

    dailyStats.push({
      date: data.date,
      gmv: totals.gmv || 0,
      sessions: Object.values(channels).reduce((acc: number, ch: any) => acc + (ch.sessions || 0), 0),
      checkoutsStarted: totals.checkoutsStarted || 0,
      paidCheckouts: totals.paidCheckouts || 0,
    });

    totalSessions += Object.values(channels).reduce((acc: number, ch: any) => acc + (ch.sessions || 0), 0);
    totalCheckoutsStarted += totals.checkoutsStarted || 0;
    totalPaidCheckouts += totals.paidCheckouts || 0;

    Object.entries(channels).forEach(([channelName, metrics]: [string, any]) => {
      const current = channelMap.get(channelName) || { sessions: 0, paidCheckouts: 0 };
      channelMap.set(channelName, {
        sessions: current.sessions + (metrics.sessions || 0),
        paidCheckouts: current.paidCheckouts + (metrics.paidCheckouts || 0),
      });
    });
  });

  if (dailyStats.length === 0 && orders.length > 0) {
    const ordersByDate = new Map<string, number>();
    orders.forEach(o => {
      const d = o.createdAt.toDate().toISOString().split('T')[0];
      ordersByDate.set(d, (ordersByDate.get(d) || 0) + o.totals.total);
    });
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
    revenue: 0,
    conversionRate: metrics.sessions > 0 ? metrics.paidCheckouts / metrics.sessions : 0,
  })).sort((a, b) => b.sessions - a.sessions);

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    salesByProduct,
    salesByCategory,
    affinityPairs, // Added
    dailyStats,
    conversionFunnel,
    channelPerformance,
    repeatCustomerRate,
    churnRate,
    cohorts // Added
  };
}
