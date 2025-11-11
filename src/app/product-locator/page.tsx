
'use client';

import Header from '@/app/components/header';
import { FloatingCartPill } from '@/app/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';
import { DispensaryLocator } from '@/components/dispensary-locator';

export default function ProductLocatorPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <DispensaryLocator />
      </main>
      <FloatingCartPill />
      <Chatbot />
    </div>
  );
}
