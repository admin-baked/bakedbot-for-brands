
'use client';

import { useCookieStore } from '@/lib/cookie-storage';
import { Skeleton } from '@/components/ui/skeleton';
import TiledMenuPage from '@/app/menu/tiled/page';
import { HeroSlider } from '@/components/hero-slider';
import { DispensaryLocator } from '@/components/dispensary-locator';
import { ProductGrid } from '@/components/product-grid';
import RecentReviewsFeed from '@/components/recent-reviews-feed';
import Header from '@/components/header';
import { Footer } from '@/components/footer';
import { FloatingCartPill } from '@/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';
import { useHydrated } from '@/hooks/useHydrated';
import { useEffect, useMemo } from 'react';
import type { Product, Retailer, Review } from '@/types/domain';
import { useDemoMode } from '@/context/demo-mode';
import { demoProducts, demoRetailers } from '@/lib/data';

interface MenuPageClientProps {
  initialProducts: Product[];
  initialLocations: Retailer[];
  initialIsDemo: boolean;
  initialReviews: Review[];
}

/**
 * This client component receives server-fetched data and handles all interactivity.
 */
export default function MenuPageClient({
  initialProducts,
  initialLocations,
  initialIsDemo,
  initialReviews,
}: MenuPageClientProps) {
  const { menuStyle } = useCookieStore();
  const hydrated = useHydrated();

  const { isDemo, setIsDemo } = useDemoMode();

  // Set the initial demo state from the server render, but only once.
  useEffect(() => {
    setIsDemo(initialIsDemo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIsDemo]);

  // isLoading is true until the component has hydrated on the client.
  const isLoading = !hydrated;

  // Determine which data to display based on demo mode.
  const products = isDemo ? demoProducts : initialProducts;
  const locations = isDemo ? demoRetailers : initialLocations;

  // Show loading skeleton until hydrated on the client.
  if (isLoading) {
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
    // Pass the correct data down to the TiledMenuPage
    return <TiledMenuPage products={products} locations={locations} isLoading={false} />;
  }
  
  // Render default grid layout
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 space-y-12">
          <HeroSlider products={products} isLoading={false} />
          <DispensaryLocator locations={locations} isLoading={false}/>
          <ProductGrid products={products} isLoading={false} />
          <RecentReviewsFeed reviews={initialReviews} products={products} isLoading={false} />
        </div>
      </main>
      <FloatingCartPill />
      <Chatbot />
      <Footer />
    </div>
  );
}
