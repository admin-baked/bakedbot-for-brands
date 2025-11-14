
'use client';

import MenuPage from '@/app/menu-page';
import TiledMenuPage from '@/app/menu/tiled/page';
import { useStore } from '@/hooks/use-store';
import { useHydrated } from '@/hooks/useHydrated';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  const { menuStyle } = useStore();
  const hydrated = useHydrated();

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

  // The logic to switch between menus is now simplified.
  // The tiled menu has its own page at /menu/tiled
  if (menuStyle === 'alt') {
    return <TiledMenuPage />;
  }
  
  return <MenuPage />;
}
