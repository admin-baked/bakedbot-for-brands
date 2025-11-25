
'use client';

import { usePathname } from 'next/navigation';
import { useDashboardConfig } from '@/hooks/use-dashboard-config';

export function DashboardHeader() {
  const { currentLink } = useDashboardConfig();

  if (!currentLink) {
    return null; // Or a default header if you prefer
  }

  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight">{currentLink.label}</h1>
      <p className="text-muted-foreground">{currentLink.description}</p>
    </div>
  );
}
