
'use client';

import { useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { PenSquare, Plus, ArrowRight, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import CartSidebar from '@/app/menu/components/cart-sidebar';
import { type Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Chatbot from '@/components/chatbot';
import { useMenuData } from '@/hooks/use-menu-data';
import { useStore } from '@/hooks/use-store';
import Header from '@/app/menu/components/header';
import { FloatingCartPill } from '@/app/menu/components/floating-cart-pill';

const HeroSliderSkeleton = () => (
    <div className="relative h-64 md:h-80 w-full rounded-lg overflow-hidden mb-12 bg-muted">
        <Skeleton className="h-full w-full" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-5 w-1/2" />
        </div>
    </div>
);

// Dynamically import HeroSlider only on the client side.
const HeroSlider = dynamic(() => import('@/app/menu/components/hero-slider'), {
    ssr: false,
    loading: () => <HeroSliderSkeleton />,
});

const SKELETON_CATEGORIES = ['Edibles', 'Flower', 'Vapes'];

const ProductCard = ({ product, layout = 'default' }: { product: Product, layout?: 'default' | 'alt' }) => {
    const { addToCart } = useCart();
    const { selectedLocationId } = useStore();
    
    const priceDisplay = useMemo(() => {
        const hasPricing = product.prices && Object.keys(product.prices).length > 0;
        
        // If a location is selected, show its specific price.
        if (selectedLocationId && hasPricing && product.prices[selectedLocationId]) {
            return `$${product.prices[selectedLocationId].toFixed(2)}`;
        }
        
        // If no location is selected but there are multiple prices, show a range.
        if (!selectedLocationId && hasPricing) {
            const priceValues = Object.values(product.prices);
            const minPrice = Math.min(...priceValues);
            const maxPrice = Math.max(...priceValues);

            if (minPrice === maxPrice) {
                return `$${minPrice.toFixed(2)}`;
            }
            return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
        }
        
        // Fallback to the base price if no other conditions are met.
        return `$${product.price.toFixed(2)}`;
    }, [product, selectedLocationId]);

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product, selectedLocationId);
    };
    
    const canAddToCart = !!selectedLocationId;

    if (layout === 'alt') {
        return (
            <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow border-none flex flex-col w-full group">
                <Link href={`/products/${product.id}`} className="flex flex-col flex-1">
                    <CardHeader className="p-0">
                        <div className="relative aspect-square w-full">
                            <Image src={product.imageUrl} alt={product.name} layout="fill" objectFit="cover" data-ai-hint={product.imageHint} />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 bg-card flex-1">
                        <CardTitle className="text-base truncate font-semibold">{product.name}</CardTitle>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3 text-green-500" />
                                <span>{product.likes}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <ThumbsDown className="h-3 w-3 text-red-500" />
                                <span>{product.dislikes}</span>
                            </div>
                        </div>
                    </CardContent>
                </Link>
                <CardFooter className="flex justify-between items-center p-4 pt-0 bg-card">
                    <span className="text-lg font-bold">{priceDisplay}</span>
                    <Button size="icon" onClick={handleAddToCart} disabled={!canAddToCart}>
                        <Plus className="h-4 w-4"/>
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow border-none flex flex-col w-full">
            <Link href={`/products/${product.id}`} className="flex flex-col flex-1">
                <CardHeader className="p-0">
                    <div className="relative aspect-square w-full">
                        <Image src={product.imageUrl} alt={product.name} layout="fill" objectFit="cover" data-ai-hint={product.imageHint} />
                    </div>
                </CardHeader>
                <CardContent className="p-4 bg-card flex-1">
                    <Badge variant="secondary">{product.category}</Badge>
                    <CardTitle className="mt-2 text-lg truncate font-semibold">{product.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">AVAILABLE AT 3 LOCATIONS</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3 text-green-500" />
                            <span>{product.likes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <ThumbsDown className="h-3 w-3 text-red-500" />
                            <span>{product.dislikes}</span>
                        </div>
                    </div>
                </CardContent>
            </Link>
            <CardFooter className="flex justify-between items-center p-4 pt-0 bg-card">
                <span className="text-xl font-bold">{priceDisplay}</span>
                <Button size="icon" onClick={handleAddToCart} disabled={!canAddToCart}>
                    <Plus className="h-4 w-4"/>
                </Button>
            </CardFooter>
        </Card>
    )
}

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

const groupProductsByCategory = (products: Product[]) => {
    return products.reduce((acc, product) => {
        const { category } = product;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(product);
        return acc;
    }, {} as Record<string, Product[]>);
}

const DefaultLayout = ({ products, groupedProducts, categories, showSkeletons }: { products: Product[], groupedProducts: Record<string, Product[]>, categories: string[], showSkeletons: boolean }) => (
    <>
        <HeroSlider products={products} />
        <div className="text-center mb-12">
            <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4 text-center">Browse the Menu</h2>
            <p className="text-muted-foreground mb-4">Select a dispensary on the homepage to enable pricing and add to cart.</p>
            <Button variant="outline" asChild>
                <Link href="/leave-a-review">
                    <PenSquare className="mr-2 h-4 w-4" />
                    Have Feedback? Leave a Review
                </Link>
            </Button>
        </div>
        <div className="space-y-12">
            {showSkeletons ? (
                <>
                    {SKELETON_CATEGORIES.map(category => (
                        <section key={category}>
                            <h2 className="text-3xl font-bold font-teko tracking-wider uppercase mb-6">
                                <Skeleton className="h-8 w-1/4" />
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                                {Array.from({ length: 5 }).map((_, i) => <ProductSkeleton key={i} />)}
                            </div>
                        </section>
                    ))}
                </>
            ) : (
                categories.map(category => (
                    <section key={category}>
                        <h2 className="text-3xl font-bold font-teko tracking-wider uppercase mb-6">
                            {category}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                            {groupedProducts[category].map(product => (
                                <ProductCard key={product.id} product={product} layout="default"/>
                            ))}
                        </div>
                    </section>
                ))
            )}
        </div>
    </>
);

const AltLayout = ({ products, groupedProducts, categories, showSkeletons }: { products: Product[], groupedProducts: Record<string, Product[]>, categories: string[], showSkeletons: boolean }) => {
    const featuredProduct = products ? products.find(p => p.id === '5') : null;
    return (
        <>
             <div className="text-center mb-12">
                <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4 text-center">Browse the Menu</h2>
                <p className="text-muted-foreground mb-4">Select a dispensary on the homepage to enable pricing and add to cart.</p>
                <Button variant="outline" asChild>
                    <Link href="/leave-a-review">
                        <PenSquare className="mr-2 h-4 w-4" />
                        Have Feedback? Leave a Review
                    </Link>
                </Button>
            </div>
            
            <div className="space-y-12">
                {showSkeletons ? (
                    <>
                        {SKELETON_CATEGORIES.map(category => (
                            <section key={category}>
                                <h2 className="text-3xl font-bold font-teko tracking-wider uppercase mb-6">
                                    <Skeleton className="h-8 w-1/4" />
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)}
                                </div>
                            </section>
                        ))}
                    </>
                ) : (
                    categories.map(category => (
                        <section key={category}>
                            <h2 className="text-3xl font-bold font-teko tracking-wider uppercase mb-6">
                                {category}
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {groupedProducts[category]?.map(product => (
                                    <ProductCard key={product.id} product={product} layout="alt" />
                                ))}
                            </div>
                        </section>
                    ))
                )}
            </div>
        </>
    );
};

export default function MenuPage() {
    const { products, isLoading, isHydrated } = useMenuData();
    const { menuStyle, selectedLocationId } = useStore();
    const { updateItemPrices } = useCart();
    
    useEffect(() => {
        if (products) {
            updateItemPrices(selectedLocationId, products);
        }
    }, [selectedLocationId, products, updateItemPrices]);
    
    const groupedProducts = useMemo(() => {
        return products ? groupProductsByCategory(products) : {};
    }, [products]);

    const categories = Object.keys(groupedProducts);
    const showSkeletons = (isLoading || !isHydrated) && (!products || products.length === 0);

    const LayoutComponent = menuStyle === 'alt' ? AltLayout : DefaultLayout;

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-8">
                 <LayoutComponent products={products || []} groupedProducts={groupedProducts} categories={categories} showSkeletons={showSkeletons} />
            </main>
            <CartSidebar />
            <FloatingCartPill />
            <Chatbot />
        </div>
    );
}
