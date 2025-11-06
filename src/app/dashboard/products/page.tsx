
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useStore } from '@/hooks/use-store';
import { products } from '@/lib/data';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

const ProductCard = ({ product }: { product: typeof products[0] }) => (
    <Card>
      <CardHeader className="p-4">
        <div className="aspect-square relative w-full overflow-hidden rounded-md">
           <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            data-ai-hint={product.imageHint}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <CardTitle className="text-lg truncate">{product.name}</CardTitle>
        <CardDescription>
            <Badge variant="secondary" className="mt-1">{product.category}</Badge>
        </CardDescription>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{product.description}</p>
      </CardContent>
      <CardFooter className="flex justify-between p-4 pt-0">
        <p className="text-lg font-bold">${product.price.toFixed(2)}</p>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-green-500">
                <ThumbsUp className="h-4 w-4" />
                <span className="text-sm font-medium">{product.likes || 0}</span>
            </div>
             <div className="flex items-center gap-1 text-red-500">
                <ThumbsDown className="h-4 w-4" />
                <span className="text-sm font-medium">{product.dislikes || 0}</span>
            </div>
        </div>
      </CardFooter>
    </Card>
);

export default function ProductsPage() {
  const { isDemoMode } = useStore();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">
          {isDemoMode
            ? 'Showing demo products. Turn off Demo Mode to manage your own catalog.'
            : 'Manage your product catalog, view inventory, and edit details.'}
        </p>
      </div>

      {isDemoMode ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map(product => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
      ) : (
        <Card className="flex h-96 flex-col items-center justify-center border-dashed">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle>No Products Found</CardTitle>
                <CardDescription>
                    Enable Demo Mode from the Admin Controls page to see sample products, or import your own in Settings.
                </CardDescription>
            </CardHeader>
        </Card>
      )}
    </div>
  );
}
