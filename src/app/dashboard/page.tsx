
'use server';

import DashboardPageComponent from '@/app/dashboard/page-client';
import { getPlaybooksForDashboard, getPlaybookDraftsForDashboard } from '@/app/dashboard/actions';

// This is now a Server Component that fetches data and passes it to the client.
export default async function DashboardPage() {
  
  // Fetch live playbook data from the stubbed action.
  const [playbooks, drafts] = await Promise.all([
    getPlaybooksForDashboard(),
    getPlaybookDraftsForDashboard(),
  ]);

  return (
      <DashboardPageComponent initialPlaybooks={playbooks} drafts={drafts} />
  );
}
