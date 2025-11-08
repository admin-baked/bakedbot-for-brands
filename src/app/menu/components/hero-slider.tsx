
'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useEmblaCarousel } from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { AnimatePresence, motion } from 'framer-motion';

import { useMenuData } from '@/hooks/use-menu-data';
import { type Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

const HeroSliderSkeleton = () => (
    <div className="relative h-64 md:h-80 w-full rounded-lg overflow-hidden mb-12 bg-muted">
        <Skeleton className="h-full w-full" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-5 w-1/2" />
        </div>
    </div>
);

export default function HeroSlider() {
    const { products, isLoading, isHydrated } = useMenuData();
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000 })]);
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    React.useEffect(() => {
        if (!emblaApi) return;
        const onSelect = () => {
            setSelectedIndex(emblaApi.selectedScrollSnap());
        };
        emblaApi.on('select', onSelect);
        return () => { emblaApi.off('select', onSelect) };
    }, [emblaApi]);

    const featuredProducts = React.useMemo(() => {
        return products ? products.slice(0, 5) : [];
    }, [products]);

    if (isLoading || !isHydrated) {
        return <HeroSliderSkeleton />;
    }

    return (
        <div className="relative h-64 md:h-80 w-full rounded-lg overflow-hidden mb-12" ref={emblaRef}>
            <div className="h-full w-full flex">
                {featuredProducts.map((product, index) => (
                    <div key={product.id} className="relative flex-[0_0_100%] h-full w-full">
                        <Image
                            src={product.imageUrl}
                            alt={product.name}
                            layout="fill"
                            objectFit="cover"
                            data-ai-hint={product.imageHint}
                            className="brightness-75"
                            priority={index === 0}
                        />
                    </div>
                ))}
            </div>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <AnimatePresence mode="wait">
                    {featuredProducts.map((product, index) => (
                        selectedIndex === index && (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5, ease: 'easeInOut' }}
                                className="w-full"
                            >
                                <Badge variant="secondary" className="text-sm">Featured Product</Badge>
                                <h1 className="text-5xl md:text-7xl text-white font-teko tracking-widest uppercase mt-2 animate-fade-in-out">
                                    {product.name}
                                </h1>
                                <p className="text-white/80 mt-2 max-w-2xl mx-auto animate-fade-in-out [animation-delay:100ms]">
                                    {product.category}
                                </p>
                                <Button asChild size="lg" className="mt-6">
                                    <Link href={`/products/${product.id}`}>
                                        View Product <ArrowRight className="ml-2" />
                                    </Link>
                                </Button>
                            </motion.div>
                        )
                    ))}
                </AnimatePresence>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {featuredProducts.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => emblaApi?.scrollTo(index)}
                        className={cn(
                            "h-2 w-2 rounded-full bg-white/50 transition-all",
                            selectedIndex === index ? "w-6 bg-white" : "hover:bg-white/75"
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
