
// src/app/dashboard/page.tsx

import DashboardPageClient from './page-client';
// import { getPlaybooksForDashboard } from './actions'; // optional later

export default async function DashboardPage() {
  // TODO: wire real data later
  // const playbooks = await getPlaybooksForDashboard();
  const playbooks: any[] = [];

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <DashboardPageClient playbooks={playbooks} />
    </main>
  );
}
