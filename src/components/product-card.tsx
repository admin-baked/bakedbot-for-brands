'use client';

import { useCart } from '@/hooks/use-cart';
import { useStore } from '@/hooks/use-store';
import { ShoppingCart, Plus } from 'lucide-react';
import type { Product } from '@/lib/types';
import Image from 'next/image';
import { Button } from './ui/button';
import { useMemo } from 'react';

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { selectedLocationId } = useStore();
  
  const handleAddToCart = () => {
    if (!selectedLocationId) {
      alert('Please select a location first');
      return;
    }
    addToCart(product, selectedLocationId);
  };

  const priceDisplay = useMemo(() => {
    const hasPricing = product.prices && Object.keys(product.prices).length > 0;
    
    if (selectedLocationId && hasPricing && product.prices[selectedLocationId]) {
        return `$${product.prices[selectedLocationId].toFixed(2)}`;
    }
    
    if (!selectedLocationId && hasPricing) {
        const priceValues = Object.values(product.prices);
        const minPrice = Math.min(...priceValues);
        const maxPrice = Math.max(...priceValues);

        if (minPrice === maxPrice) {
            return `$${minPrice.toFixed(2)}`;
        }
        return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
    }
    
    return `$${product.price.toFixed(2)}`;
  }, [product, selectedLocationId]);
  
  const canAddToCart = !!selectedLocationId;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {/* Image */}
      <div className="relative h-48 bg-gray-200 flex items-center justify-center">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} layout="fill" className="object-cover" data-ai-hint={product.imageHint} />
        ) : (
          <span className="text-gray-400">No image</span>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        {product.category && (
          <span className="text-xs text-primary font-semibold uppercase">{product.category}</span>
        )}
        <h3 className="text-lg font-bold mt-1 mb-2">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-primary">{priceDisplay}</span>
          <Button
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
