// src/app/dashboard/page.tsx
'use server';

import DashboardPageClient from './page-client';
import {
  getPlaybooksForDashboard,
  getPlaybookDraftsForDashboard,
} from './actions';

// This is now a Server Component that fetches data and passes it to the client.
export default async function DashboardPage() {
  
  // Fetch live playbook data from the stubbed action.
  const [playbooks, drafts] = await Promise.all([
    getPlaybooksForDashboard(),
    getPlaybookDraftsForDashboard(),
  ]);

  return (
      <DashboardPageClient playbooks={playbooks} drafts={drafts} />
  );
}
