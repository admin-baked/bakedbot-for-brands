'use client';

/**
 * Team Management Page Redirect
 * This page has been moved to /dashboard/settings/team
 */

import { redirect } from 'next/navigation';

export default function TeamPage() {
  // Redirect to new team management page
  redirect('/dashboard/settings/team');
}
