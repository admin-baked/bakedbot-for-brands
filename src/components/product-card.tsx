'use client';

import { useCart } from '@/hooks/use-cart';
import { useStore } from '@/hooks/use-store';
import { ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { Button } from './ui/button';

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { selectedLocationId } = useStore();
  
  const handleAddToCart = () => {
    if (!selectedLocationId) {
      // Find the locator section and scroll to it
      const locator = document.getElementById('locator');
      if (locator) {
        locator.scrollIntoView({ behavior: 'smooth' });
        alert('Please select a dispensary location first.');
      } else {
        alert('Please select a dispensary location at the top of the page.');
      }
      return;
    }
    
    addToCart(product, selectedLocationId);
  };
  
  return (
    <div className="bg-card text-card-foreground rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col group border">
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
        
        <div className="flex items-center justify-between mt-auto pt-3 border-t">
          <span className="text-2xl font-bold text-primary">
            ${product.price.toFixed(2)}
          </span>
          <Button
            onClick={handleAddToCart}
            disabled={!selectedLocationId}
            variant={selectedLocationId ? 'default' : 'secondary'}
            title={!selectedLocationId ? 'Select a location first' : 'Add to cart'}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Add</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
