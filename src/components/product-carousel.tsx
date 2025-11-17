'use client';

import { useStore } from '@/hooks/use-store';
import { Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import { useMemo } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Skeleton } from './ui/skeleton';
import type { Product } from '@/types/domain';

const ProductCarouselCard = ({ product }: { product: Product }) => {
    const { addToCart, selectedRetailerId } = useStore();
    const { toast } = useToast();

    const priceDisplay = useMemo(() => {
        if (selectedRetailerId && product.prices?.[selectedRetailerId]) {
            return `$${product.prices[selectedRetailerId].toFixed(2)}`;
        }
        return `$${product.price.toFixed(2)}`;
    }, [product, selectedRetailerId]);

    const handleAddToCart = () => {
        if (!selectedRetailerId) {
            toast({
                variant: 'destructive',
                title: 'No Location Selected',
                description: 'Please select a dispensary location first.',
            });
            return;
        }
        addToCart(product, selectedRetailerId);
        toast({
            title: 'Added to Cart',
            description: `${product.name} has been added to your cart.`,
        });
    };

    return (
        <div className="bg-card text-card-foreground rounded-lg overflow-hidden flex flex-col group h-full">
            <Link href={`/menu/${product.brandId}/products/${product.id}`} className="block">
                <div className="relative h-40">
                    <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        data-ai-hint={product.imageHint}
                        sizes="(max-width: 768px) 50vw, 33vw"
                    />
                </div>
            </Link>
            
            <div className="p-3 flex-1 flex flex-col">
                <h3 className="text-sm font-semibold mt-1 mb-2 line-clamp-2 leading-tight flex-1">
                    <Link href={`/menu/${product.brandId}/products/${product.id}`} className="hover:underline">
                        {product.name}
                    </Link>
                </h3>
                
                <div className="flex items-center justify-between mt-auto">
                    <span className="text-lg font-bold text-primary">
                        {priceDisplay}
                    </span>
                    <Button
                        onClick={handleAddToCart}
                        size="icon"
                        className="h-8 w-8"
                        title={!selectedRetailerId ? 'Select a location first' : 'Add to cart'}
                        disabled={!selectedRetailerId}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

const ProductCarouselSkeleton = () => (
    <div className="bg-card rounded-lg overflow-hidden border h-full">
      <Skeleton className="h-40 w-full" />
      <div className="p-3 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
);

export function ProductCarousel({ title, products, isLoading }: { title: string, products: Product[], isLoading: boolean }) {
    return (
        <div>
            <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4">{title}</h2>
            <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
                <CarouselContent className="-ml-4">
                    {(isLoading ? [...Array(6)] : products).map((product, index) => (
                        <CarouselItem key={isLoading ? index : product.id} className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                             <div className="h-full">
                                {isLoading || !product ? <ProductCarouselSkeleton /> : <ProductCarouselCard product={product} />}
                             </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="hidden lg:flex" />
                <CarouselNext className="hidden lg:flex" />
            </Carousel>
        </div>
    );
}
