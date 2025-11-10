'use client';

import { useMenuData } from '@/hooks/use-menu-data';
import { ProductCard } from './product-card';
import { type Product } from '@/lib/types';
import { Skeleton } from './ui/skeleton';

const ProductSkeleton = () => (
    <Card className="overflow-hidden shadow-md flex flex-col">
        <Skeleton className="aspect-square w-full" />
        <CardContent className="p-4 flex-1 space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between items-center">
            <Skeleton className="h-7 w-1/4" />
            <Skeleton className="h-10 w-10 rounded-md" />
        </CardFooter>
    </Card>
)

export function ProductGrid() {
  const { products, isLoading, isHydrated } = useMenuData();

  const showSkeletons = isLoading || !isHydrated;
  
  if (showSkeletons) {
    return (
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)}
      </div>
    );
  }
  
  if (!products || products.length === 0) {
      return <p className="text-center text-muted-foreground">No products found. Please check back later.</p>
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product: Product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
