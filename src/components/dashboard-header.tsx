
'use client';

import { usePathname } from 'next/navigation';
import { useDashboardConfig } from '@/hooks/use-dashboard-config';

export function DashboardHeader() {
  const pathname = usePathname();
  const { navLinks } = useDashboardConfig();

  // Find the current nav link based on the path.
  // For the root dashboard, it's a direct match. For others, we check if the path starts with the link's href.
  const currentLink = navLinks.find(
    (link) => (link.href === '/dashboard' ? pathname === link.href : pathname.startsWith(link.href))
  );

  if (!currentLink) {
    return null; // Or a default header if you prefer
  }

  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight">{currentLink.label}</h1>
      <p className="text-muted-foreground">{currentLink.description}</p>
    </div>
  );
}
