'use client';

import { useDashboardConfig } from '@/hooks/use-dashboard-config';
import { ImportProgress } from '@/components/dashboard/import-progress';
import { useBrandId } from '@/hooks/use-brand-id';
import { useUserRole } from '@/hooks/use-user-role';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { NotificationBell } from '@/components/dashboard/notification-bell';
import { UserStreakComponent } from '@/components/gamification/user-streak';
import { HeartbeatIndicator } from '@/components/system/heartbeat-indicator';

export function DashboardHeader() {
  const { current } = useDashboardConfig();
  const { brandId } = useBrandId();
  const { role } = useUserRole();

  const isSuperUser = role === 'super_user';
  const isMobile = useIsMobile();

  if (!current) {
    return null;
  }

  return (
    <div className="mb-6 flex items-center gap-2">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="relative flex-1 min-w-0">
        <h1 className="text-xl md:text-3xl font-bold tracking-tight truncate">{current.label}</h1>
        <p className="text-sm md:text-base text-muted-foreground line-clamp-1">{current.description}</p>
        {brandId && <ImportProgress brandId={brandId} />}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <HeartbeatIndicator
          showLabel={isSuperUser && !isMobile}
          showTooltip={true}
          size={isSuperUser && !isMobile ? 'large' : 'default'}
        />
        <span className="hidden sm:contents">
          <Separator orientation="vertical" className="h-4" />
          <UserStreakComponent />
        </span>
        <NotificationBell />
      </div>
    </div>
  );
}
