
// src/app/dashboard/layout.tsx
import { Providers } from '@/app/providers';
import { DashboardHeader } from '@/components/dashboard/header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
        <SidebarProvider>
            <DashboardSidebar />
            <main className="flex-1 p-6">
                <DashboardHeader />
                {children}
            </main>
        </SidebarProvider>
    </Providers>
  );
}
