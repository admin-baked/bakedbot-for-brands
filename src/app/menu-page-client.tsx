'use client';

import { useStore } from '@/hooks/use-store';
import { Skeleton } from '@/components/ui/skeleton';
import { useMenuData } from '@/hooks/use-menu-data';
import TiledMenuPage from './menu/tiled/page';
import { HeroSlider } from '@/components/hero-slider';
import { DispensaryLocator } from '@/components/dispensary-locator';
import { ProductGrid } from '@/components/product-grid';
import RecentReviewsFeed from './components/recent-reviews-feed';
import Header from '@/app/components/header';
import { Footer } from './components/footer';
import { FloatingCartPill } from './components/floating-cart-pill';
import Chatbot from '@/components/chatbot';

/**
 * This is the primary client component for the main application page.
 * It is now self-contained and handles its own data fetching and rendering logic.
 */
export default function MenuPageClient() {
  const { menuStyle } = useStore();
  
  // The useMenuData hook is now simplified and fetches its own data on the client.
  const { products, locations, isLoading } = useMenuData();

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
  
  if (menuStyle === 'alt') {
    return <TiledMenuPage />;
  }
  
  // Default Menu Layout
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 space-y-12">
          <HeroSlider products={products} isLoading={isLoading} />
          <DispensaryLocator />
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
