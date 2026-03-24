// src/app/dashboard/analytics/page.tsx
import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { getAnalyticsData } from './actions';
import { getAnalyticsPrefs } from '@/server/actions/analytics-prefs';
import { DEFAULT_WIDGETS } from '@/lib/analytics-constants';
import AnalyticsDashboard from './components/analytics-dashboard';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

const EMPTY_ANALYTICS = {
  totalRevenue: 0,
  totalOrders: 0,
  averageOrderValue: 0,
  salesByProduct: [],
  salesByCategory: [],
  affinityPairs: [],
  dailyStats: [],
  conversionFunnel: [],
  channelPerformance: [],
  repeatCustomerRate: 0,
  churnRate: 0,
  cohorts: [],
  last30DaysRevenue: 0,
  last30DaysOrders: 0,
  prev30DaysRevenue: 0,
  prev30DaysOrders: 0,
  uniqueCustomerCount: 0,
  dataNote: 'No data yet',
};

const EMPTY_PREFS = {
  enabledWidgets: [...DEFAULT_WIDGETS],
  updatedAt: '',
};

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Tab nav skeleton */}
      <div className="border-b flex gap-4 pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-20" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default async function DashboardAnalyticsPage() {
  let user;
  try {
    user = await requireUser([
      'brand',
      'brand_admin',
      'brand_member',
      'dispensary',
      'dispensary_admin',
      'dispensary_staff',
      'budtender',
      'super_user',
      'super_admin',
    ]);
  } catch {
    redirect('/signin');
  }

  const orgId =
    (user as any).brandId ||
    (user as any).currentOrgId ||
    (user as any).orgId ||
    '';

  const userRole = (user as any).role ?? 'brand';

  if (!orgId) {
    return (
      <AnalyticsDashboard
        initialData={EMPTY_ANALYTICS}
        prefs={EMPTY_PREFS}
        orgId=""
        userRole={userRole}
      />
    );
  }

  const [analyticsData, prefs] = await Promise.all([
    getAnalyticsData(orgId).catch((err) => {
      console.error('[Analytics Page] Error fetching data:', err);
      return EMPTY_ANALYTICS;
    }),
    getAnalyticsPrefs().catch(() => EMPTY_PREFS),
  ]);

  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsDashboard
        initialData={analyticsData}
        prefs={prefs}
        orgId={orgId}
        userRole={userRole}
      />
    </Suspense>
  );
}
