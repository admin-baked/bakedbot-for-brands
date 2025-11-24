
'use client';

import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <div className="flex-1 md:pl-60">
          <header className="sticky top-0 z-10 border-b bg-background/80 px-4 py-4 backdrop-blur sm:px-6">
            <DashboardHeader />
          </header>
          <main className="px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
