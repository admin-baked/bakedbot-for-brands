import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function DashboardDemoPage() {
  // Kept for backwards compatibility with stale links and route type generation.
  redirect('/dashboard/shop');
}

