'use client';

// This component represents the "Tiled" or "Alternate" menu layout.
// It is now a simple presentational component that receives all its data via props.

import Header from '@/components/header';
import { Footer } from '@/components/footer';
import Chatbot from '@/components/chatbot';
import { DispensaryLocator } from '@/components/dispensary-locator';
import { FloatingCartPill } from '@/components/floating-cart-pill';
import { ProductGrid } from '@/components/product-grid';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product, Retailer } from '@/types/domain';

interface TiledMenuPageProps {
  products: Product[];
  locations: Retailer[];
  isLoading: boolean;
}

export default function TiledMenuPage({ products, locations, isLoading }: TiledMenuPageProps) {

  if (isLoading) {
    return (
        <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8 flex-1">
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 space-y-12 py-8">
          <DispensaryLocator locations={locations} isLoading={isLoading} />
          <ProductGrid products={products} isLoading={isLoading} />
        </div>
      </main>
      <FloatingCartPill />
      <Chatbot />
      <Footer />
    </div>
  );
}
