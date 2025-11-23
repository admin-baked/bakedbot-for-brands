
// src/components/demo-menu-page.tsx
'use client';

import { ProductGrid } from '@/components/product-grid';
import { demoProducts, demoRetailers } from '@/lib/demo/demo-data';
import DispensaryLocator from './dispensary-locator';
import { FloatingCartPill } from './floating-cart-pill';
import Chatbot from './chatbot';

type DemoMenuPageProps = {
  brandId?: string;
};

export function DemoMenuPage({ brandId = 'default' }: DemoMenuPageProps) {
  
  return (
    <>
    <main className="max-w-6xl mx-auto px-4 py-10 space-y-10">
      <DispensaryLocator locations={demoRetailers} />
      <ProductGrid products={demoProducts} isLoading={false} />
    </main>
    <FloatingCartPill />
    <Chatbot products={demoProducts} brandId={brandId} />
    </>
  );
}
