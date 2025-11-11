
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useMenuData } from '@/hooks/use-menu-data';
import { Heart, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

interface FavoriteLocationProps {
    favoriteId: string | null;
    onSetFavorite: (id: string | null) => void;
}

export default function FavoriteLocation({ favoriteId, onSetFavorite }: FavoriteLocationProps) {
    const { locations, products, isLoading } = useMenuData();

    const favoriteLocation = locations.find(loc => loc.id === favoriteId);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (!favoriteLocation) {
        return (
            <Card className="bg-muted/30 border-dashed">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Heart className="text-primary" /> Set Your Favorite Location</CardTitle>
                    <CardDescription>Choose your go-to dispensary for a faster checkout next time.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-6">
                        <Search className="h-8 w-8" />
                        <p className="mt-2 text-sm">No favorite location selected yet.</p>
                        <Select onValueChange={(value) => onSetFavorite(value)}>
                            <SelectTrigger className="mt-4 w-full max-w-xs">
                                <SelectValue placeholder="Choose a location..." />
                            </SelectTrigger>
                            <SelectContent>
                                {locations.map(loc => (
                                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    // Get latest 3 products
    const latestProducts = products.slice(0, 3);

    return (
        <Card className="bg-gradient-to-br from-card to-muted/30">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-semibold text-primary flex items-center gap-1.5"><Heart className="h-4 w-4" /> Your Favorite</p>
                        <CardTitle className="text-2xl">{favoriteLocation.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {favoriteLocation.address}, {favoriteLocation.city}</CardDescription>
                    </div>
                    <Button variant="ghost" onClick={() => onSetFavorite(null)}>Change</Button>
                </div>
            </CardHeader>
            <CardContent>
                <h4 className="font-semibold text-sm mb-2">Latest from the menu:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {latestProducts.map(product => (
                        <Link key={product.id} href={`/products/${product.id}`} className="group">
                             <div className="border rounded-lg overflow-hidden">
                                <div className="relative aspect-square">
                                    <Image src={product.imageUrl} alt={product.name} fill className="object-cover transition-transform group-hover:scale-105" data-ai-hint={product.imageHint} />
                                </div>
                                <div className="p-2">
                                    <p className="text-xs font-semibold truncate">{product.name}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full">
                    <Link href="/">
                        Start a New Order
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}
