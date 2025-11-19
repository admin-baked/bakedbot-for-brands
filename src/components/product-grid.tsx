
'use client';

import { ProductCard } from './product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Database } from 'lucide-react';
import Link from 'next/link';
import type { Product } from '@/types/domain';
import { useStore } from '@/hooks/use-store';

const ProductSkeleton = () => (
    <div className="bg-card rounded-lg shadow-lg overflow-hidden border">
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


interface ProductGridProps {
    products: Product[];
    isLoading: boolean;
}

export function ProductGrid({ products, isLoading }: ProductGridProps) {
  const { isDemo } = useStore();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    );
  }
  
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-20 my-8 bg-muted/40 rounded-lg">
        <Database className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No Products Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
            {isDemo 
                ? "There are no products in the demo data set."
                : "Your live product catalog is empty."
            }
        </p>
         <p className="mt-1 text-sm text-muted-foreground">
             {isDemo
                ? "Check your demo data source."
                : <>You can switch to Demo Mode or <Link href="/dashboard/settings#data" className="text-primary underline">import your products</Link> in the dashboard.</>
            }
        </p>
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
