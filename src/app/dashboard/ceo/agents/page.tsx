export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

// Canonical Super User agent workspace lives in the CEO dashboard tab system.
// Keep this route as a convenience alias.
export default function CeoAgentsRoute() {
  redirect('/dashboard/ceo?tab=agents');
}

