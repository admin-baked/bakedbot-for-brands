
'use client';

import { HeroSlider } from '@/components/hero-slider';
import DispensaryLocator from '@/components/dispensary-locator';
import { ProductGrid } from '@/app/product-grid';
import { useMenuData } from '@/app/menu/menu-layout-client';
import RecentReviewsFeed from '@/components/recent-reviews-feed';
import { FloatingCartPill } from '@/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';
import { ProductCarousel } from '@/components/product-carousel';
import { useStore } from '@/hooks/use-store';
import { useHydrated } from '@/hooks/use-hydrated';

export default function BrandMenuPage() {
  const { products, locations, reviews, featuredProducts, isDemo, brandId } = useMenuData();
  const { menuStyle } = useStore();
  const hydrated = useHydrated();

  const isLoading = !hydrated;

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {menuStyle === 'alt' ? (
          <div className="space-y-12">
            <HeroSlider products={featuredProducts} isLoading={isLoading} />
            <DispensaryLocator locations={locations} isLoading={isLoading} />
            <ProductCarousel title="Featured Products" products={products} isLoading={isLoading} />
            <RecentReviewsFeed reviews={reviews} products={products} isLoading={isLoading} />
          </div>
        ) : (
          <div className="space-y-12">
            <DispensaryLocator locations={locations} isLoading={isLoading} />
            <ProductGrid products={products} isLoading={isLoading} />
            <RecentReviewsFeed reviews={reviews} products={products} isLoading={isLoading} />
          </div>
        )}
      </main>
      <FloatingCartPill />
      <Chatbot products={products} brandId={brandId} />
    </>
  );
}
