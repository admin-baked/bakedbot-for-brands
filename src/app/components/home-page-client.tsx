'use client';

import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PenSquare } from 'lucide-react';
import { useMenuData } from '@/hooks/use-menu-data';
import Header from '@/app/components/header';
import { DispensaryLocator } from '@/components/dispensary-locator';
import { HeroSlider } from '@/components/hero-slider';
import { ProductGrid } from '@/components/product-grid';
import type { Product } from '@/lib/types';

// Dynamically import components that rely heavily on client-side state
const FloatingCartPill = dynamic(() => import('@/app/components/floating-cart-pill').then(mod => mod.FloatingCartPill), {
    ssr: false,
});

const Chatbot = dynamic(() => import('@/components/chatbot'), {
    ssr: false,
});

export default function HomePageClient({ initialProducts }: { initialProducts: Product[] }) {
    const { products, isLoading, isHydrated } = useMenuData(initialProducts);

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-8">
               <HeroSlider products={products || []} />
                <div className="text-center mb-12">
                    <Button variant="outline" asChild>
                        <Link href="/leave-a-review">
                            <PenSquare className="mr-2 h-4 w-4" />
                            Have Feedback? Leave a Review
                        </Link>
                    </Button>
                </div>
                <div id="locator">
                    <DispensaryLocator />
                </div>
                <div className="space-y-12 mt-12">
                   <ProductGrid products={products || []} isLoading={isLoading || !isHydrated} />
                </div>
            </main>
            <FloatingCartPill />
            <Chatbot />
        </div>
    );
}
