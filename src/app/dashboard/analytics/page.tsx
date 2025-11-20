
// src/app/dashboard/analytics/page.tsx
import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { getAnalyticsData } from './actions';
import AnalyticsDashboard from './components/analytics-dashboard';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

function AnalyticsSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    )
}

export default async function DashboardAnalyticsPage() {
  let user;
  try {
    user = await requireUser(['brand', 'owner']);
  } catch (error) {
    redirect('/brand-login');
  }

  const brandId = user.brandId;
  if (!brandId) {
    return <p>You are not associated with a brand.</p>;
  }

  const analyticsData = await getAnalyticsData(brandId);
  
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsDashboard initialData={analyticsData} />
    </Suspense>
  );
}
