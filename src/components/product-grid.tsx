'use client';

import { ProductCard } from './product-card';
import type { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const ProductSkeleton = () => (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-6 w-3/4" />
        <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
);


export function ProductGrid({ products, isLoading }: { products: Product[], isLoading: boolean }) {
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    );
  }
  
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">No products available</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
