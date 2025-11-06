
'use client';

import Link from 'next/link';
import Image from 'next/image';
import DispensaryLocator from '../menu/components/dispensary-locator';
import { Button } from '@/components/ui/button';
import { Search, ShoppingBag, User } from 'lucide-react';


const Header = () => {
    return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/menu" className="text-2xl font-bold font-teko tracking-wider">
          BAKEDBOT
        </Link>
        <nav className="hidden md:flex items-center gap-6 font-semibold text-sm">
            <Link href="/menu" className="text-muted-foreground hover:text-foreground">Home</Link>
            <Link href="/menu" className="text-muted-foreground hover:text-foreground">About Us</Link>
            <Link href="/product-locator" className="text-foreground hover:text-foreground">Product Locator</Link>
            <Link href="/menu" className="text-muted-foreground hover:text-foreground">Our Partners</Link>
            <Link href="/menu" className="text-muted-foreground hover:text-foreground">Careers</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <ShoppingBag className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};


export default function ProductLocatorPage() {

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-8">
                 <div className="relative h-64 md:h-80 w-full rounded-lg overflow-hidden mb-12">
                    <Image
                        src="https://picsum.photos/seed/locator-hero/1200/400"
                        alt="Dispensary Locator"
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint="map location"
                        className="brightness-75"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <h1 className="text-5xl md:text-7xl text-white font-teko tracking-widest uppercase">
                            Find Our Products
                        </h1>
                        <p className="text-white/80 mt-2 max-w-2xl">
                           Use our interactive map to find a partner dispensary near you.
                        </p>
                    </div>
                </div>

                <DispensaryLocator />
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
        </div>
    );
}

    