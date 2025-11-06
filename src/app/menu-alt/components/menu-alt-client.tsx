
'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { PenSquare, Plus, Search, ShoppingBag, User, CreditCard, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import CartSidebar from '@/app/menu/components/cart-sidebar';
import { AnimatePresence, motion } from 'framer-motion';
import DispensaryLocator from '@/app/menu/components/dispensary-locator';
import { useProducts } from '@/firebase/firestore/use-products';
import { type Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Chatbot from '@/components/chatbot';

const Header = () => {
    const { toggleCart, getItemCount } = useCart();
    const itemCount = getItemCount();

    return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/menu-alt" className="text-2xl font-bold font-teko tracking-wider">
          BAKEDBOT ALT
        </Link>
        <nav className="hidden md:flex items-center gap-6 font-semibold text-sm">
            <Link href="/menu-alt" className="text-foreground hover:text-foreground">Home</Link>
            <Link href="/menu" className="text-muted-foreground hover:text-foreground">Menu 1</Link>
            <Link href="/product-locator" className="text-muted-foreground hover:text-foreground">Product Locator</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
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

const ProductCard = ({ product }: { product: Product }) => {
    const { addToCart } = useCart();

    return (
        <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow border-none flex flex-col group">
            <CardHeader className="p-0">
                <div className="relative aspect-video w-full">
                    <Image src={product.imageUrl} alt={product.name} layout="fill" objectFit="cover" data-ai-hint={product.imageHint} />
                     <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                </div>
            </CardHeader>
            <CardContent className="p-4 bg-card flex-1 flex flex-col">
                <Badge variant="secondary">{product.category}</Badge>
                <CardTitle className="mt-2 text-lg truncate font-semibold">{product.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2 flex-1">{product.description}</p>
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
            <CardFooter className="flex justify-between items-center p-4 pt-0 bg-card">
                <span className="text-xl font-bold">${product.price.toFixed(2)}</span>
                <Button onClick={() => addToCart({ ...product, quantity: 1 })}>
                    <Plus className="mr-2 h-4 w-4"/> Add to Cart
                </Button>
            </CardFooter>
        </Card>
    )
}

const ProductSkeleton = () => (
    <Card className="overflow-hidden shadow-md flex flex-col">
        <Skeleton className="aspect-video w-full" />
        <CardContent className="p-4 flex-1 space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-10 w-full" />
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between items-center">
            <Skeleton className="h-7 w-1/4" />
            <Skeleton className="h-10 w-28 rounded-md" />
        </CardFooter>
    </Card>
)

const FloatingCartPill = () => {
    const { getItemCount, getCartTotal, toggleCart } = useCart();
    const itemCount = getItemCount();
    const subtotal = getCartTotal();

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
    const { data: products, isLoading } = useProducts();
    
    const groupedProducts = useMemo(() => {
        return products ? groupProductsByCategory(products) : {};
    }, [products]);

    const categories = Object.keys(groupedProducts);

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
                    <div className="text-center md:text-left">
                        <h1 className="text-5xl md:text-7xl font-teko tracking-widest uppercase">
                            A New Vibe
                        </h1>
                        <p className="text-muted-foreground mt-2 max-w-2xl">
                            Explore our products in a fresh, new way. This is an alternative menu layout.
                        </p>
                        <Button asChild className="mt-6">
                            <Link href="/leave-a-review">
                                <PenSquare className="mr-2 h-4 w-4" />
                                Leave a Review
                            </Link>
                        </Button>
                    </div>
                    <div className="relative h-64 md:h-80 w-full rounded-lg overflow-hidden">
                         <Image
                            src="https://picsum.photos/seed/menu-alt-hero/800/600"
                            alt="Alternative Menu"
                            layout="fill"
                            objectFit="cover"
                            data-ai-hint="cannabis modern design"
                        />
                    </div>
                </div>

                <DispensaryLocator />

                {isLoading ? (
                    // Show skeleton loaders while products are loading
                    Array.from({ length: 3 }).map((_, i) => (
                        <section key={i} className="mb-12">
                            <Skeleton className="h-8 w-1/4 mb-6" />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.from({ length: 3 }).map((_, j) => (
                                <ProductSkeleton key={j} />
                                ))}
                            </div>
                        </section>
                    ))
                ) : (
                    // Render products once loaded
                    categories.map(category => (
                        <section key={category} className="mb-12">
                            <h2 className="text-3xl font-bold font-teko tracking-wider uppercase mb-6">{category}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groupedProducts[category].map(product => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                            </div>
                        </section>
                    ))
                )}

            </main>
            <footer className="dark-theme py-12 text-background bg-foreground">
                <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="font-bold text-lg mb-4 font-teko tracking-wider">BAKEDBOT ALT</h3>
                        <p className="text-sm text-muted-foreground">The second cool menu.</p>
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
