'use client';

import { useMenuData } from '@/hooks/use-menu-data';
import { ProductCard } from './product-card';
import { type Product } from '@/lib/types';

export function ProductGrid() {
  const { products, isLoading } = useMenuData();
  
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products?.map((product: Product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
