'use client';

import { useDashboardConfig } from '@/hooks/use-dashboard-config';

export function DashboardHeader() {
  const { current } = useDashboardConfig();

  if (!current) {
    return null; // Or a default header if you prefer
  }

  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight">{current.label}</h1>
      <p className="text-muted-foreground">{current.description}</p>
    </div>
  );
}
