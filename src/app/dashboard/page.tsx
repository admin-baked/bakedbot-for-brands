
// src/app/dashboard/page.tsx
import DashboardWelcome from '@/components/dashboard/dashboard-welcome';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // This is a Server Component, so it cannot use client-side hooks.
  // We'll render the client component that contains the hook logic.
  return <DashboardWelcome />;
}
