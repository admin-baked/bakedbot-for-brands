import { HeroSlider } from '@/components/hero-slider';
import { DispensaryLocator } from '@/components/dispensary-locator';
import { ProductGrid } from '@/components/product-grid';
import Header from '@/app/components/header';
import { FloatingCartPill } from '@/app/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';

export const metadata = {
  title: 'Menu | BakedBot',
  description: 'Browse our cannabis menu',
};

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <HeroSlider />
        
        {/* Dispensary Locator */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <DispensaryLocator />
          </div>
        </section>
        
        {/* Products */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">BROWSE THE MENU</h2>
            <ProductGrid />
          </div>
        </section>
      </main>
      <FloatingCartPill />
      <Chatbot />
    </div>
  );
}
