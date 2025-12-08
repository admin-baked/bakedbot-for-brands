'use client';

import Link from 'next/link';
import {
    Store, Tag, Star, Flower2, Cigarette, Droplets,
    Wind, Cookie, Milk, FlaskConical, SprayCan, Shirt, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';

export function CategoryNav() {
    const params = useParams();
    const brand = (params?.brand as string) || 'default';

    const categories = [
        { label: 'Shop All', icon: Store, href: `/${brand}/shop` },
        { label: 'Deals', icon: Tag, href: `/${brand}/deals` },
        { label: 'Brands', icon: Star, href: `/${brand}/brands` },
        { label: 'Flower', icon: Flower2, href: `/${brand}/collections/flower` },
        { label: 'Pre-Roll', icon: Cigarette, href: `/${brand}/collections/pre-rolls` },
        { label: 'Extract', icon: Droplets, href: `/${brand}/collections/concentrates` },
        { label: 'Vape', icon: Wind, href: `/${brand}/collections/vapes` },
        { label: 'Edible', icon: Cookie, href: `/${brand}/collections/edibles` },
        { label: 'Drinks', icon: Milk, href: `/${brand}/collections/beverages` },
        { label: 'Tincture', icon: FlaskConical, href: `/${brand}/collections/tinctures` },
        { label: 'Topical', icon: SprayCan, href: `/${brand}/collections/topicals` },
        { label: 'Gear', icon: Search, href: `/${brand}/collections/gear` },
        { label: 'Merch', icon: Shirt, href: `/${brand}/collections/merch` },
    ];

    return (
        <div className="w-full bg-background border-b py-4 overflow-x-auto scrollbar-hide">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between min-w-max gap-8 md:gap-12">
                    {categories.map((cat) => (
                        <Link
                            key={cat.label}
                            href={cat.href}
                            className="flex flex-col items-center gap-2 group min-w-[60px]"
                        >
                            <div className="p-3 rounded-full bg-secondary/30 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                <cat.icon className="h-6 w-6 md:h-7 md:w-7" />
                            </div>
                            <span className="text-xs md:text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                {cat.label}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
