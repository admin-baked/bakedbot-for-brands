// src/app/local/[zipCode]/page.tsx
/**
 * Neighborhood Budtender Page
 * Auto-generated SEO page for local cannabis search
 * URL: /local/{zipCode}
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Star, Clock, Phone, ExternalLink, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DtcBanner } from '@/components/foot-traffic/dtc-banner';
import { RetailerCard } from '@/components/foot-traffic/retailer-card';
import { LocalProductCard } from '@/components/foot-traffic/local-product-card';
import { SmokeyCtaCard } from '@/components/foot-traffic/smokey-cta-card';
import { FeaturedPickupPartnerCard } from '@/components/foot-traffic/featured-pickup-partner-card';
import { AboutZipSection } from '@/components/foot-traffic/about-zip-section';
import { AgeGate } from '@/components/foot-traffic/age-gate';
import { DropAlertModal } from '@/components/foot-traffic/drop-alert-modal';
import { LocalSearchBar } from '@/components/foot-traffic/local-search-bar';

import { getRetailersByZipCode, getZipCodeCoordinates, discoverNearbyProducts } from '@/server/services/geo-discovery';
import { RetailerSummary, LocalProduct, LocalSEOPage, CannMenusSnapshot } from '@/types/foot-traffic';

import { createServerClient } from '@/firebase/server-client';
import { getSeededConfig } from '@/server/actions/seo-pages';

// Static params for ISR
export const revalidate = 3600; // Revalidate every hour

interface PageProps {
    params: Promise<{ zipCode: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { zipCode } = await params;

    // Basic validation
    if (!/^\d{5}$/.test(zipCode)) {
        return {
            title: 'Location Not Found | BakedBot',
        };
    }

    // Get location info
    const coords = await getZipCodeCoordinates(zipCode);

    if (!coords) {
        return {
            title: 'Location Not Found | BakedBot',
        };
    }

    // Fetch seeded config for metadata overrides
    const seededConfig = await getSeededConfig(zipCode);

    // Fetch products for description count if not using seeded config
    let products: LocalProduct[] = [];
    if (!seededConfig?.metaDescription) {
        const initialDiscovery = await discoverNearbyProducts({
            lat: coords.lat,
            lng: coords.lng,
            radiusMiles: 15,
            limit: 1, // Only need one to know if there are products
            sortBy: 'score',
            cityName: coords.city,
            state: coords.state
        });
        products = initialDiscovery.products;
    }

    return {
        title: seededConfig?.metaTitle || `Cannabis near ${coords.city}, ${coords.state} (${zipCode}) | BakedBot`,
        description: seededConfig?.metaDescription || `Find dispensaries and delivery services in ${zipCode}. Compare prices on ${products.length} products from local retailers.`,
        keywords: [
            `cannabis near ${zipCode}`,
            `dispensary ${zipCode}`,
            `weed near me`,
            `marijuana ${zipCode}`,
            'cannabis delivery',
            'dispensary near me',
        ].join(', '),
        openGraph: {
            title: `Cannabis Near ${zipCode} | BakedBot`,
            description: `Discover dispensaries and cannabis products near ZIP code ${zipCode}.`,
            type: 'website',
            locale: 'en_US',
        },
        alternates: {
            canonical: `https://bakedbot.ai/local/${zipCode}`,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

// Generate structured data for Google
function generateStructuredData(
    zipCode: string,
    retailers: RetailerSummary[],
    products: LocalProduct[]
) {
    const localBusinessList = retailers.map(retailer => ({
        '@type': 'LocalBusiness',
        '@id': `https://bakedbot.ai/dispensary/${retailer.id}`,
        name: retailer.name,
        address: {
            '@type': 'PostalAddress',
            streetAddress: retailer.address,
            addressLocality: retailer.city,
            addressRegion: retailer.state,
            postalCode: retailer.postalCode,
            addressCountry: 'US',
        },
        ...(retailer.phone && { telephone: retailer.phone }),
        ...(retailer.website && { url: retailer.website }),
        ...(retailer.lat && retailer.lng && {
            geo: {
                '@type': 'GeoCoordinates',
                latitude: retailer.lat,
                longitude: retailer.lng,
            },
        }),
    }));

    return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `Cannabis Dispensaries in ${zipCode}`,
        description: `Find local dispensaries and products in ${zipCode}.`,
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: localBusinessList.map((business, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: business,
            })),
        },
    };
}

export default async function LocalZipPage({ params }: PageProps) {
    const { zipCode } = await params;

    // Validate ZIP code format
    if (!/^\d{5}$/.test(zipCode)) {
        notFound();
    }

    // Get coordinates for the ZIP code
    const coords = await getZipCodeCoordinates(zipCode);

    if (!coords) {
        notFound();
    }

    // Check for seeded configuration in Firestore (Split Model)
    const seededConfig = await getSeededConfig(zipCode);
    const { firestore } = await createServerClient();

    let snapshotData: { retailers: RetailerSummary[], products: LocalProduct[] } | null = null;

    // 3. Resolve Data Snapshot if reference exists
    if (seededConfig?.dataSnapshotRef) {
        const snapshotDoc = await firestore.collection('foot_traffic').doc('data').collection('cann_menus_snapshots').doc(seededConfig.dataSnapshotRef).get();
        if (snapshotDoc.exists) {
            const snap = snapshotDoc.data() as any;
            snapshotData = {
                retailers: (snap.dispensaries || []) as any,
                products: (snap.products || []) as any
            };
        }
    } else if (seededConfig) {
        // Legacy: Data is in content
        snapshotData = {
            retailers: seededConfig.content.nearbyRetailers || [],
            products: [...(seededConfig.content.topStrains || []), ...(seededConfig.content.topDeals || [])] as any
        };
    }


    // Discovery logic with adaptive radius (Runtime fallback)
    const discoverProducts = async (radius: number): Promise<{ products: LocalProduct[] }> => {
        return discoverNearbyProducts({
            lat: coords.lat,
            lng: coords.lng,
            radiusMiles: radius,
            limit: 20,
            sortBy: 'score',
            cityName: coords.city,
            state: coords.state
        });
    };


    let retailers: RetailerSummary[] = [];
    let products: LocalProduct[] = [];

    if (snapshotData && snapshotData.products.length > 0) {
        // Use Snapshot Data
        retailers = snapshotData.retailers;
        products = snapshotData.products;
    } else {
        // Runtime Discovery (No Valid Snapshot)
        const [liveRetailers, initialDiscovery] = await Promise.all([
            getRetailersByZipCode(zipCode, 10),
            discoverProducts(15)
        ]);
        retailers = liveRetailers;
        let discoveryResult = initialDiscovery;

        if (discoveryResult.products.length === 0) {
            discoveryResult = await discoverProducts(50);
        }
        if (discoveryResult.products.length === 0) {
            discoveryResult = await discoverProducts(100);
            products = discoveryResult.products;
        } else {
            products = discoveryResult.products;
        }

        // Prioritize sponsored retailers
        const sponsoredIds = seededConfig?.sponsoredRetailerIds || [];
        retailers = [...retailers].sort((a, b) => {
            const aSponsored = sponsoredIds.includes(a.id);
            const bSponsored = sponsoredIds.includes(b.id);
            if (aSponsored && !bSponsored) return -1;
            if (!aSponsored && bSponsored) return 1;
            return 0;
        });

        // If seeded config exists and has a featured dispensary, prioritize it
        if (seededConfig?.featuredDispensaryId) {
            products = products.map(p => {
                const isAtFeatured = p.availability.some(a => a.retailerId === seededConfig!.featuredDispensaryId);
                if (isAtFeatured) {
                    return { ...p, footTrafficScore: 100 };
                }
                return p;
            }).sort((a, b) => b.footTrafficScore - a.footTrafficScore);
        }
    }

    const sortedRetailers = retailers;

    // Generate structured data
    const structuredData = generateStructuredData(zipCode, retailers, products);

    // Group products by category
    const categoryGroups = products.reduce((acc, product) => {
        const category = product.category || 'Other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(product);
        return acc;
    }, {} as Record<string, LocalProduct[]>);

    const categories = Object.keys(categoryGroups).sort();

    // Sort categories by product count for About section
    const topCategories = Object.keys(categoryGroups)
        .sort((a, b) => categoryGroups[b].length - categoryGroups[a].length)
        .slice(0, 3);

    // Calculate top brands
    const brandCounts = products.reduce((acc, product) => {
        const brand = product.brandName || 'Unknown';
        acc[brand] = (acc[brand] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topBrands = Object.keys(brandCounts)
        .sort((a, b) => brandCounts[b] - brandCounts[a])
        .slice(0, 10); // Top 10 brands

    return (
        <>
            {/* Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />

            {/* Age Gate (Client Component) */}
            <AgeGate />

            {/* Sticky DTC Banner (Mobile) */}
            <DtcBanner zipCode={zipCode} variant="sticky" />

            <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-16 lg:pb-0">

                {/* Hero Section */}
                <section className="border-b bg-card">
                    <div className="container py-12">
                        <nav className="mb-6 flex items-center text-sm text-muted-foreground">
                            <Link href="/" className="hover:text-foreground">Home</Link>
                            <ChevronRight className="mx-2 h-4 w-4" />
                            <Link href="/local" className="hover:text-foreground">Local</Link>
                            <ChevronRight className="mx-2 h-4 w-4" />
                            <span className="text-foreground">{zipCode}</span>
                        </nav>

                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-4xl font-bold tracking-tight">
                                    Cannabis Near {zipCode}
                                </h1>
                                <p className="mt-2 text-lg text-muted-foreground">
                                    Discover dispensaries, products, and deals in your neighborhood
                                </p>
                                <div className="mt-6">
                                    <LocalSearchBar zipCode={zipCode} className="text-base" />
                                </div>
                                <div className="mt-4 flex items-center gap-4 text-sm">
                                    <Badge variant="secondary" className="gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {retailers.length} dispensaries nearby
                                    </Badge>
                                    <Badge variant="secondary">
                                        {products.length}+ products available
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="container py-8">
                    <div className="grid gap-8 lg:grid-cols-3">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Nearby Dispensaries */}
                            <section>
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-2xl font-semibold">Nearby Dispensaries</h2>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/local/${zipCode}/dispensaries`}>
                                            View All <ChevronRight className="ml-1 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    {sortedRetailers.slice(0, 4).map((retailer) => {
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

                            {/* Inline DTC Banner */}
                            <DtcBanner zipCode={zipCode} variant="inline" />

                            {/* Top Products */}
                            <section>
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-2xl font-semibold">Top Products Near You</h2>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/local/${zipCode}/products`}>
                                            View All <ChevronRight className="ml-1 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {products.slice(0, 6).map((product) => (
                                        <LocalProductCard key={product.id} product={product} />
                                    ))}
                                </div>
                            </section>

                            {/* Popular Brands (P5) */}
                            {topBrands.length > 0 && (
                                <section className="mb-10">
                                    <h2 className="mb-4 text-2xl font-semibold">Popular Brands</h2>
                                    <div className="flex flex-wrap gap-2">
                                        {topBrands.map(brand => {
                                            const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                                            return (
                                                <Link
                                                    key={brand}
                                                    href={`/local/${zipCode}/brand/${slug}`}
                                                >
                                                    <Badge variant="secondary" className="px-3 py-1 hover:bg-indigo-100 hover:text-indigo-800 transition-colors cursor-pointer text-sm">
                                                        {brand}
                                                    </Badge>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* Categories */}
                            <section>
                                <h2 className="mb-4 text-2xl font-semibold">Shop by Category</h2>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {categories.map((category) => (
                                        <Link
                                            key={category}
                                            href={`/local/${zipCode}/${category.toLowerCase()}`}
                                            className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted transition-colors"
                                        >
                                            <span className="font-medium">{category}</span>
                                            <Badge variant="secondary">
                                                {categoryGroups[category].length}
                                            </Badge>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Sidebar */}
                        <aside className="space-y-6">
                            {/* P1.1 Smokey CTA */}
                            <SmokeyCtaCard zipCode={zipCode} city={coords.city} state={coords.state} />

                            {/* P1.2 Featured Partner (Conditional) */}
                            {seededConfig?.featuredDispensaryId && (
                                <FeaturedPickupPartnerCard
                                    partnerId={seededConfig.featuredDispensaryId}
                                    zipCode={zipCode}
                                    city={coords.city}
                                    state={coords.state}
                                    retailer={retailers.find(r => r.id === seededConfig?.featuredDispensaryId)}
                                />
                            )}
                            {/* P3.1 Dynamic About Section */}
                            <AboutZipSection
                                zipCode={zipCode}
                                city={coords.city}
                                state={coords.state}
                                productCount={snapshotData?.products.length || 0}
                                retailerCount={retailers.length}
                                lowestPrice={products.length > 0 ? Math.min(...products.map(p => p.price)) : 0}
                                topCategories={topCategories.map(c => ({ name: c, count: categoryGroups[c].length }))}
                            />

                            {/* Nearby ZIP Codes */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Explore Nearby</CardTitle>
                                    <CardDescription>Other areas you might be interested in</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {[1, 2, 3, 4, 5].map((offset) => {
                                            const nearbyZip = String(parseInt(zipCode) + offset).padStart(5, '0');
                                            return (
                                                <Link key={nearbyZip} href={`/local/${nearbyZip}`}>
                                                    <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                                        {nearbyZip}
                                                    </Badge>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* CTA */}
                            <Card className="bg-primary text-primary-foreground">
                                <CardContent className="p-6 text-center">
                                    <h3 className="text-lg font-semibold">Never Miss a Drop</h3>
                                    <p className="mt-2 text-sm opacity-90 mb-4">
                                        Get notified when new strains and exclusive drops land in {zipCode}.
                                    </p>
                                    <div className="flex justify-center">
                                        <DropAlertModal zipCode={zipCode} />
                                    </div>
                                </CardContent>
                            </Card>
                        </aside>
                    </div>
                </div>

                {/* Bottom SEO Content */}
                <section className="border-t bg-muted/30">
                    <div className="container py-12">
                        <h2 className="text-2xl font-semibold mb-4">
                            About Cannabis in {zipCode}
                        </h2>
                        <div className="prose prose-sm max-w-none text-muted-foreground">
                            <p>
                                Looking for cannabis products near ZIP code {zipCode}? BakedBot helps you discover
                                the best dispensaries, compare prices, and find top-rated products in your area.
                                With {retailers.length} dispensaries nearby, you have plenty of options for flower,
                                edibles, concentrates, and more.
                            </p>
                            <p>
                                Our AI-powered platform analyzes real-time inventory and pricing data to help you
                                find exactly what you're looking for. Whether you're a medical patient or recreational
                                user, we make it easy to explore cannabis options in your neighborhood.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
