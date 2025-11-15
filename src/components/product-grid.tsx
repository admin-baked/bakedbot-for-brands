
'use client';

import { ProductCard } from './product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMenuData } from '@/hooks/use-menu-data';
import { Database, Plus } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/hooks/use-store';
import { useMemo } from 'react';
import type { Product } from '@/firebase/converters';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

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

const TiledProductRow = ({ product }: { product: Product }) => {
    const { addToCart, selectedLocationId } = useStore();
    const { toast } = useToast();

    const priceDisplay = useMemo(() => {
        if (selectedLocationId && product.prices?.[selectedLocationId]) {
            return `$${product.prices[selectedLocationId].toFixed(2)}`;
        }
        return `$${product.price.toFixed(2)}`;
    }, [product, selectedLocationId]);

    const handleAddToCart = () => {
        if (!selectedLocationId) {
            toast({
                variant: 'destructive',
                title: 'No Location Selected',
                description: 'Please select a dispensary location first.',
            });
            return;
        }
        addToCart(product, selectedLocationId);
        toast({
            title: 'Added to Cart',
            description: `${product.name} has been added to your cart.`,
        });
    };

    return (
        <div className="flex items-center gap-4 py-4">
             <Link href={`/products/${product.id}`} className="block shrink-0">
                <div className="relative h-20 w-20 rounded-md overflow-hidden border">
                    <Image src={product.imageUrl} alt={product.name} fill className="object-cover" data-ai-hint={product.imageHint} />
                </div>
            </Link>
            <div className="flex-1">
                <Link href={`/products/${product.id}`} className="hover:underline">
                    <h4 className="font-semibold">{product.name}</h4>
                </Link>
                <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
            </div>
            <div className="flex items-center gap-4">
                <span className="font-semibold w-20 text-right">{priceDisplay}</span>
                 <Button onClick={handleAddToCart} size="sm" disabled={!selectedLocationId}>
                    <Plus className="h-4 w-4 mr-2" /> Add
                </Button>
            </div>
        </div>
    )
}


export function ProductGrid() {
  const { products, isLoading, isDemo } = useMenuData();
  const { menuStyle } = useStore();

  const categorizedProducts = useMemo(() => {
    if (!products) return {};
    return products.reduce((acc, product) => {
        const category = product.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(product);
        return acc;
    }, {} as Record<string, Product[]>);
  }, [products]);
  
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

  if (menuStyle === 'alt') {
    return (
        <div className="space-y-12">
            {Object.entries(categorizedProducts).map(([category, products]) => (
                <div key={category}>
                    <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4">{category}</h2>
                     <div className="divide-y divide-border rounded-md border">
                        {products.map(product => (
                            <div key={product.id} className="px-4">
                                <TiledProductRow product={product} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
  }
  
  // Default grid layout
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
