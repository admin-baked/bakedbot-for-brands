// src/app/dashboard/page.tsx

import DashboardPageClient from './page-client';
import {
  getPlaybooksForDashboard,
  getPlaybookDraftsForDashboard,
} from './actions';
import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  let user;
  try {
    user = await requireUser(['brand', 'owner']);
  } catch {
    redirect('/brand-login');
  }

  const [playbooks, drafts] = await Promise.all([
    getPlaybooksForDashboard(),
    getPlaybookDraftsForDashboard(user.brandId),
  ]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <DashboardPageClient playbooks={playbooks} drafts={drafts} />
    </main>
  );
}
