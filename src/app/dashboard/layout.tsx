
'use client';

import { DashboardSidebar } from './components/sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardConfig } from '@/hooks/use-dashboard-config';
import { usePathname, useRouter } from 'next/navigation';
import DashboardWelcome from '@/app/dashboard/components/dashboard-welcome';

export default function DashboardLayout({
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
    <SidebarProvider>
        <div className="flex flex-1">
          <DashboardSidebar />
          <SidebarInset>
              <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
                  <SidebarTrigger />
              </header>
              <main className="flex flex-1 flex-col p-4 sm:p-6">
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
              </main>
          </SidebarInset>
        </div>
    </SidebarProvider>
  );
}
