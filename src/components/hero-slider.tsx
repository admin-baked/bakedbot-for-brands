
'use client';

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';
import { type Product } from '@/types/domain';
import { Button } from './ui/button';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';

interface HeroSliderProps {
    products: Product[];
    isLoading: boolean;
}

export function HeroSlider({ products, isLoading }: HeroSliderProps) {

    if (isLoading) {
        return <Skeleton className="w-full h-80 rounded-lg mb-12" />;
    }

    if (!products || products.length === 0) {
        return null;
    }

    return (
        <div className="w-full rounded-lg overflow-hidden mb-12">
        <Carousel
            plugins={[ Autoplay({ delay: 5000, stopOnInteraction: true }) ]}
            className="w-full"
            opts={{ loop: true }}
        >
            <CarouselContent>
                {products.map((product, index) => (
                    <CarouselItem key={product.id}>
                        <div className="relative h-64 md:h-80 w-full">
                            <Image
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                className="object-cover brightness-75"
                                priority={index === 0}
                                placeholder="blur"
                                blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
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
                                    <Link href={`/menu/${product.brandId || 'default'}/products/${product.id}`}>
                                        Shop Now
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10" />
            <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10" />
        </Carousel>
        </div>
    );
}
