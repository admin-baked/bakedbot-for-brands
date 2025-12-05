
'use client';

import { useStore } from '@/hooks/use-store';
import { ShoppingCart, Minus, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import { useMemo } from 'react';
import type { Product } from '@/types/domain';

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, selectedRetailerId, cartItems, updateQuantity, removeFromCart } = useStore();
  const { toast } = useToast();

  const cartItem = cartItems.find(item => item.id === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const priceDisplay = useMemo(() => {
    const prices = product.prices ?? {};
    const hasPricing = Object.keys(prices).length > 0;

    // If a location is selected, show its specific price.
    if (selectedRetailerId && hasPricing && prices[selectedRetailerId]) {
      return `$${prices[selectedRetailerId].toFixed(2)}`;
    }

    // If no location is selected but there are multiple prices, show a range.
    if (!selectedRetailerId && hasPricing) {
      const priceValues = Object.values(prices);
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
  }, [product, selectedRetailerId]);

  const handleAddToCart = () => {
    if (!selectedRetailerId) {
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

    addToCart(product, selectedRetailerId);
    toast({
      title: 'Added to Cart',
      description: `${product.name} has been added to your cart.`,
    });
  };

  return (
    <div data-testid={`product-card-${product.id}`} className="bg-card text-card-foreground rounded-lg overflow-hidden flex flex-col group border">
      <Link href={`/menu/${product.brandId || 'default'}/products/${product.id}`} className="block">
        <div className="relative h-48">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            data-ai-hint={product.imageHint}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {quantity > 0 && (
            <div className="absolute top-2 left-2 z-10 flex items-center bg-background/90 backdrop-blur-sm rounded-full shadow-md border px-1 py-0.5" onClick={(e) => e.preventDefault()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-muted"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (quantity > 1) updateQuantity(product.id, quantity - 1);
                  else removeFromCart(product.id);
                }}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-xs font-bold w-4 text-center tabular-nums">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-muted"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  updateQuantity(product.id, quantity + 1);
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </Link>

      <div className="p-4 flex-1 flex flex-col">
        {product.category && (
          <span className="text-xs font-semibold uppercase text-primary tracking-wider">{product.category}</span>
        )}

        <h3 className="text-lg font-bold mt-1 mb-2 line-clamp-2">
          <Link href={`/menu/${product.brandId || 'default'}/products/${product.id}`} className="hover:underline">
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
            title={!selectedRetailerId ? 'Select a location first' : 'Add to cart'}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
