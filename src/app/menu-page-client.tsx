
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import TiledMenuPage from '@/app/menu/tiled/page';
import { HeroSlider } from '@/components/hero-slider';
import DispensaryLocator from '@/components/dispensary-locator';
import { ProductGrid } from '@/components/product-grid';
import RecentReviewsFeed from '@/components/recent-reviews-feed';
import { FloatingCartPill } from '@/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';
import { useHydrated } from '@/hooks/use-hydrated';
import { useEffect } from 'react';
import type { Product, Retailer, Review } from '@/types/domain';
import { useCookieStore } from '@/lib/cookie-storage';
import Header from '@/components/header';
import { Footer } from '@/components/footer';

interface MenuPageClientProps {
  brandId: string;
  initialProducts: Product[];
  initialLocations: Retailer[];
  initialIsDemo: boolean;
  initialReviews: Review[];
  featuredProducts: Product[];
}

/**
 * This client component receives server-fetched data and handles all interactivity.
 */
export default function MenuPageClient({
  brandId,
  initialProducts,
  initialLocations,
  initialIsDemo,
  initialReviews,
  featuredProducts,
}: MenuPageClientProps) {
  const { menuStyle, setIsDemo } = useCookieStore();
  const hydrated = useHydrated();

  // Set the initial demo state from the server render, but only once.
  useEffect(() => {
    setIsDemo(initialIsDemo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIsDemo]);


  // isLoading is true until the component has hydrated on the client.
  const isLoading = !hydrated;

  // The client just renders what it receives from the server.
  const products = initialProducts;
  const locations = initialLocations;

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
    return <TiledMenuPage products={products} locations={locations} isLoading={false} brandId={brandId} />;
  }
  
  // Render default grid layout
  return (
    <div className="min-h-screen bg-background flex flex-col">
       <Header />
       <main className="flex-1">
        <div className="container mx-auto px-4 space-y-12">
          <HeroSlider products={featuredProducts} isLoading={false} />
          <DispensaryLocator locations={locations} isLoading={false}/>
          <ProductGrid products={products} isLoading={false} />
          <RecentReviewsFeed reviews={initialReviews} products={products} isLoading={false} />
        </div>
      </main>
      <FloatingCartPill />
      <Chatbot products={featuredProducts} brandId={brandId} />
      <Footer />
    </div>
  );
}
