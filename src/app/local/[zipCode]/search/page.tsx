
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getZipCodeCoordinates, discoverNearbyProducts } from '@/server/services/geo-discovery';
import { LocalProductCard } from '@/components/foot-traffic/local-product-card';
import { DtcBanner } from '@/components/foot-traffic/dtc-banner';
import { LocalSearchBar } from '@/components/foot-traffic/local-search-bar';

interface SearchPageProps {
    params: {
        zipCode: string;
    };
    searchParams: {
        q?: string;
    };
}

export async function generateMetadata({ params, searchParams }: SearchPageProps) {
    const { zipCode } = params;
    const query = searchParams.q || '';
    return {
        title: `Search results for "${query}" near ${zipCode} | BakedBot`,
        description: `Find ${query} products in stock at dispensaries near ${zipCode}.`,
        robots: {
            index: false, // Search results shouldn't be indexed to prevent spider traps
            follow: true,
        },
    };
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
    const { zipCode } = params;
    const query = searchParams.q || '';

    // 1. Get Coordinates
    const coords = await getZipCodeCoordinates(zipCode);
    if (!coords) {
        notFound();
    }

    // 2. Discover Products with Search Query
    const discovery = await discoverNearbyProducts({
        lat: coords.lat,
        lng: coords.lng,
        radiusMiles: 20, // Slightly larger radius for search
        limit: 50,
        cityName: coords.city,
        state: coords.state,
        searchQuery: query,
    });

    const products = discovery.products;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur">
                <div className="container flex h-14 items-center">
                    <div className="mr-4 hidden md:flex">
                        <Link href="/" className="mr-6 flex items-center space-x-2">
                            <span className="hidden font-bold sm:inline-block">BakedBot</span>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="container py-8">
                {/* Back Link */}
                <div className="mb-6">
                    <Button variant="ghost" size="sm" asChild className="-ml-2">
                        <Link href={`/local/${zipCode}`}>
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            Back to Overview
                        </Link>
                    </Button>
                </div>

                <div className="space-y-8">
                    {/* Search Hero */}
                    <div className="text-center space-y-4 max-w-2xl mx-auto">
                        <h1 className="text-3xl font-bold tracking-tight">
                            Results for &quot;{query}&quot;
                        </h1>
                        <p className="text-muted-foreground">
                            Found {products.length} products near {coords.city}, {coords.state}
                        </p>
                        <div className="pt-2 flex justify-center">
                            <LocalSearchBar zipCode={zipCode} initialQuery={query} className="w-full max-w-md shadow-lg" />
                        </div>
                    </div>

                    {/* Results Grid */}
                    {products.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {products.map((product) => (
                                <LocalProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed bg-white">
                            <Search className="h-10 w-10 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold">No matches found</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mt-2">
                                We couldn't find any products matching &quot;{query}&quot; nearby. Try checking your spelling or using a broader term.
                            </p>
                        </div>
                    )}

                    {/* Banner */}
                    <div className="mt-12">
                        <DtcBanner variant="inline" zipCode={zipCode} />
                    </div>
                </div>
            </main>
        </div>
    );
}
