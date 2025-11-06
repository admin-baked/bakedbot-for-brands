'use client';

import { products } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Plus, Search, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import CartSidebar from '../menu/components/cart-sidebar';

const Header = () => {
    const { toggleCart, getItemCount } = useCart();
    const itemCount = getItemCount();

    return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="#" className="text-2xl font-bold font-teko tracking-wider">
          BAKEDBOT
        </Link>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Heart className="h-5 w-5" />
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
        <Card className="overflow-hidden">
            <CardHeader className="p-0">
                <div className="relative aspect-square w-full">
                    <Image src={product.imageUrl} alt={product.name} layout="fill" objectFit="cover" data-ai-hint={product.imageHint} />
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <Badge variant="secondary">{product.category}</Badge>
                <CardTitle className="mt-2 text-lg truncate">{product.name}</CardTitle>
            </CardContent>
            <CardFooter className="flex justify-between items-center p-4 pt-0">
                <span className="text-xl font-bold">${product.price.toFixed(2)}</span>
                <Button size="icon" onClick={() => addToCart({ ...product, quantity: 1 })}>
                    <Plus className="h-4 w-4"/>
                </Button>
            </CardFooter>
        </Card>
    )
}

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
    <div className="min-h-screen bg-background -m-8">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="relative h-64 md:h-80 w-full rounded-lg overflow-hidden mb-12">
            <Image 
                src="https://picsum.photos/seed/menu-hero/1200/400" 
                alt="Let's Fill Some Bowls"
                layout="fill"
                objectFit="cover"
                data-ai-hint="cannabis lifestyle"
                className="brightness-75"
            />
            <div className="absolute inset-0 flex items-center justify-center">
                <h1 className="text-5xl md:text-7xl text-white font-teko tracking-widest text-center uppercase">
                    Let's Fill Some Bowls
                </h1>
            </div>
        </div>

        {categories.map(category => (
             <section key={category} className="mb-12">
                <h2 className="text-3xl font-bold font-teko tracking-wider uppercase mb-6">{category}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                   {groupedProducts[category].map(product => (
                       <ProductCard key={product.id} product={product} />
                   ))}
                </div>
            </section>
        ))}

      </main>
      <footer className="dark-theme py-12 text-background bg-foreground">
        <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
                <h3 className="font-bold text-lg mb-4 font-teko tracking-wider">BAKEDBOT</h3>
                <p className="text-sm text-muted-foreground">Your AI-powered cannabis co-pilot.</p>
            </div>
             <div>
                <h3 className="font-bold text-lg mb-4 font-teko tracking-wider">SHOP</h3>
                <ul className="space-y-2 text-sm">
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">Edibles</Link></li>
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">Flower</Link></li>
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">Vapes</Link></li>
                </ul>
            </div>
            <div>
                <h3 className="font-bold text-lg mb-4 font-teko tracking-wider">ABOUT</h3>
                <ul className="space-y-2 text-sm">
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">Our Story</Link></li>
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">FAQ</Link></li>
                    <li><Link href="/dashboard" className="text-muted-foreground hover:text-primary">Brand Login</Link></li>
                </ul>
            </div>
             <div>
                <h3 className="font-bold text-lg mb-4 font-teko tracking-wider">CONTACT</h3>
                <ul className="space-y-2 text-sm">
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">Contact Us</Link></li>
                    <li><Link href="#" className="text-muted-foreground hover:text-primary">Careers</Link></li>
                </ul>
            </div>
        </div>
        <div className="container mx-auto mt-8 pt-8 border-t border-muted-foreground/20 text-center text-muted-foreground text-sm">
            <p>&copy; 2024 BakedBot. All rights reserved.</p>
        </div>
      </footer>
      <CartSidebar />
    </div>
  );
}
