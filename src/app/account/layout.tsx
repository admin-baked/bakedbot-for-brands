'use client';

import { DashboardHeader } from '@/components/dashboard/header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { ErrorBoundary } from '@/components/error-boundary';
import type { ReactNode } from 'react';
import { withAuth } from '@/lib/with-auth';

function AccountLayout({ children }: { children: ReactNode }) {
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

// Protect the account page with authentication and role requirements
// Matching dashboard roles
export default withAuth(AccountLayout, {
    allowedRoles: ['brand', 'dispensary', 'super_user', 'customer', 'budtender'],
});
