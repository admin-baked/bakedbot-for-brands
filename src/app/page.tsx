
'use client';

import { useHydrated } from '@/hooks/use-hydrated';
import RootHomepage from './root-homepage';
import { useDemoMode } from '@/context/demo-mode';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_BRAND_ID } from '@/lib/config';
import { Skeleton } from '@/components/ui/skeleton';

export default function RootOrMenuPage() {
  const { isDemo } = useDemoMode();
  const hydrated = useHydrated();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && isDemo) {
      // If demo mode is active, redirect to the demo menu page.
      // This ensures the correct layout and data context are loaded.
      router.replace(`/menu/${DEMO_BRAND_ID}`);
    }
  }, [hydrated, isDemo, router]);

  // If we are in demo mode but not yet hydrated, show a loading state
  // to prevent a flash of the homepage content.
  if (isDemo && !hydrated) {
    return (
        <div className="container mx-auto px-4 space-y-12 py-8">
            <Skeleton className="w-full h-80 rounded-lg" />
            <Skeleton className="w-full h-48 rounded-lg" />
        </div>
    );
  }
  
  // By default, or if not in demo mode, show the marketing homepage.
  return <RootHomepage />;
}
