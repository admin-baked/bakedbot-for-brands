// app/dashboard/page.tsx

import { getPlaybooksForDashboard } from './actions';
import { DashboardPlaybooksClient } from './playbooks-client';

export default async function DashboardPage() {
  const playbooks = await getPlaybooksForDashboard();

  return (
    <div className="flex min-h-screen bg-[#0c0707] text-gray-100">
      {/* If you already have a DashboardSidebar layout, you can use it here.
         For now, we'll just render the client block. */}
      <DashboardPlaybooksClient initialPlaybooks={playbooks} />
    </div>
  );
}
