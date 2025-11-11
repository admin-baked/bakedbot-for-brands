
'use client';

import Header from '@/app/components/header';
import { HeroSlider } from '@/components/hero-slider';
import { DispensaryLocator } from '@/components/dispensary-locator';
import { ProductGrid } from '@/components/product-grid';
import { FloatingCartPill } from '@/app/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';
import { useMenuData } from '@/hooks/use-menu-data';
import { useStore } from '@/hooks/use-store';
import { useEffect } from 'react';

export default function MenuPage({ initialDemo }: { initialDemo: boolean }) {
  const { setIsUsingDemoData } = useStore();

  // Sync the Zustand store with the server-determined initial state
  useEffect(() => {
    setIsUsingDemoData(initialDemo);
  }, [initialDemo, setIsUsingDemoData]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4">
          <HeroSlider />
          <DispensaryLocator />
          <div className="py-12">
            <h2 className="text-3xl font-bold font-teko tracking-wider uppercase mb-8 text-center">
              Browse the Menu
            </h2>
            <ProductGrid />
          </div>
      </main>
      <FloatingCartPill />
      <Chatbot />
    </div>
  );
}
