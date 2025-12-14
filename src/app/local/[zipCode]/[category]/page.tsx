
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { MapPin, ChevronLeft, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    getZipCodeCoordinates,
    discoverNearbyProducts,
    getRetailersByZipCode
} from '@/server/services/geo-discovery';
import { RetailerCard } from '@/components/foot-traffic/retailer-card';
import { DtcBanner } from '@/components/foot-traffic/dtc-banner';
import { getSeededConfig } from '@/server/actions/seo-pages';

interface CategoryPageProps {
    params: {
        zipCode: string;
        category: string;
    };
}

// Helper to capitalize category names
function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
    const { zipCode, category } = params;
    const catName = capitalize(decodeURIComponent(category));
    return {
        title: `Best ${catName} in ${zipCode} | BakedBot`,
        description: `Shop top-rated ${catName} products near ${zipCode}. Find prices, availability, and deals from local dispensaries.`,
    };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
    const { zipCode, category: rawCategory } = params;
    const category = decodeURIComponent(rawCategory);
    const catName = capitalize(category);

    // 1. Get Coordinates
    const coords = await getZipCodeCoordinates(zipCode);
    if (!coords) {
        notFound();
    }

    // 2. Fetch Config (for sponsored/partners)
    const seededConfig = await getSeededConfig(zipCode);

    // 3. Discover Products for this Category
    const discovery = await discoverNearbyProducts({
        lat: coords.lat,
        lng: coords.lng,
        radiusMiles: 15,
        limit: 50, // Higher limit for category page
        cityName: coords.city,
        state: coords.state,
        category: category, // Pass category filter
    });

    const products = discovery.products;

    // 4. Get Retailers (for sidebar)
    let nearbyRetailers = await getRetailersByZipCode(zipCode, 5);

    // Sort retailers (Featured/Sponsored logic)
    const featuredId = seededConfig?.featuredDispensaryId;
    const sponsoredIds = seededConfig?.sponsoredRetailerIds || [];

    const sortedRetailers = [...nearbyRetailers].sort((a, b) => {
        // 1. Featured Partner
        if (a.id === featuredId) return -1;
        if (b.id === featuredId) return 1;

        // 2. Sponsored
        const aSponsored = sponsoredIds.includes(a.id);
        const bSponsored = sponsoredIds.includes(b.id);
        if (aSponsored && !bSponsored) return -1;
        if (!aSponsored && bSponsored) return 1;

        // 3. Distance
        return (a.distance || Infinity) - (b.distance || Infinity);
    });

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header / Nav */}
            <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                <div className="container flex h-14 items-center">
                    <div className="mr-4 hidden md:flex">
                        <Link href="/" className="mr-6 flex items-center space-x-2">
                            <span className="hidden font-bold sm:inline-block">BakedBot</span>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="container py-8">
                {/* Breadcrumb / Back */}
                <div className="mb-6">
                    <Button variant="ghost" size="sm" asChild className="-ml-2">
                        <Link href={`/local/${zipCode}`}>
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            Back to Overview
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
                    <div className="space-y-8">
                        {/* Title Section */}
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Best {catName} in {coords.city}, {coords.state}</h1>
                            <p className="text-muted-foreground mt-2">
                                Found {products.length} {catName.toLowerCase()} products within 15 miles of {zipCode}.
                            </p>
                        </div>

                        {/* Product Grid */}
                        {products.length > 0 ? (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {products.map((product) => (
                                    <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                        <div className="aspect-square relative bg-muted">
                                            {product.imageUrl ? (
                                                <Image
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                                    No Image
                                                </div>
                                            )}
                                            {product.isOnSale && (
                                                <Badge className="absolute top-2 right-2 bg-red-500">
                                                    Sale
                                                </Badge>
                                            )}
                                        </div>
                                        <CardContent className="p-4">
                                            <Badge variant="secondary" className="mb-2 text-xs">
                                                {product.category}
                                            </Badge>
                                            <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                {product.brandName}
                                            </p>
                                            <div className="mt-2 flex items-center justify-between">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
                                                    {product.originalPrice && (
                                                        <span className="text-sm text-muted-foreground line-through">
                                                            ${product.originalPrice.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {product.retailerCount} stores
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                <MapPin className="inline h-3 w-3 mr-1" />
                                                {product.nearestDistance.toFixed(1)} mi away
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed">
                                <Store className="h-10 w-10 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">No products found</h3>
                                <p className="text-sm text-muted-foreground max-w-sm mt-2">
                                    We couldn't find any {catName.toLowerCase()} products in stock near you right now. Try checking a different category or expanding your search.
                                </p>
                            </div>
                        )}

                        {/* Inline DTC Banner */}
                        <div className="mt-8">
                            <DtcBanner zipCode={zipCode} variant="inline" />
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <section>
                            <h2 className="mb-4 text-lg font-semibold">Nearby Dispensaries</h2>
                            <div className="space-y-4">
                                {sortedRetailers.map((retailer) => {
                                    const isPartner = seededConfig?.featuredDispensaryId === retailer.id;
                                    const isSponsored = seededConfig?.sponsoredRetailerIds?.includes(retailer.id) || false;

                                    return (
                                        <RetailerCard
                                            key={retailer.id}
                                            retailer={retailer}
                                            isPartner={isPartner || false}
                                            zipCode={zipCode}
                                            isSponsored={isSponsored}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
