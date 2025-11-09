'use client';

import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Header from '@/app/menu/components/header';
import CartSidebar from '@/app/menu/components/cart-sidebar';
import { FloatingCartPill } from '@/app/menu/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const DispensaryLocator = dynamic(() => import('@/app/menu/components/dispensary-locator'), {
    ssr: false,
    loading: () => <DispensaryLocatorSkeleton />,
});

const DispensaryLocatorSkeleton = () => (
     <div className="py-12">
        <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4 text-center">Find a Dispensary Near You</h2>
        <div className="grid md:grid-cols-3 gap-4 max-w-6xl mx-auto">
            <Card><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            <Card><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            <Card><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
        </div>
    </div>
);


export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="text-center py-16 md:py-24">
                     <h1 className="text-6xl md:text-8xl font-teko tracking-widest uppercase text-foreground">
                        Find Your Bliss
                     </h1>
                     <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        Discover premium, handcrafted cannabis products designed to elevate your moments. Explore our menu to find the perfect match for your mood and occasion.
                     </p>
                     <Button asChild size="lg" className="mt-8">
                        <Link href="/menu">
                            Browse the Full Menu <ArrowRight className="ml-2" />
                        </Link>
                     </Button>
                </div>

                <DispensaryLocator />
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
                            <li><Link href="/" className="text-muted-foreground hover:text-primary">Our Story</Link></li>
                            <li><Link href="/" className="text-muted-foreground hover:text-primary">FAQ</Link></li>
                            <li><Link href="/brand-login" className="text-muted-foreground hover:text-primary">Brand Login</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-4 font-teko tracking-wider">CONTACT</h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/" className="text-muted-foreground hover:text-primary">Contact Us</Link></li>
                            <li><Link href="/" className="text-muted-foreground hover:text-primary">Careers</Link></li>
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
    )
}
