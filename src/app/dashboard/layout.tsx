
// src/app/dashboard/layout.tsx
'use client';

import { DashboardHeader } from '@/components/dashboard/header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { ErrorBoundary } from '@/components/error-boundary';
import type { ReactNode } from 'react';
import { withAuth } from '@/lib/with-auth';

function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <div className="flex-1 p-4 md:p-6">
          <DashboardHeader />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Protect the dashboard with authentication and role requirements
export default withAuth(DashboardLayout, {
  allowedRoles: ['brand', 'dispensary', 'super_user', 'customer', 'budtender'],
});
