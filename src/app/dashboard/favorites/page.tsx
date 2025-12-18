'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin, ExternalLink, Loader2, Store, ShoppingBag } from 'lucide-react';
import { useStore } from '@/hooks/use-store';
import Link from 'next/link';

export default function FavoritesPage() {
    const { favoriteRetailerIds, toggleFavoriteRetailer } = useStore();
    const [loading, setLoading] = useState(true);
    const [favorites, setFavorites] = useState<any[]>([]);

    useEffect(() => {
        // Mock fetching of favorite retailer details
        // In a real app, we would fetch these from an API or Firestore
        const mockFavorites = favoriteRetailerIds.map(id => ({
            id,
            name: id.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()),
            address: '123 Cannabis Way',
            city: 'Los Angeles',
            state: 'CA',
            rating: 4.8,
            openNow: true
        }));

        setFavorites(mockFavorites);
        setLoading(false);
    }, [favoriteRetailerIds]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Your Favorites</h1>
                    <p className="text-muted-foreground">Manage your saved dispensaries and products.</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/shop">
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Browse More
                    </Link>
                </Button>
            </div>

            {favorites.length === 0 ? (
                <Card className="text-center p-12 border-2 border-dashed">
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-muted rounded-full">
                            <Heart className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-semibold">No favorites yet</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto">
                                Save dispensaries you love to quickly find their menus and deals.
                            </p>
                        </div>
                        <Button asChild>
                            <Link href="/dashboard/shop">Find Dispensaries</Link>
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((dispensary) => (
                        <Card key={dispensary.id} className="overflow-hidden group hover:border-primary/50 transition-colors">
                            <div className="h-32 bg-muted relative">
                                <div className="absolute top-2 right-2">
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="rounded-full shadow-sm"
                                        onClick={() => toggleFavoriteRetailer(dispensary.id)}
                                    >
                                        <Heart className="h-4 w-4 fill-primary text-primary" />
                                    </Button>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20">
                                    <Store className="h-16 w-16" />
                                </div>
                            </div>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">{dispensary.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-1 mt-1">
                                            <MapPin className="h-3 w-3" />
                                            {dispensary.city}, {dispensary.state}
                                        </CardDescription>
                                    </div>
                                    {dispensary.openNow && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Open</Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2">
                                    <Button size="sm" className="flex-1" asChild>
                                        <Link href={`/dashboard/shop/${dispensary.id}`}>View Menu</Link>
                                    </Button>
                                    <Button size="sm" variant="outline" asChild>
                                        <Link href={`/dispensaries/${dispensary.id}`} target="_blank">
                                            <ExternalLink className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
