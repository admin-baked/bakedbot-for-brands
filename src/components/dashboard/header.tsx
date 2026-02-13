'use client';

import { useDashboardConfig } from '@/hooks/use-dashboard-config';
import { ImportProgress } from '@/components/dashboard/import-progress';
import { useBrandId } from '@/hooks/use-brand-id';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { NotificationBell } from '@/components/dashboard/notification-bell';
import { UserStreakComponent } from '@/components/gamification/user-streak';

export function DashboardHeader() {
  const { current } = useDashboardConfig();
  const { brandId } = useBrandId();

  if (!current) {
    return null;
  }

  return (
    <div className="mb-6 flex items-center gap-2">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="relative flex-1">
        <h1 className="text-xl md:text-3xl font-bold tracking-tight">{current.label}</h1>
        <p className="text-sm md:text-base text-muted-foreground">{current.description}</p>
        {brandId && <ImportProgress brandId={brandId} />}
      </div>
      <div className="flex items-center gap-3">
        <UserStreakComponent />
        <NotificationBell />
      </div>
    </div>
  );
}
