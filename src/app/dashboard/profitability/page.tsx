import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ProfitabilityDashboard } from './components/profitability-dashboard';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

export default async function ProfitabilityPage() {
  let user;
  try {
    user = await requireUser(['dispensary', 'brand', 'super_user']);
  } catch {
    redirect('/signin');
  }

  if (!user) redirect('/signin');

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Profitability Intelligence</h1>
        <p className="text-muted-foreground">
          280E Tax Optimization, NY Cannabis Taxes, and Financial Analytics
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <ProfitabilityDashboard userId={user.uid} />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
