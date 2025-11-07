'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useProduct } from '@/firebase/firestore/use-product';
import { useCart } from '@/hooks/use-cart';
import { useMenuData } from '@/hooks/use-menu-data';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ShoppingBag, Plus, Search, User, ThumbsUp, ThumbsDown } from 'lucide-react';
import CartSidebar from '@/app/menu/components/cart-sidebar';
import Chatbot from '@/components/chatbot';

const Header = () => {
    const { toggleCart, getItemCount } = useCart();
    const itemCount = getItemCount();

    return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/menu" className="text-2xl font-bold font-teko tracking-wider">
          BAKEDBOT
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/brand-login">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <div className="relative">
             <Button variant="ghost" size="icon" onClick={toggleCart}>
              <ShoppingBag className="h-5 w-5" />
            </Button>
            {itemCount > 0 && (
                <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 justify-center rounded-full p-0"
                >
                    {itemCount}
                </Badge>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

function ProductPageClient() {
    const params = useParams();
    const { products: allProducts, isLoading: isAllProductsLoading } = useMenuData();
    const { addToCart } = useCart();
    const id = typeof params.id === 'string' ? params.id : '';

    // The useProduct hook could be used here to fetch a single document from Firestore
    // const { data: product, isLoading, error } = useProduct(id);
    
    // For this demo, we'll find the product from the static list for simplicity
    const product = allProducts?.find(p => p.id === id);
    const isLoading = isAllProductsLoading;

    if (isLoading) {
        return <ProductPageSkeleton />;
    }

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20">
                <h1 className="text-2xl font-bold">Product Not Found</h1>
                <p className="text-muted-foreground mt-2">We couldn't find the product you were looking for.</p>
                <Button asChild className="mt-6">
                    <Link href="/menu">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Menu
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start max-w-6xl mx-auto py-8 px-4">
            <div className="relative aspect-square w-full rounded-lg overflow-hidden border">
                <Image
                    src={product.imageUrl}
                    alt={product.name}
                    layout="fill"
                    objectFit="cover"
                    data-ai-hint={product.imageHint}
                />
            </div>

            <div className="space-y-6">
                <Button variant="outline" size="sm" asChild className="w-fit">
                    <Link href="/menu">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Menu
                    </Link>
                </Button>
                
                <div className="space-y-3">
                    <Badge variant="secondary">{product.category}</Badge>
                    <h1 className="text-4xl font-bold font-teko tracking-wider uppercase">{product.name}</h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <ThumbsUp className="h-4 w-4 text-green-500" />
                            <span>{product.likes} Likes</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <ThumbsDown className="h-4 w-4 text-red-500" />
                            <span>{product.dislikes} Dislikes</span>
                        </div>
                    </div>
                    <p className="text-2xl font-bold">${product.price.toFixed(2)}</p>
                </div>
                
                <div className="prose text-muted-foreground">
                    <p>{product.description}</p>
                </div>

                <Button size="lg" className="w-full" onClick={() => addToCart({ ...product, quantity: 1 })}>
                    <Plus className="mr-2 h-5 w-5" />
                    Add to Cart
                </Button>

                 {/* TODO: Add Review Summary Section here */}
            </div>
        </div>
    );
}

function ProductPageSkeleton() {
  return (
    <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start max-w-6xl mx-auto py-8 px-4">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <div className="space-y-6">
        <Skeleton className="h-9 w-32" />
        <div className="space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-8 w-1/4" />
        </div>
        <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}


export default function ProductPage() {
    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main>
                <Suspense fallback={<ProductPageSkeleton />}>
                    <ProductPageClient />
                </Suspense>
            </main>
            <CartSidebar />
            <Chatbot />
        </div>
    )
}
