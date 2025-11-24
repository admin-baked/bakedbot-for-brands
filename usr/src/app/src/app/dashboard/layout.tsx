
// src/app/dashboard/layout.tsx
import type { ReactNode } from 'react';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardTopbar } from '@/components/dashboard/topbar';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#0b090e] text-zinc-50">
      {/* Left sidebar */}
      <DashboardSidebar />

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar />

        <main className="flex-1 overflow-y-auto bg-[#0b090e]">
          {/* Page-level content like Playbooks grid goes here */}
          {children}
        </main>
      </div>
    </div>
  );
}
