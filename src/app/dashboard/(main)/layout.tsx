'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardConfig } from '@/hooks/use-dashboard-config';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardTabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { navLinks } = useDashboardConfig();
  const pathname = usePathname();
  const router = useRouter();

  const dashboardTabs = navLinks.filter(link => link.href.startsWith('/dashboard/'));

  return (
    <Tabs value={pathname} onValueChange={(value) => router.push(value)} className="flex flex-col gap-6 h-full">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                Manage your brand, products, and AI features.
                </p>
            </div>
             <TabsList className="hidden sm:flex">
                {dashboardTabs.map(tab => !tab.hidden && (
                     <TabsTrigger key={tab.href} value={tab.href}>{tab.label}</TabsTrigger>
                ))}
            </TabsList>
        </div>
        {children}
    </Tabs>
  );
}
