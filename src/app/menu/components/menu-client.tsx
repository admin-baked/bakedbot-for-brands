

'use client';

import { useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { PenSquare, Plus, ArrowRight, ThumbsUp, ThumbsDown, MapPin } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import CartSidebar from './cart-sidebar';
import { type Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Chatbot from '@/components/chatbot';
import { useMenuData } from '@/hooks/use-menu-data';
import { useStore } from '@/hooks/use-store';
import Header from './header';
import { FloatingCartPill } from './floating-cart-pill';

const DispensaryLocator = dynamic(() => import('./dispensary-locator'), {
    ssr: false,
    loading: () => <DispensaryLocatorSkeleton />,
});

const HeroSliderSkeleton = () => (
    <div className="relative h-64 md:h-80 w-full rounded-lg overflow-hidden mb-12 bg-muted">
        <Skeleton className="h-full w-full" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-5 w-1/2" />
        </div>
    </div>
);

const DispensaryLocatorSkeleton = () => (
     <div className="mb-12">
        <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4 text-center">Find a Dispensary Near You</h2>
        <div className="grid md:grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            <Card><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            <Card><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
        </div>
    </div>
)

// Dynamically import HeroSlider only on the client side.
const HeroSlider = dynamic(() => import('./hero-slider'), {
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
        <DispensaryLocator />
        <div className="text-center mb-12">
            <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4 text-center">2. Browse the Menu</h2>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                <Card className="lg:col-span-2 relative overflow-hidden rounded-2xl shadow-lg flex items-end text-white bg-gray-900">
                     <Image src="https://picsum.photos/seed/menu-hero-main/1200/800" alt="Featured product" layout="fill" objectFit="cover" data-ai-hint="cannabis lifestyle product" className="opacity-50" />
                     <div className="relative p-8">
                        <Badge variant="secondary">Featured</Badge>
                        <h2 className="text-4xl font-bold mt-2">{featuredProduct?.name ?? "Nebula Nugs"}</h2>
                        <p className="mt-2 max-w-lg text-white/80">{featuredProduct?.description ?? "Dense, trichome-covered nugs with a sweet and pungent aroma. A premium flower for the discerning connoisseur."}</p>
                        <Button size="lg" className="mt-6" asChild>
                            <Link href={featuredProduct ? `/products/${featuredProduct.id}` : '/menu'}>
                                Learn More <ArrowRight className="ml-2"/>
                            </Link>
                        </Button>
                     </div>
                </Card>
                <div className="flex flex-col gap-6">
                    <Card className="flex-1 flex flex-col justify-center items-center text-center p-6 rounded-2xl shadow-lg">
                       <MapPin className="h-10 w-10 text-primary mb-2" />
                       <CardTitle>Find a Dispensary</CardTitle>
                       <CardDescription className="mt-1">Locate our partner dispensaries near you.</CardDescription>
                       <Button asChild className="mt-4 w-full">
                         <Link href="/product-locator">Find Now</Link>
                       </Button>
                    </Card>
                    <Card className="flex-1 flex flex-col justify-center items-center text-center p-6 rounded-2xl shadow-lg">
                       <PenSquare className="h-10 w-10 text-primary mb-2" />
                       <CardTitle>Leave a Review</CardTitle>
                       <CardDescription className="mt-1">Share your experience and help the community.</CardDescription>
                       <Button asChild variant="outline" className="mt-4 w-full">
                         <Link href="/leave-a-review">Write a Review</Link>
                       </Button>
                    </Card>
                </div>
            </div>

            <DispensaryLocator />

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

export default function MenuClient() {
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
            <footer className="py-12 bg-foreground text-background">
                <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="font-bold text-lg mb-4 font-teko tracking-wider">BAKEDBOT</h3>
                        <p className="text-sm text-muted-foreground">Your AI-powered cannabis co-pilot.</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-4 font-teko tracking-wider">SHOP</h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/menu" className="text-muted-foreground hover:text-primary">Edibles</Link></li>
                            <li><Link href="/menu" className="text-muted-foreground hover:text-primary">Flower</Link></li>
                            <li><Link href="/menu" className="text-muted-foreground hover:text-primary">Vapes</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-4 font-teko tracking-wider">ABOUT</h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/menu" className="text-muted-foreground hover:text-primary">Our Story</Link></li>
                            <li><Link href="/menu" className="text-muted-foreground hover:text-primary">FAQ</Link></li>
                            <li><Link href="/brand-login" className="text-muted-foreground hover:text-primary">Brand Login</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-4 font-teko tracking-wider">CONTACT</h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/menu" className="text-muted-foreground hover:text-primary">Contact Us</Link></li>
                            <li><Link href="/menu" className="text-muted-foreground hover:text-primary">Careers</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="container mx-auto mt-8 pt-8 border-t border-muted-foreground/20 text-center text-muted-foreground text-sm">
                    <p>&copy; 2024 BakedBot. All rights reserved.</p>
                </div>
            </footer>
            <CartSidebar />
            <FloatingCartPill />
            <Chatbot />
        </div>
    );
}
