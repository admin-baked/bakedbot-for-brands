'use client';

/**
 * Custom Domain Management - DEPRECATED
 *
 * Redirects to unified domain manager at /dashboard/domains.
 * Kept for backwards compatibility with existing links/bookmarks.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CustomDomainPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/domains');
  }, [router]);

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Redirecting to Domain Manager...</p>
      </div>
    </div>
  );
}
