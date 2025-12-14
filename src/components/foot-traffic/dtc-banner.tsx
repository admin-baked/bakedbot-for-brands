
'use client';

import Link from 'next/link';
import { ShoppingBag, Truck, MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { trackEvent } from '@/lib/analytics';

interface DtcBannerProps {
    zipCode: string;
    variant?: 'inline' | 'sticky';
}

export function DtcBanner({ zipCode, variant = 'inline' }: DtcBannerProps) {
    const marketingUrl = 'https://ecstaticedibles.com?utm_source=bakedbot&utm_medium=seo_page&utm_campaign=cant_find_local';

    const handleTrack = () => {
        trackEvent({
            name: 'dtc_click',
            properties: {
                zipCode,
                variant,
                destination: 'ecstatic_edibles'
            }
        });
    };

    if (variant === 'sticky') {
        return (
            <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 shadow-lg lg:hidden">
                <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-medium">
                        <span className="block text-primary">Can't find it locally?</span>
                        <span className="text-muted-foreground text-xs">Order legal hemp to {zipCode}</span>
                    </div>
                    <Button size="sm" asChild className="shrink-0 bg-green-600 hover:bg-green-700" onClick={handleTrack}>
                        <a href={marketingUrl} target="_blank" rel="noopener noreferrer">
                            Shop Shipping
                        </a>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 overflow-hidden">
            <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6">
                <div className="flex bg-green-100 p-4 rounded-full shrink-0">
                    <Truck className="h-8 w-8 text-green-700" />
                </div>

                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-xl font-bold text-green-900">
                        Can't find what you need in {zipCode}?
                    </h3>
                    <p className="mt-2 text-green-800/80 max-w-xl">
                        Don't settle for limited menus. <strong>Ecstatic Edibles</strong> ships premium, federally legal hemp-derived THC products directly to your door in {zipCode}. No medical card required.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4 text-sm font-medium text-green-800/70">
                        <span className="flex items-center gap-1">
                            <ShoppingBag className="h-4 w-4" /> No Card Needed
                        </span>
                        <span className="flex items-center gap-1">
                            <Truck className="h-4 w-4" /> Fast Shipping
                        </span>
                        <span className="flex items-center gap-1">
                            <MapPinOff className="h-4 w-4" /> Ships to {zipCode}
                        </span>
                    </div>
                </div>

                <div className="shrink-0">
                    <Button size="lg" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-md" asChild onClick={handleTrack}>
                        <a href={marketingUrl} target="_blank" rel="noopener noreferrer">
                            Shop Nationwide Shipping
                        </a>
                    </Button>
                    <p className="mt-2 text-xs text-center text-green-700/60">
                        21+ Only. Contains THC.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
