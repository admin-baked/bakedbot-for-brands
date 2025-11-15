'use client';
export const dynamic = 'force-dynamic';

import MenuPage from '@/app/menu-page';
import TiledMenuPage from '@/app/menu/tiled/page';
import { useStore } from '@/hooks/use-store';
import { useHydrated } from '@/hooks/useHydrated';
import { Skeleton } from '@/components/ui/skeleton';

export default function Page() {
  const { menuStyle } = useStore();
  const hydrated = useHydrated();

  // On the server, and during the initial client render before hydration,
  // hydrated will be false. We render a skeleton to ensure no mismatch.
  if (!hydrated) {
    return (
        <div className="container mx-auto px-4 py-8">
            <Skeleton className="w-full h-80 rounded-lg mb-12" />
            <Skeleton className="w-full h-48 rounded-lg mb-12" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-96 w-full" />
                ))}
            </div>
        </div>
    );
  }
  
  // After hydration, menuStyle is guaranteed to be the correct value
  // from localStorage, and we can safely render the chosen layout.
  if (menuStyle === 'alt') {
    return <TiledMenuPage />;
  }
  
  return <MenuPage />;
}
