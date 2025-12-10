'use client';

import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Database } from 'lucide-react';
import Link from 'next/link';
import type { Product } from '@/types/domain';
import { useDemoMode } from '@/context/demo-mode';

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
  brandSlug?: string;
  variant?: 'standard' | 'brand';
}

export function ProductGrid({ products, isLoading, brandSlug, variant = 'standard' }: ProductGridProps) {
  const { isDemo } = useDemoMode();

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
            : "This brand's live product catalog appears to be empty."
          }
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {isDemo
            ? "You can import products in the Admin Console."
            : <>Brand managers can add products in the <Link href="/dashboard/products" className="text-primary underline">dashboard</Link>.</>
          }
        </p>
      </div>
    );
  }

  const gridClassName = variant === 'brand'
    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6";

  return (
    <div className={gridClassName}>
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          brandSlug={brandSlug}
          variant={variant === 'brand' ? 'large' : 'standard'}
        />
      ))}
    </div>
  );
}
