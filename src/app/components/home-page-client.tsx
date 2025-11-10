'use client';

import { HeroSlider } from '@/components/hero-slider';
import { DispensaryLocator } from '@/components/dispensary-locator';
import { ProductGrid } from '@/components/product-grid';
import { useMenuData } from '@/hooks/use-menu-data';
import Header from '@/app/components/header';
import { FloatingCartPill } from './floating-cart-pill';

export function HomePageClient() {
  const { products, isLoading } = useMenuData();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4">
        <HeroSlider products={products} />
        <DispensaryLocator />
        <div className="py-12">
          <h2 className="text-3xl font-bold font-teko tracking-wider uppercase mb-8 text-center">
            Browse the Menu
          </h2>
          <ProductGrid />
        </div>
      </main>
      <FloatingCartPill />
    </div>
  );
}
