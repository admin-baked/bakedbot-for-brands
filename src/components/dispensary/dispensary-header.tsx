'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, Menu, MapPin, ChevronDown, User, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useStore } from '@/hooks/use-store';
import { useUser } from '@/firebase/auth/use-user';
import { useUserRole } from '@/hooks/use-user-role';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface DispensaryHeaderProps {
    brandName?: string;
    logoUrl?: string;
}

export function DispensaryHeader({ brandName = 'Dispensary', logoUrl }: DispensaryHeaderProps) {
    const { getItemCount, setCartSheetOpen } = useStore();
    const { user } = useUser();
    const { loginRoute } = useUserRole();
    const itemCount = getItemCount();

    const [orderType, setOrderType] = useState<'pickup' | 'delivery'>('pickup');

    return (
        <header className="sticky top-0 z-50 w-full bg-background border-b shadow-sm">
            <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">

                {/* Left: Hamburger & Logo */}
                <div className="flex items-center gap-4">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left">
                            <nav className="flex flex-col gap-4 mt-8">
                                <Link href="#" className="text-lg font-medium">Shop All</Link>
                                <Link href="#" className="text-lg font-medium">Deals</Link>
                                <Link href="#" className="text-lg font-medium">Brands</Link>
                                <div className="border-t my-2" />
                                <Link href="/account" className="text-lg font-medium">Account</Link>
                            </nav>
                        </SheetContent>
                    </Sheet>

                    <Link href="/" className="flex items-center gap-2">
                        {logoUrl ? (
                            <Image src={logoUrl} alt={brandName} width={40} height={40} className="rounded-full" />
                        ) : (
                            <Menu className="h-6 w-6 md:block hidden" />
                        )}
                        <span className="text-xl md:text-2xl font-bold font-teko tracking-wide text-primary">
                            {brandName}
                        </span>
                    </Link>
                </div>

                {/* Center: Search Bar */}
                <div className="hidden md:flex flex-1 max-w-xl mx-4 relative">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search for products..."
                            className="w-full pl-10 bg-secondary/50 border-none rounded-full focus-visible:ring-1"
                        />
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 md:gap-6">

                    {/* Pickup/Delivery Toggle */}
                    <div className="hidden lg:flex items-center gap-2 text-sm">
                        <MapPin className="h-5 w-5 text-primary" />
                        <div className="flex flex-col leading-tight">
                            <span className="font-semibold cursor-pointer flex items-center gap-1">
                                {orderType === 'pickup' ? 'Pickup' : 'Delivery'}
                                <ChevronDown className="h-3 w-3" />
                            </span>
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                752 Commercial St.
                            </span>
                        </div>
                    </div>

                    {/* Icons */}
                    <div className="flex items-center gap-1 md:gap-2">
                        <Button variant="ghost" size="icon" className="hidden sm:flex" asChild>
                            <Link href={user ? "/account" : loginRoute}>
                                <User className="h-6 w-6" />
                            </Link>
                        </Button>

                        <Button variant="ghost" size="icon" className="hidden sm:flex">
                            <Heart className="h-6 w-6" />
                        </Button>

                        <Button variant="ghost" size="icon" className="relative" onClick={() => setCartSheetOpen(true)}>
                            <ShoppingBag className="h-6 w-6" />
                            {itemCount > 0 && (
                                <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                    {itemCount}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
