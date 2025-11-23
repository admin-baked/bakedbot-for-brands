// src/components/demo-menu-page.tsx
'use client';

import { useMenuData } from '@/app/menu/menu-layout-client';
import DispensaryLocator from '@/components/dispensary-locator';
import { ProductGrid } from '@/app/product-grid';
import RecentReviewsFeed from '@/components/recent-reviews-feed';
import { FloatingCartPill } from '@/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';
import { ProductCarousel } from '@/components/product-carousel';
import { HeroSlider } from './hero-slider';

export function DemoMenuPage({ brandId }: { brandId?: string }) {
  const { products, locations, reviews, featuredProducts } = useMenuData();

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-10 space-y-12">
        <HeroSlider products={featuredProducts} isLoading={!products} />
        <DispensaryLocator locations={locations} isLoading={!locations} />
        <ProductGrid products={products} isLoading={!products} />
        <ProductCarousel title="Featured Products" products={featuredProducts} isLoading={!products} />
        <RecentReviewsFeed reviews={reviews} products={products} isLoading={!reviews || !products} />
      </main>
      <FloatingCartPill />
    </>
  );
}
