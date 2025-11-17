'use client';

import { useStore } from '@/hooks/use-store';
import { Skeleton } from '@/components/ui/skeleton';
import { useMenuData } from '@/hooks/use-menu-data';
import TiledMenuPage from '@/app/menu/tiled/page';
import { HeroSlider } from '@/components/hero-slider';
import { DispensaryLocator } from '@/components/dispensary-locator';
import { ProductGrid } from '@/components/product-grid';
import RecentReviewsFeed from '@/components/recent-reviews-feed';
import Header from '@/components/header';
import { Footer } from '@/components/footer';
import { FloatingCartPill } from '@/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';
import { useHydrated } from '@/hooks/use-hydrated';
import { useEffect } from 'react';
import type { Product, Retailer } from '@/types/domain';
import { useDemoMode } from '@/context/demo-mode';

interface MenuPageClientProps {
  initialProducts: Product[];
  initialLocations: Retailer[];
  initialIsDemo: boolean;
}

/**
 * This client component receives server-fetched data and handles all interactivity.
 */
export default function MenuPageClient({
  initialProducts,
  initialLocations,
  initialIsDemo
}: MenuPageClientProps) {
  const { menuStyle } = useStore();
  const hydrated = useHydrated();

  // The useDemoMode hook now controls the client-side state, which can
  // override the initial server-rendered state.
  const { isDemo, setIsDemo } = useDemoMode();

  // Set the initial demo state from the server render, but only once.
  useEffect(() => {
    setIsDemo(initialIsDemo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIsDemo]);

  // The useMenuData hook is still used here, but it will now prioritize
  // the client-side demo mode toggle over its own fetching logic.
  const { products, locations, isLoading } = useMenuData({
    serverProducts: initialProducts,
    serverLocations: initialLocations,
  });

  // Show loading skeleton until hydrated on the client.
  if (!hydrated || isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8 flex-1">
          <Skeleton className="w-full h-80 rounded-lg mb-12" />
          <Skeleton className="w-full h-48 rounded-lg mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-96 w-full" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  // Render tiled layout if selected
  if (menuStyle === 'alt') {
    return <TiledMenuPage />;
  }
  
  // Render default grid layout
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 space-y-12">
          <HeroSlider products={products} isLoading={isLoading} />
          <DispensaryLocator locations={locations} isLoading={isLoading}/>
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
