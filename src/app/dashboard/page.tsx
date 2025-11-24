
'use server';

import DashboardPageComponent from './page-client';
import { getPlaybooksForDashboard } from './actions';

// This is now a Server Component that fetches data and passes it to the client.
export default async function DashboardPage() {
  
  // Fetch live playbook data from the stubbed action.
  const playbooks = await getPlaybooksForDashboard();

  return (
      <DashboardPageComponent initialPlaybooks={playbooks} />
  );
}
