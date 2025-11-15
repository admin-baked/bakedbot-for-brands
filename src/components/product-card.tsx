'use client';

import { useStore } from '@/hooks/use-store';
import { ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/firebase/converters';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, selectedLocationId } = useStore();
  const { toast } = useToast();

  const priceDisplay = useMemo(() => {
    const hasPricing = product.prices && Object.keys(product.prices).length > 0;
    
    // If a location is selected, show its specific price.
    if (selectedLocationId && hasPricing && product.prices[selectedLocationId]) {
        return `$${product.prices[selectedLocationId].toFixed(2)}`;
    }
    
    // If no location is selected but there are multiple prices, show a range.
    if (!selectedLocationId && hasPricing) {
        const priceValues = Object.values(product.prices);
        if (priceValues.length > 0) {
            const minPrice = Math.min(...priceValues);
            const maxPrice = Math.max(...priceValues);

            if (minPrice === maxPrice) {
                return `$${minPrice.toFixed(2)}`;
            }
            return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
        }
    }
    
    // Fallback to the base price if no other conditions are met.
    return `$${product.price.toFixed(2)}`;
  }, [product, selectedLocationId]);

  const handleAddToCart = () => {
    if (!selectedLocationId) {
      const locator = document.getElementById('locator');
      if (locator) {
        locator.scrollIntoView({ behavior: 'smooth' });
        locator.classList.add('animate-pulse', 'ring-2', 'ring-primary', 'rounded-lg');
        setTimeout(() => {
            locator.classList.remove('animate-pulse', 'ring-2', 'ring-primary', 'rounded-lg');
        }, 2000);
      }
      toast({
        variant: 'destructive',
        title: 'No Location Selected',
        description: 'Please select a dispensary location before adding items to your cart.',
      });
      return;
    }
    
    addToCart(product, selectedLocationId);
    toast({
        title: 'Added to Cart',
        description: `${product.name} has been added to your cart.`,
    });
  };
  
  return (
    <div data-testid={`product-card-${product.id}`} className="bg-card text-card-foreground rounded-lg overflow-hidden flex flex-col group border">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative h-48">
            <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                data-ai-hint={product.imageHint}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
        </div>
      </Link>
      
      <div className="p-4 flex-1 flex flex-col">
        {product.category && (
          <span className="text-xs font-semibold uppercase text-primary tracking-wider">{product.category}</span>
        )}
        
        <h3 className="text-lg font-bold mt-1 mb-2 line-clamp-2">
            <Link href={`/products/${product.id}`} className="hover:underline">
             {product.name}
            </Link>
        </h3>
        
        {product.description && (
          <p className="text-sm text-muted-foreground mb-3 flex-1 line-clamp-2">
            {product.description}
          </p>
        )}
        
        <div className="flex items-center justify-between mt-auto">
          <span className="text-xl font-bold">
            {priceDisplay}
          </span>
          <Button
            onClick={handleAddToCart}
            size="sm"
            title={!selectedLocationId ? 'Select a location first' : 'Add to cart'}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
