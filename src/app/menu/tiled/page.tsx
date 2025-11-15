'use client';
export const dynamic = 'force-dynamic';

import Header from '@/app/components/header';
import { HeroSlider } from '@/components/hero-slider';
import { ProductCarousel } from '@/components/product-carousel';
import { FloatingCartPill } from '@/app/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';
import { Footer } from '@/app/components/footer';
import { useMenuData } from '@/hooks/use-menu-data';
import { useMemo } from 'react';
import type { Product } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const PromoCardLarge = () => (
    <Card className="overflow-hidden md:grid md:grid-cols-2 items-center">
        <CardContent className="p-8 md:p-12">
            <h3 className="text-3xl font-bold font-teko tracking-wider uppercase">Get 5% Back</h3>
            <p className="mt-2 text-muted-foreground">Join our loyalty program and earn points on every purchase. Sign up today and get a bonus offer on your next visit!</p>
            <Button asChild className="mt-6">
                <Link href="/customer-login">Learn More</Link>
            </Button>
        </CardContent>
        <div className="relative h-64 md:h-full">
             <Image src="https://picsum.photos/seed/promo1/800/600" alt="Loyalty Program" fill className="object-cover" data-ai-hint="credit card loyalty"/>
        </div>
    </Card>
);

const PromoCardSmall = () => (
     <Card className="overflow-hidden relative h-80">
         <Image src="https://picsum.photos/seed/promo2/600/800" alt="Special Offer" fill className="object-cover" data-ai-hint="cozy slippers"/>
         <div className="absolute inset-0 bg-black/30" />
         <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-4">
            <h3 className="text-3xl font-bold font-teko tracking-wider uppercase">Slip into comfort</h3>
            <p className="mt-1">New accessories just dropped.</p>
             <Button asChild className="mt-4" variant="secondary">
                <Link href="#">Shop Now</Link>
            </Button>
         </div>
    </Card>
);


export default function TiledMenuPage() {
    const { products, isLoading } = useMenuData();

    const categorizedProducts = useMemo(() => {
        if (!products) return {};
        return products.reduce((acc, product) => {
            const category = product.category || 'Uncategorized';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(product);
            return acc;
        }, {} as Record<string, Product[]>);
    }, [products]);

    // Show top-liked products as flash deals
    const flashDeals = useMemo(() => {
        if (!products) return [];
        return [...products].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 10);
    }, [products]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 space-y-12">
          <HeroSlider />

          <ProductCarousel title="Flash Deals" products={flashDeals} isLoading={isLoading} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                <PromoCardLarge />
            </div>
            <div>
                <PromoCardSmall />
            </div>
          </div>
          
          {Object.entries(categorizedProducts).map(([category, catProducts]) => (
             <ProductCarousel key={category} title={`Trending in ${category}`} products={catProducts} isLoading={isLoading} />
          ))}

        </div>
      </main>
      <FloatingCartPill />
      <Chatbot />
      <Footer />
    </div>
  );
}
