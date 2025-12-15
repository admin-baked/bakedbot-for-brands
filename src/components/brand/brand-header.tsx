'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu, Search, User, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useUser } from '@/firebase/auth/use-user';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface BrandHeaderProps {
    brandName: string;
    logoUrl?: string;
    verified?: boolean;
}

export function BrandHeader({ brandName, logoUrl, verified }: BrandHeaderProps) {
    const { user } = useUser();

    return (
        <header className="sticky top-0 z-50 w-full bg-background border-b shadow-sm">
            <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">

                {/* Left: Mobile Menu & Logo */}
                <div className="flex items-center gap-4">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left">
                            <nav className="flex flex-col gap-4 mt-8">
                                <Link href="/" className="text-lg font-medium">Home</Link>
                                <div className="border-t my-2" />
                                <Link href="#" className="text-lg font-medium">For Brands</Link>
                                <Link href="/account" className="text-lg font-medium">Account</Link>
                            </nav>
                        </SheetContent>
                    </Sheet>

                    <Link href={`/brands/${brandName.toLowerCase().replace(/\s+/g, '-')}`} className="flex items-center gap-3">
                        {logoUrl ? (
                            <div className="relative h-10 w-10">
                                <Image
                                    src={logoUrl}
                                    alt={brandName}
                                    fill
                                    className="rounded-full object-cover border"
                                />
                            </div>
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border">
                                <span className="text-lg font-bold text-primary">{brandName.charAt(0)}</span>
                            </div>
                        )}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xl font-bold font-teko tracking-wide text-foreground leading-none">
                                    {brandName}
                                </span>
                                {verified && (
                                    <CheckCircle className="h-4 w-4 text-blue-500 fill-blue-50" />
                                )}
                            </div>
                            {verified && <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none">Official Brand Page</span>}
                        </div>
                    </Link>
                </div>

                {/* Center: Search (Find near you) */}
                <div className="hidden md:flex flex-1 max-w-lg mx-8 relative">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={`Find ${brandName} near you...`}
                            className="w-full pl-10 bg-secondary/50 border-none rounded-full focus-visible:ring-1"
                        />
                        <Button size="sm" className="absolute right-1 top-1 h-8 px-4 rounded-full">
                            Search
                        </Button>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground hover:text-foreground" asChild>
                        <Link href={`/brands/claim?name=${encodeURIComponent(brandName)}`}>
                            Are you {brandName}?
                        </Link>
                    </Button>

                    <Button variant="ghost" size="icon" asChild>
                        <Link href={user ? "/account" : "/customer-login"}>
                            <User className="h-6 w-6" />
                        </Link>
                    </Button>
                </div>
            </div>
        </header>
    );
}
