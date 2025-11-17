
'use client';

// This component represents the "Tiled" or "Alternate" menu layout.
// For now, it uses the same core components as the default menu,
// but it can be customized with a different structure in the future.

import Header from '@/app/components/header';
import { Footer } from '@/app/menu/components/footer';
import Chatbot from '@/components/chatbot';
import { DispensaryLocator } from '@/components/dispensary-locator';
import { FloatingCartPill } from '@/app/components/floating-cart-pill';
import { ProductGrid } from '@/components/product-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { useMenuData } from '@/hooks/use-menu-data';

export default function TiledMenuPage() {
  const { products, isLoading } = useMenuData();

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
          <DispensaryLocator />
          <ProductGrid products={products} isLoading={false} />
        </div>
      </main>
      <FloatingCartPill />
      <Chatbot />
      <Footer />
    </div>
  );
}
