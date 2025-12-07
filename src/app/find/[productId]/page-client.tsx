'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Product } from '@/firebase/converters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, ArrowRight, Star } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function ProductFinderClient({ product }: { product: Product & { id: string } }) {
    const searchParams = useSearchParams();
    const ambassadorId = searchParams?.get('ref');
    const [loading, setLoading] = useState(false);
    const [locations, setLocations] = useState<any[] | null>(null);

    const handleFindNearby = () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLocations([
                { name: 'Green Cross Dispensary', distance: '0.8 mi', address: '123 Main St, LA' },
                { name: 'Elevate Cannabis', distance: '2.1 mi', address: '456 High Blvd, LA' },
                { name: 'The Apothecary', distance: '3.5 mi', address: '789 Wellness Rd, Santa Monica' },
            ]);
            setLoading(false);
        }, 1200);
    };

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-md space-y-8">
                {/* Product Hero */}
                <div className="text-center space-y-2">
                    <div className="relative w-32 h-32 bg-secondary/20 rounded-full mx-auto flex items-center justify-center mb-4">
                        {product.imageUrl ? (
                            <Image src={product.imageUrl} alt={product.name} fill className="object-cover rounded-full" />
                        ) : (
                            <Star className="h-12 w-12 text-primary/40" />
                        )}
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">{product.name}</h1>
                    <p className="text-muted-foreground">{product.category || 'Premium Cannabis'}</p>
                    {/* Display Terpenes if available (requires casting or updated type) */}
                    {(product as any).terpenes && (
                        <div className="flex gap-2 justify-center mt-2">
                            {(product as any).terpenes.slice(0, 2).map((t: any) => (
                                <span key={t.name} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">{t.name}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Locator Action */}
                <Card className="border-2 border-primary/10 shadow-lg">
                    <CardHeader className="text-center pb-2">
                        <CardTitle>Find {product.name} Nearby</CardTitle>
                        <CardDescription>Locate authorized retailers in your area.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        {!locations ? (
                            <Button size="lg" className="w-full" onClick={handleFindNearby} disabled={loading}>
                                {loading ? 'Locating...' : 'Find Near Me'} <MapPin className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest text-center">3 Locations Found</div>
                                {locations.map((loc, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:border-primary/50 transition-colors cursor-pointer group">
                                        <div>
                                            <div className="font-medium text-sm group-hover:text-primary transition-colors">{loc.name}</div>
                                            <div className="text-xs text-muted-foreground">{loc.address}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-primary">{loc.distance}</div>
                                            <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {ambassadorId && (
                    <div className="text-center text-xs text-muted-foreground">
                        Referred by Ambassador #{ambassadorId.slice(0, 5)}...
                    </div>
                )}
            </div>
        </div>
    );
}
