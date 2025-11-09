
'use client';

import { useMemo, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { PenSquare, Plus, Search, ShoppingBag, User, CreditCard, ThumbsUp, ThumbsDown, MapPin, ArrowRight } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import CartSidebar from '@/app/menu/components/cart-sidebar';
import { AnimatePresence, motion } from 'framer-motion';
import DispensaryLocator from '@/app/menu/components/dispensary-locator';
import { type Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Chatbot from '@/components/chatbot';
import { useMenuData } from '@/hooks/use-menu-data';
import { useStore } from '@/hooks/use-store';
import Header from '@/app/menu/components/header';

const SKELETON_CATEGORIES = ['Edibles', 'Flower', 'Vapes'];

const ProductCard = ({ product }: { product: Product }) => {
    const { addToCart } = useCart();
    const { selectedLocationId } = useStore();
    
    const price = selectedLocationId ? product.prices[selectedLocationId] ?? product.price : product.price;
    
    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart({ ...product, quantity: 1, price: price });
    };

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
                <span className="text-lg font-bold">${price.toFixed(2)}</span>
                <Button size="icon" onClick={handleAddToCart}>
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
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between items-center">
            <Skeleton className="h-7 w-1/4" />
            <Skeleton className="h-10 w-10 rounded-md" />
        </CardFooter>
    </Card>
)

const FloatingCartPill = () => {
    const { getItemCount, getCartTotal, toggleCart } = useCart();
    const { selectedLocationId } = useStore();
    const itemCount = getItemCount();
    const {subtotal} = getCartTotal();

    return (
        <AnimatePresence>
            {itemCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    transition={{ ease: "easeInOut", duration: 0.3 }}
                    className="fixed bottom-6 left-6 z-50"
                >
                    <Card className="shadow-2xl">
                        <CardContent className="p-0">
                            <div className="flex items-center gap-4 p-3">
                                <Badge>{itemCount}</Badge>
                                <span className="font-semibold text-lg">${subtotal.toFixed(2)}</span>
                                <Button onClick={toggleCart}>
                                    <CreditCard className="mr-2 h-4 w-4" /> View Cart
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

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

export default function MenuAltClient() {
    const { products, isLoading, isHydrated } = useMenuData();
    
    const groupedProducts = useMemo(() => {
        return products ? groupProductsByCategory(products) : {};
    }, [products]);

    const categories = Object.keys(groupedProducts);

    const featuredProduct = products ? products.find(p => p.id === '5') : null;
    const showSkeletons = isLoading || !isHydrated;

    return (
        <div className="min-h-screen bg-muted/40">
            <Header />
            <main className="container mx-auto px-4 py-8">
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                    {/* Hero Card */}
                    <Card className="lg:col-span-2 relative overflow-hidden rounded-2xl shadow-lg flex items-end text-white bg-gray-900">
                         <Image src="https://picsum.photos/seed/menu-hero-main/1200/800" alt="Featured product" layout="fill" objectFit="cover" data-ai-hint="cannabis lifestyle product" className="opacity-50" />
                         <div className="relative p-8">
                            <Badge variant="secondary">Featured</Badge>
                            <h2 className="text-4xl font-bold mt-2">{featuredProduct?.name ?? "Nebula Nugs"}</h2>
                            <p className="mt-2 max-w-lg text-white/80">{featuredProduct?.description ?? "Dense, trichome-covered nugs with a sweet and pungent aroma. A premium flower for the discerning connoisseur."}</p>
                            <Button size="lg" className="mt-6" asChild>
                                <Link href={featuredProduct ? `/products/${featuredProduct.id}` : '/menu-alt'}>
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
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>
                            </section>
                        ))
                    )}
                </div>

            </main>
            <footer className="py-12 bg-foreground text-background">
                <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="font-bold text-lg mb-4 font-teko tracking-wider">BAKEDBOT</h3>
                        <p className="text-sm text-muted-foreground">The future of cannabis retail.</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-4 font-teko tracking-wider">SHOP</h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/menu-alt" className="text-muted-foreground hover:text-primary">Edibles</Link></li>
                            <li><Link href="/menu-alt" className="text-muted-foreground hover:text-primary">Flower</Link></li>
                            <li><Link href="/menu-alt" className="text-muted-foreground hover:text-primary">Vapes</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-4 font-teko tracking-wider">ABOUT</h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/menu-alt" className="text-muted-foreground hover:text-primary">Our Story</Link></li>
                            <li><Link href="/menu-alt" className="text-muted-foreground hover:text-primary">FAQ</Link></li>
                            <li><Link href="/brand-login" className="text-muted-foreground hover:text-primary">Brand Login</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-4 font-teko tracking-wider">CONTACT</h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/menu-alt" className="text-muted-foreground hover:text-primary">Contact Us</Link></li>
                            <li><Link href="/menu-alt" className="text-muted-foreground hover:text-primary">Careers</Link></li>
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
