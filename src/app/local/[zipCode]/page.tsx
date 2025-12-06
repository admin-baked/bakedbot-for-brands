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
import { getRetailersByZipCode, getZipCodeCoordinates, discoverNearbyProducts } from '@/server/services/geo-discovery';
import { RetailerSummary, LocalProduct, LocalSEOPage } from '@/types/foot-traffic';
import { createServerClient } from '@/firebase/server-client';

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
    const cityName = coords ? 'Your Area' : 'Unknown'; // Would need reverse geocoding for actual city

    return {
        title: `Cannabis Dispensaries Near ${zipCode} | Find Weed Near Me | BakedBot`,
        description: `Find the best cannabis dispensaries, products, and deals near ${zipCode}. Compare prices, check availability, and discover top-rated strains in your neighborhood.`,
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

    const productList = products.slice(0, 10).map(product => ({
        '@type': 'Product',
        name: product.name,
        brand: {
            '@type': 'Brand',
            name: product.brandName,
        },
        image: product.imageUrl,
        offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
        },
    }));

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage',
                '@id': `https://bakedbot.ai/local/${zipCode}`,
                url: `https://bakedbot.ai/local/${zipCode}`,
                name: `Cannabis Near ${zipCode}`,
                isPartOf: {
                    '@id': 'https://bakedbot.ai/#website',
                },
                breadcrumb: {
                    '@id': `https://bakedbot.ai/local/${zipCode}#breadcrumb`,
                },
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `https://bakedbot.ai/local/${zipCode}#breadcrumb`,
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'Home',
                        item: 'https://bakedbot.ai',
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: 'Local',
                        item: 'https://bakedbot.ai/local',
                    },
                    {
                        '@type': 'ListItem',
                        position: 3,
                        name: zipCode,
                    },
                ],
            },
            {
                '@type': 'ItemList',
                name: `Dispensaries near ${zipCode}`,
                itemListElement: localBusinessList.map((business, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    item: business,
                })),
            },
            ...productList,
        ],
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

    // Check for seeded configuration in Firestore
    const { firestore } = await createServerClient();
    const seededDoc = await firestore.collection('foot_traffic').doc('config').collection('seo_pages').doc(zipCode).get();
    const seededConfig = seededDoc.exists ? seededDoc.data() as LocalSEOPage : null;

    // Fetch data in parallel
    const [retailers, discoveryResult] = await Promise.all([
        getRetailersByZipCode(zipCode, 10),
        discoverNearbyProducts({
            lat: coords.lat,
            lng: coords.lng,
            radiusMiles: 15,
            limit: 20,
            sortBy: 'score',
        }),
    ]);

    let products = discoveryResult.products;

    // If seeded config exists and has a featured dispensary, prioritize it
    if (seededConfig?.featuredDispensaryId) {
        // Find products from the featured retailer
        // Note: discoverNearbyProducts already returns products with availability.
        // We can boost the score of products available at the featured dispensary.
        products = products.map(p => {
            const isAtFeatured = p.availability.some(a => a.retailerId === seededConfig.featuredDispensaryId);
            if (isAtFeatured) {
                return { ...p, footTrafficScore: 100 }; // Boost score to max
            }
            return p;
        }).sort((a, b) => b.footTrafficScore - a.footTrafficScore);
    }

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

    return (
        <>
            {/* Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />

            <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
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
                                    {retailers.slice(0, 4).map((retailer) => (
                                        <Card key={retailer.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold line-clamp-1">{retailer.name}</h3>
                                                        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                                                            {retailer.address}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {retailer.city}, {retailer.state} {retailer.postalCode}
                                                        </p>
                                                    </div>
                                                    {retailer.distance !== undefined && (
                                                        <Badge variant="outline" className="ml-2 shrink-0">
                                                            {retailer.distance.toFixed(1)} mi
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
                                                    {retailer.phone && (
                                                        <a href={`tel:${retailer.phone}`} className="flex items-center gap-1 hover:text-foreground">
                                                            <Phone className="h-3 w-3" />
                                                            Call
                                                        </a>
                                                    )}
                                                    {retailer.website && (
                                                        <a
                                                            href={retailer.website}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 hover:text-foreground"
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                            Menu
                                                        </a>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </section>

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
                                        <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                            <div className="aspect-square relative bg-muted">
                                                {product.imageUrl && (
                                                    <Image
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        fill
                                                        className="object-cover"
                                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                    />
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
                            </section>

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
                            {/* Quick Stats */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Area Overview</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Dispensaries</span>
                                        <span className="font-semibold">{retailers.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Products</span>
                                        <span className="font-semibold">{products.length}+</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Categories</span>
                                        <span className="font-semibold">{categories.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Avg. Price</span>
                                        <span className="font-semibold">
                                            ${products.length > 0
                                                ? (products.reduce((sum, p) => sum + p.price, 0) / products.length).toFixed(2)
                                                : '0.00'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Nearby ZIP Codes */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Explore Nearby</CardTitle>
                                    <CardDescription>Other areas you might be interested in</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {/* Generate nearby ZIP codes (simplified) */}
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
                                    <h3 className="text-lg font-semibold">Get Personalized Recommendations</h3>
                                    <p className="mt-2 text-sm opacity-90">
                                        Chat with Smokey, our AI budtender, for tailored product suggestions
                                    </p>
                                    <Button variant="secondary" className="mt-4 w-full" asChild>
                                        <Link href="/chat">
                                            Talk to Smokey
                                        </Link>
                                    </Button>
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
