
'use client';

import { useCart } from '@/hooks/use-cart';
import { useStore } from '@/hooks/use-store';
import { ShoppingCart } from 'lucide-react';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  category?: string;
}

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { selectedLocationId } = useStore();
  
  const handleAddToCart = () => {
    if (!selectedLocationId) {
      alert('Please select a location first');
      return;
    }
    
    console.log('🛒 Adding to cart:', product.name);
    // @ts-ignore
    addToCart({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      locationId: selectedLocationId,
    });
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-green-100 to-green-200">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            onError={(e) => {
              // Hide image if it fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-6xl">🌿</div>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Category Badge */}
        {product.category && (
          <span className="inline-block px-2 py-1 text-xs font-semibold text-green-600 bg-green-100 rounded-full w-fit mb-2">
            {product.category}
          </span>
        )}
        
        {/* Name */}
        <h3 className="text-lg font-bold mb-2 line-clamp-2">{product.name}</h3>
        
        {/* Description */}
        {product.description && (
          <p className="text-sm text-gray-600 mb-3 flex-1 line-clamp-2">
            {product.description}
          </p>
        )}
        
        {/* Price and Button */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t">
          <span className="text-2xl font-bold text-green-600">
            ${product.price.toFixed(2)}
          </span>
          <button
            onClick={handleAddToCart}
            disabled={!selectedLocationId}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              selectedLocationId
                ? 'bg-green-600 text-white hover:bg-green-700 hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={!selectedLocationId ? 'Select a location first' : 'Add to cart'}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}

