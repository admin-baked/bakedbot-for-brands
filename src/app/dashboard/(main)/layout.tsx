'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardConfig } from '@/hooks/use-dashboard-config';
import { usePathname, useRouter } from 'next/navigation';
import DashboardWelcome from '@/app/dashboard/components/dashboard-welcome';

export default function DashboardTabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { navLinks } = useDashboardConfig();
  const pathname = usePathname();
  const router = useRouter();

  const isRootDashboard = pathname === '/dashboard';
  const dashboardTabs = navLinks.filter(link => link.href.startsWith('/dashboard/'));

  return (
    <div className="flex flex-col gap-6 h-full">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                Manage your brand, products, and AI features.
                </p>
            </div>
             <Tabs value={pathname} onValueChange={(value) => router.push(value)}>
                <TabsList className="hidden sm:flex">
                    {dashboardTabs.map(tab => (
                        <TabsTrigger key={tab.href} value={tab.href}>{tab.label}</TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
        </div>
        {isRootDashboard ? <DashboardWelcome /> : children}
    </div>
  );
}
