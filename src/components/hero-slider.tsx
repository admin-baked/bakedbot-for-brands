
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';
import { type Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useMenuData } from '@/hooks/use-menu-data';
import { Skeleton } from './ui/skeleton';

export function HeroSlider() {
    const { products, isLoading } = useMenuData();

    if (isLoading) {
        return <Skeleton className="w-full h-80 rounded-lg mb-12" />;
    }

    if (!products || products.length === 0) {
        return null;
    }

    // Get 3 products with the most likes
    const featuredProducts = [...products].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 3);

    return (
        <Carousel
            plugins={[ Autoplay({ delay: 5000, stopOnInteraction: true }) ]}
            className="w-full rounded-lg overflow-hidden mb-12"
            opts={{ loop: true }}
        >
            <CarouselContent>
                {featuredProducts.map((product, index) => (
                    <CarouselItem key={product.id}>
                        <div className="relative h-64 md:h-80 w-full">
                            <Image
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                className="object-cover brightness-75"
                                priority={index === 0}
                                data-ai-hint={product.imageHint}
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 text-white">
                                <h1 className="text-4xl md:text-6xl font-bold font-teko tracking-wider uppercase drop-shadow-lg">
                                    Find Your Bliss
                                </h1>
                                <p className="mt-2 text-lg md:text-xl font-light drop-shadow-md">
                                    Discover our top-rated product: <span className="font-semibold">{product.name}</span>
                                </p>
                                <Button asChild className="mt-6" size="lg">
                                    <Link href={`/products/${product.id}`}>
                                        Shop Now
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2" />
            <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2" />
        </Carousel>
    );
}

    