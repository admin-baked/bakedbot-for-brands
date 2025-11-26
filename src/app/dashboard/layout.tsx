
// src/app/dashboard/layout.tsx
'use client';

import { Providers } from '@/app/providers';
import { DashboardHeader } from '@/components/dashboard/header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import type { ReactNode } from 'react';
import { withAuth } from '@/lib/with-auth';

function DashboardLayout({ children }: { children: ReactNode }) {
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

// Protect the dashboard with authentication and role requirements
export default withAuth(DashboardLayout, {
  allowedRoles: ['brand', 'dispensary', 'owner'],
});
