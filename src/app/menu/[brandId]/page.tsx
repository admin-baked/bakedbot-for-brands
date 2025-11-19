
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { HeroSlider } from '@/components/hero-slider';
import DispensaryLocator from '@/components/dispensary-locator';
import { ProductGrid } from '@/components/product-grid';
import RecentReviewsFeed from '@/components/recent-reviews-feed';
import { FloatingCartPill } from '@/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';
import { useHydrated } from '@/hooks/use-hydrated';
import { useMenuData } from '@/app/menu/menu-layout-client';
import { useStore } from '@/hooks/use-store';
import { ProductCarousel } from '@/components/product-carousel';

function TiledMenuPageContents() {
  const { products, featuredProducts, reviews, brandId, locations } = useMenuData();
  const hydrated = useHydrated();
  const isLoading = !hydrated;

  const productCategories = products.reduce((acc, product) => {
    const category = product.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, typeof products>);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 space-y-12 py-8">
        <Skeleton className="w-full h-80 rounded-lg" />
        <Skeleton className="w-full h-48 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 space-y-12 py-8">
        <HeroSlider products={featuredProducts} isLoading={isLoading} />
        <DispensaryLocator locations={locations} isLoading={isLoading} />

        <div className="space-y-12">
            {Object.entries(productCategories).map(([category, products]) => (
                <ProductCarousel key={category} title={category} products={products} isLoading={isLoading} />
            ))}
        </div>
        
        <RecentReviewsFeed reviews={reviews} products={products} isLoading={isLoading} />
      </div>
      <FloatingCartPill />
      <Chatbot products={featuredProducts} brandId={brandId} />
    </>
  );
}


export default function MenuPageContents() {
  const hydrated = useHydrated();
  const { products, locations, reviews, featuredProducts, brandId } = useMenuData();
  const { menuStyle } = useStore();

  const isLoading = !hydrated;

  // Render tiled layout if selected
  if (hydrated && menuStyle === 'alt') {
    return (
        <TiledMenuPageContents />
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 space-y-12 py-8">
        <Skeleton className="w-full h-80 rounded-lg" />
        <Skeleton className="w-full h-48 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="container mx-auto px-4 space-y-12 py-8">
        <HeroSlider products={featuredProducts} isLoading={isLoading} />
        <DispensaryLocator locations={locations} isLoading={isLoading}/>
        <ProductGrid products={products} isLoading={isLoading} />
        <RecentReviewsFeed reviews={reviews} products={products} isLoading={isLoading} />
      </div>
      <FloatingCartPill />
      <Chatbot products={featuredProducts} brandId={brandId} />
    </>
  );
}
