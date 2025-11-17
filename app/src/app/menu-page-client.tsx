
'use client';

import { useStore } from '@/hooks/use-store';
import { Skeleton } from '@/components/ui/skeleton';
import { useMenuData } from '@/hooks/use-menu-data';
import TiledMenuPage from './menu/tiled/page';
import { HeroSlider } from '@/components/hero-slider';
import { DispensaryLocator } from '@/components/dispensary-locator';
import { ProductGrid } from '@/components/product-grid';
import RecentReviewsFeed from '@/app/components/recent-reviews-feed';
import Header from '@/app/components/header';
import { Footer } from './components/footer';
import { FloatingCartPill } from '@/app/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';
import { useHydrated } from '@/hooks/use-hydrated';

export default function MenuPageClient() {
  const { menuStyle } = useStore();
  const hydrated = useHydrated();
  const { products, locations, isLoading } = useMenuData();

  // Show loading skeleton until hydrated AND data is loaded
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
          <HeroSlider products={products} isLoading={false} />
          <DispensaryLocator />
          <ProductGrid products={products} isLoading={false} />
          <RecentReviewsFeed />
        </div>
      </main>
      <FloatingCartPill />
      <Chatbot />
      <Footer />
    </div>
  );
}
