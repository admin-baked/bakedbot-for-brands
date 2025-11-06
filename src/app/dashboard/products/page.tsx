
'use client';

import { products } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { PenSquare, Plus, Search, ShoppingBag, User, CreditCard, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import CartSidebar from '../menu/components/cart-sidebar';
import { AnimatePresence, motion } from 'framer-motion';
import DispensaryLocator from '../menu/components/dispensary-locator';


const Header = () => {
    const { toggleCart, getItemCount } = useCart();
    const itemCount = getItemCount();

    return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/dashboard/products" className="text-2xl font-bold font-teko tracking-wider">
          BAKEDBOT
        </Link>
        <nav className="hidden md:flex items-center gap-6 font-semibold text-sm">
            <Link href="#" className="text-muted-foreground hover:text-foreground">Home</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground">About Us</Link>
            <Link href="/dashboard/products" className="text-foreground hover:text-foreground">Product Locator</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground">Our Partners</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground">Careers</Link>
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

const ProductCard = ({ product }: { product: typeof products[0] }) => {
    const { addToCart } = useCart();

    return (
        <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow border-none flex flex-col">
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
            <CardFooter className="flex justify-between items-center p-4 pt-0 bg-card">
                <span className="text-xl font-bold">${product.price.toFixed(2)}</span>
                <Button size="icon" onClick={() => addToCart({ ...product, quantity: 1 })}>
                    <Plus className="h-4 w-4"/>
                </Button>
            </CardFooter>
        </Card>
    )
}

const FloatingCartPill = () => {
    const { getItemCount, getCartTotal } = useCart();
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
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
                >
                    <Card className="shadow-2xl">
                        <CardContent className="p-0">
                            <div className="flex items-center gap-4 p-3">
                                <Badge>{itemCount}</Badge>
                                <span className="font-semibold text-lg">${subtotal.toFixed(2)}</span>
                                <Button asChild>
                                    <Link href="/dashboard/menu/checkout">
                                        <CreditCard className="mr-2 h-4 w-4" /> Checkout
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
};


const groupProductsByCategory = (products: typeof products) => {
    return products.reduce((acc, product) => {
        const { category } = product;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(product);
        return acc;
    }, {} as Record<string, typeof products>);
}

export default function ProductsPage() {
    const groupedProducts = groupProductsByCategory(products);
    const categories = Object.keys(groupedProducts);

  return (
    <div className="flex flex-col gap-6">
       <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Product Management</h1>
        <p className="text-muted-foreground">
          View, edit, and manage your product catalog.
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/menu" target="_blank">
          View Public Menu
        </Link>
      </Button>
    </div>
  );
}
