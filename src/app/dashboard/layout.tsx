
'use client';

import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  return (
    <SidebarProvider>
        <div className="flex flex-1">
          <DashboardSidebar />
          <SidebarInset>
              <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
                  <SidebarTrigger />
              </header>
              <main className="flex flex-1 flex-col p-4 sm:p-6">
                {children}
              </main>
          </SidebarInset>
        </div>
    </SidebarProvider>
  );
}
