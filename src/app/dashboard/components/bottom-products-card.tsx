'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThumbsDown } from 'lucide-react';
import type { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';

interface BottomProductsCardProps {
  products: Product[];
  isLoading: boolean;
}

const ProductItemSkeleton = () => (
    <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-10" />
    </div>
);

export default function BottomProductsCard({ products, isLoading }: BottomProductsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <ThumbsDown className="text-red-500"/> Most Disliked Products
        </CardTitle>
        <CardDescription>Products with the most dislikes. May need review.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
            <div className="space-y-4">
                <ProductItemSkeleton />
                <ProductItemSkeleton />
                <ProductItemSkeleton />
            </div>
        ) : products.length > 0 ? (
          products.map(product => (
            <div key={product.id} className="flex items-center gap-4">
               <div className="relative h-10 w-10 rounded-md overflow-hidden border">
                    <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
               </div>
               <div className="flex-1">
                    <Link href={`/products/${product.id}`} className="text-sm font-medium leading-none hover:underline">
                        {product.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
               </div>
                <div className="flex items-center gap-1 text-sm font-medium text-red-500">
                    <ThumbsDown className="h-4 w-4"/>
                    {product.dislikes || 0}
                </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No product dislike data available yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
