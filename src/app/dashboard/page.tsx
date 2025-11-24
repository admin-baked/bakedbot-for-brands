// app/dashboard/page.tsx

'use server';

import { getPlaybooksForDashboard } from './actions';
import { DashboardPlaybooksClient } from './playbooks-client';

// This is now a Server Component that fetches data and passes it to the client.
export default async function DashboardPage() {
  
  // Fetch live playbook data from the stubbed action.
  const playbooks = await getPlaybooksForDashboard();

  return (
      <DashboardPlaybooksClient initialPlaybooks={playbooks} />
  );
}
