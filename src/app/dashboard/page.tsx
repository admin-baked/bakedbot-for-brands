
// src/app/dashboard/page.tsx

import DashboardPageClient from './page-client';
import { getPlaybooksForDashboard } from './actions';

export default async function DashboardPage() {
  const playbooks = await getPlaybooksForDashboard();

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <DashboardPageClient initialPlaybooks={playbooks} />
    </main>
  );
}
