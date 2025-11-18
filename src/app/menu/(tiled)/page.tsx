'use client';

import Chatbot from '@/components/chatbot';
import DispensaryLocator from '@/components/dispensary-locator';
import { FloatingCartPill } from '@/components/floating-cart-pill';
import { ProductGrid } from '@/components/product-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { useHydrated } from '@/hooks/use-hydrated';
import { useMenuData } from '@/app/menu/menu-layout-client';


export default function TiledMenuPageContents() {
  const hydrated = useHydrated();
  const { products, locations, brandId } = useMenuData();

  const isLoading = !hydrated;

  if (isLoading) {
    return (
        <div className="container mx-auto px-4 space-y-12 py-8">
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
          <DispensaryLocator locations={locations} isLoading={isLoading} />
          <ProductGrid products={products} isLoading={isLoading} />
        </div>
      <FloatingCartPill />
      <Chatbot products={products} brandId={brandId} />
    </>
  );
}
