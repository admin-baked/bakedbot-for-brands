
'use client';

import { HeroSlider } from '@/components/hero-slider';
import { DispensaryLocator } from '@/components/dispensary-locator';
import { ProductGrid } from '@/components/product-grid';
import { FloatingCartPill } from '@/app/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';
import Header from '@/app/components/header';
import { Footer } from '@/app/components/footer';
import RecentReviewsFeed from './components/recent-reviews-feed';
import { useMenuData } from '@/hooks/use-menu-data';


export default function MenuPage() {
  const { products, locations, isLoading } = useMenuData();
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
