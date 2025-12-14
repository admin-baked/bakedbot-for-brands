
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    getZipCodeCoordinates,
    discoverNearbyProducts,
    getRetailersByZipCode
} from '@/server/services/geo-discovery';
import { RetailerCard } from '@/components/foot-traffic/retailer-card';
import { LocalProductCard } from '@/components/foot-traffic/local-product-card';
import { SmokeyCtaCard } from '@/components/foot-traffic/smokey-cta-card';
import { FeaturedPickupPartnerCard } from '@/components/foot-traffic/featured-pickup-partner-card';
import { DtcBanner } from '@/components/foot-traffic/dtc-banner';
import { getSeededConfig } from '@/server/actions/seo-pages';

interface BrandPageProps {
    params: {
        zipCode: string;
        brandSlug: string;
    };
}

// Helper to format brand name from slug (e.g., "stiiizy" -> "Stiiizy", "raw-garden" -> "Raw Garden")
function formatBrandName(slug: string) {
    return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
    const { zipCode, brandSlug } = params;
    const brandName = formatBrandName(decodeURIComponent(brandSlug));
    return {
        title: `Buy ${brandName} near ${zipCode} | BakedBot`,
        description: `Find ${brandName} products in stock at dispensaries near ${zipCode}. Compare prices and availability for ${brandName} vapes, edibles, and flower.`,
        alternates: {
            canonical: `/local/${zipCode}/brand/${brandSlug}`,
        },
    };
}

export default async function BrandPage({ params }: BrandPageProps) {
    const { zipCode, brandSlug } = params;
    const brandName = formatBrandName(decodeURIComponent(brandSlug));

    // 1. Get Coordinates
    const coords = await getZipCodeCoordinates(zipCode);
    if (!coords) {
        notFound();
    }

    // 2. Fetch Config (for sponsored/partners)
    const seededConfig = await getSeededConfig(zipCode);

    // 3. Discover Products for this Brand
    // use simple search string for brand filter
    const discovery = await discoverNearbyProducts({
        lat: coords.lat,
        lng: coords.lng,
        radiusMiles: 15,
        limit: 50,
        cityName: coords.city,
        state: coords.state,
        brand: brandName,
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

    // Generate Schema
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${brandName} in ${zipCode}`,
        description: `Find ${brandName} products and dispensaries in ${zipCode}.`,
        breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Home',
                    item: 'https://bakedbot.ai'
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Local',
                    item: 'https://bakedbot.ai/local'
                },
                {
                    '@type': 'ListItem',
                    position: 3,
                    name: zipCode,
                    item: `https://bakedbot.ai/local/${zipCode}`
                },
                {
                    '@type': 'ListItem',
                    position: 4,
                    name: brandName,
                    item: `https://bakedbot.ai/local/${zipCode}/brand/${brandSlug}`
                }
            ]
        },
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: products.slice(0, 10).map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `https://bakedbot.ai/product/${p.id}`,
                name: p.name
            }))
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
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
                            <h1 className="text-3xl font-bold tracking-tight">Buy {brandName} near {coords.city}, {coords.state}</h1>
                            <p className="text-muted-foreground mt-2">
                                Found {products.length} {brandName} products in stock within 15 miles of {zipCode}.
                            </p>
                        </div>

                        {/* Product Grid */}
                        {products.length > 0 ? (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {products.map((product) => (
                                    <LocalProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed">
                                <Store className="h-10 w-10 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">No products found</h3>
                                <p className="text-sm text-muted-foreground max-w-sm mt-2">
                                    We couldn't find any {brandName} products in stock near you right now. Try expanding your search area.
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
                        {/* P1.1 Smokey CTA */}
                        <SmokeyCtaCard zipCode={zipCode} city={coords.city} state={coords.state} />

                        {/* P1.2 Featured Partner (Conditional) */}
                        {featuredId && (
                            <FeaturedPickupPartnerCard
                                partnerId={featuredId}
                                zipCode={zipCode}
                                city={coords.city}
                                state={coords.state}
                                retailer={sortedRetailers.find(r => r.id === featuredId)}
                            />
                        )}

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
