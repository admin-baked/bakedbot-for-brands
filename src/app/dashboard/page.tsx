'use client';



/**
 * Dashboard Overview Page
 *
 * Inbox-First Architecture:
 * - Brand users: Redirect to /dashboard/inbox (primary workflow)
 * - Dispensary users: Redirect to /dashboard/inbox
 * - Super Users: Show overview (they have /dashboard/ceo for their main view)
 * - Other roles: Show overview stats
 *
 * This implements the architectural decision from inbox-audit-2026-01.md
 * to make inbox the primary UX paradigm for brand and dispensary users.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserRole } from '@/hooks/use-user-role';
import DashboardWelcome from '@/components/dashboard/dashboard-welcome';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { role, isLoading } = useUserRole();

  useEffect(() => {
    if (isLoading) return;

    // Inbox-First: Brand and dispensary users go directly to inbox
    if (
      role === 'brand' ||
      role === 'brand_admin' ||
      role === 'brand_member' ||
      role === 'dispensary' ||
      role === 'dispensary_admin' ||
      role === 'dispensary_staff' ||
      role === 'grower'
    ) {
      router.replace('/dashboard/inbox');
      return;
    }

    // Super users and other roles see the overview
    // (Super users also have /dashboard/ceo as their primary workspace)
  }, [role, isLoading, router]);

  // Show loading state while determining role
  if (isLoading ||
    role === 'brand' ||
    role === 'brand_admin' ||
    role === 'brand_member' ||
    role === 'dispensary' ||
    role === 'dispensary_admin' ||
    role === 'dispensary_staff' ||
    role === 'grower'
  ) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Show overview for super users and other roles
  return <DashboardWelcome />;
}
