'use client';

import { useDashboardConfig } from '@/hooks/use-dashboard-config';
import { ImportProgress } from '@/components/dashboard/import-progress';
import { useBrandId } from '@/hooks/use-brand-id';

export function DashboardHeader() {
  const { current } = useDashboardConfig();
  const { brandId } = useBrandId();

  if (!current) {
    return null; // Or a default header if you prefer
  }

  return (
    <div className="mb-6 relative">
      <h1 className="text-3xl font-bold tracking-tight">{current.label}</h1>
      <p className="text-muted-foreground">{current.description}</p>
      {brandId && <ImportProgress brandId={brandId} />}
    </div>
  );
}
