'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Header from '@/app/components/header';
import { HeroSlider } from '@/components/hero-slider';
import { DispensaryLocator } from '@/components/dispensary-locator';
import { ProductGrid } from '@/components/product-grid';
import { FloatingCartPill } from '@/app/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';
import { Footer } from './components/footer';
import RecentReviewsFeed from './components/recent-reviews-feed';

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-4 flex-1">
        <HeroSlider />
        <DispensaryLocator />
        <RecentReviewsFeed />
        <div className="py-12">
            <h2 className="text-3xl font-bold font-teko tracking-wider uppercase mb-8 text-center">
            Browse the Menu
            </h2>
            <ProductGrid />
        </div>
      </main>
      <FloatingCartPill />
      <Chatbot />
      <Footer />
    </div>
  );
}
