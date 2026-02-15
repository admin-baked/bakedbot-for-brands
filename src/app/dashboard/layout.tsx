
// src/app/dashboard/layout.tsx
// Server component to manage dashboard-wide segment configuration
import type { ReactNode } from 'react';
import { DashboardLayoutClient } from './layout-client';

// EMERGENCY BUILD FIX: Force dynamic rendering for the entire dashboard subtree
// This prevents Next.js from attempting to statically pre-render all 204+ pages at build time,
// which causes Out of Memory (OOM) errors and SIGKILL on limited build environments.
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
