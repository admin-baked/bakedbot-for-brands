'use client';

import { useCart } from '@/hooks/use-cart';
import { useStore } from '@/hooks/use-store';
import { ShoppingCart } from 'lucide-react';
import type { Product } from '@/lib/types';
import Image from 'next/image';

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
  
  const priceDisplay = (product.prices && selectedLocationId && product.prices[selectedLocationId]) 
    ? product.prices[selectedLocationId] 
    : product.price;

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
          <span className="text-xl font-bold text-primary">${priceDisplay.toFixed(2)}</span>
          <button
            onClick={handleAddToCart}
            disabled={!selectedLocationId}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedLocationId
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
