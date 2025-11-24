
// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/auth';
import DashboardPageClient from './page-client';
import {
  getPlaybooksForDashboard,
  getPlaybookDraftsForDashboard,
} from './actions';

export default async function DashboardPage() {
  let user;
  try {
    // This page is protected; only brand and owner roles can access it.
    user = await requireUser(['brand', 'owner']);
  } catch (error) {
    // If auth fails, redirect to the appropriate login page.
    redirect('/brand-login');
  }

  // Fetch both sets of data in parallel.
  // getPlaybookDraftsForDashboard will internally use the user's brandId.
  const [playbooks, drafts] = await Promise.all([
    getPlaybooksForDashboard(),
    getPlaybookDraftsForDashboard(),
  ]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <DashboardPageClient playbooks={playbooks} drafts={drafts} />
    </main>
  );
}
