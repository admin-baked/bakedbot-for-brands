
// src/app/dashboard/layout.tsx
import { Providers } from '@/app/providers';
import { DashboardHeader } from '@/components/dashboard/header';
import { DashboardSidebar } from '@/components/ui/sidebar'; // Changed to new component
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
        <DashboardSidebar>
            <main className="flex-1 p-6">
                <DashboardHeader />
                {children}
            </main>
        </DashboardSidebar>
    </Providers>
  );
}
