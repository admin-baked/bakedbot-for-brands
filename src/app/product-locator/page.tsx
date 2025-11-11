'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Header from '@/app/components/header';
import { FloatingCartPill } from '@/app/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';
import { DispensaryLocator } from '@/components/dispensary-locator';
import { Footer } from '../components/footer';

export default function ProductLocatorPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <DispensaryLocator />
      </main>
      <FloatingCartPill />
      <Chatbot />
      <Footer />
    </div>
  );
}
