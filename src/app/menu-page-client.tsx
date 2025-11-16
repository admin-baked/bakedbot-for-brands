
'use client';

import { HeroSlider } from '@/components/hero-slider';
import { DispensaryLocator } from '@/components/dispensary-locator';
import { ProductGrid } from '@/components/product-grid';
import { FloatingCartPill } from '@/app/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';
import Header from '@/app/components/header';
import { Footer } from '@/app/components/footer';
import RecentReviewsFeed from './components/recent-reviews-feed';
import { useStore } from '@/hooks/use-store';
import { useHydrated } from '@/hooks/use-hydrated';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import type { Product, Location } from '@/types/domain';
import { useMenuData } from '@/hooks/use-menu-data';
import TiledMenuPage from './menu/tiled/page';

interface MenuPageClientProps {
    serverProducts: Product[];
    serverLocations: Location[];
}

export default function MenuPageClient({ serverProducts, serverLocations }: MenuPageClientProps) {
  const { menuStyle } = useStore();
  const hydrated = useHydrated();
  
  // Use the client-side hook, but provide it with the server-fetched data as an initial value.
  const { products, locations, isLoading } = useMenuData(serverProducts, serverLocations);

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
  
  if (menuStyle === 'alt') {
    return <TiledMenuPage />;
  }
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 space-y-12">
          <HeroSlider products={products} isLoading={isLoading} />
          <DispensaryLocator locations={locations} isLoading={isLoading} />
          <ProductGrid products={products} isLoading={isLoading} />
          <RecentReviewsFeed />
        </div>
      </main>
      <FloatingCartPill />
      <Chatbot />
      <Footer />
    </div>
  );
}
