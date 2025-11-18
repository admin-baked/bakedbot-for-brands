
'use client';

// This component represents the "Tiled" or "Alternate" menu layout.

import Chatbot from '@/components/chatbot';
import DispensaryLocator from '@/components/dispensary-locator';
import { FloatingCartPill } from '@/components/floating-cart-pill';
import { ProductGrid } from '@/components/product-grid';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product, Retailer } from '@/types/domain';


interface TiledMenuPageProps {
    products: Product[];
    locations: Retailer[];
    isLoading: boolean;
    brandId: string;
}

export default function TiledMenuPage({ products, locations, isLoading, brandId }: TiledMenuPageProps) {

  if (isLoading) {
    return (
        <div className="pt-16">
        <main className="container mx-auto px-4 py-8 flex-1">
          <Skeleton className="w-full h-48 rounded-lg mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-96 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="pt-16">
        <div className="container mx-auto px-4 space-y-12 py-8">
          <DispensaryLocator locations={locations} isLoading={isLoading} />
          <ProductGrid products={products} isLoading={isLoading} />
        </div>
      <FloatingCartPill />
      <Chatbot products={products} brandId={brandId} />
    </div>
  );
}
