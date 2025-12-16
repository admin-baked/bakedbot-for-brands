
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StickyOperatorBox } from '@/components/brand/sticky-operator-box';
import { RetailerMap } from '@/components/maps/retailer-map';
import { MapPin, Clock, ExternalLink, Globe } from 'lucide-react';
import Link from 'next/link';
import { createServerClient } from '@/firebase/server-client';
import { Retailer } from '@/types/domain';
import { fetchDispensaryPageData } from '@/lib/dispensary-data';
import { Metadata } from 'next';
import { ProductGrid } from '@/components/product-grid';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';

export async function generateMetadata({ params }: { params: Promise<{ dispensarySlug: string }> }): Promise<Metadata> {
    const { dispensarySlug } = await params;
    const { retailer } = await fetchDispensaryPageData(dispensarySlug);

    if (!retailer) return { title: 'Dispensary Not Found | BakedBot' };

    return {
        title: `${retailer.name} - Dispensary in ${retailer.city}, ${retailer.state} | BakedBot`,
        description: `Visit ${retailer.name} at ${retailer.address} in ${retailer.city}. View menu, hours, and deals. Verified dispensary on BakedBot.`,
        openGraph: {
            title: `${retailer.name} | BakedBot`,
            description: `Order from ${retailer.name} in ${retailer.city}. View live menu and hours.`,
            // images: retailer.logoUrl ? [retailer.logoUrl] : [],
        }
    };
}

export default async function DispensaryPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
    const { dispensarySlug } = await params;
    const { retailer: dispensary, products } = await fetchDispensaryPageData(dispensarySlug);

    if (!dispensary) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-background pb-20">
            <PageViewTracker
                pageType="dispensary"
                pageId={dispensary.id}
                pageSlug={dispensarySlug}
            />
            {/* Simple Header */}
            <div className="bg-white border-b py-6">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{dispensary.name}</h1>
                            <div className="flex items-center text-muted-foreground mt-2">
                                <MapPin className="w-4 h-4 mr-1" />
                                {dispensary.address}, {dispensary.city}, {dispensary.state} {dispensary.zip}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {/* Future: Order Online Buttons */}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Info Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <Clock className="w-5 h-5 text-muted-foreground" />
                                        Hours
                                    </div>
                                    <div className="text-sm space-y-1">
                                        {/* Placeholder hours logic */}
                                        <div className="flex justify-between">
                                            <span>Today:</span>
                                            <span>9:00 AM - 9:00 PM</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <Globe className="w-5 h-5 text-muted-foreground" />
                                        Online Ordering
                                    </div>
                                    <div className="space-y-2">
                                        {/* If we had links */}
                                        <Button variant="outline" className="w-full justify-between" asChild>
                                            <a href="#" target="_blank">
                                                Visit Website <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Location Map */}
                        {dispensary.lat && dispensary.lon && (
                            <section>
                                <h2 className="text-xl font-bold mb-4">Location</h2>
                                <RetailerMap
                                    retailers={[{
                                        id: dispensary.id,
                                        name: dispensary.name,
                                        address: `${dispensary.address}, ${dispensary.city}, ${dispensary.state}`,
                                        lat: dispensary.lat,
                                        lng: dispensary.lon
                                    }]}
                                    zoom={15}
                                    height="300px"
                                />
                            </section>
                        )}

                        {/* Menu Preview */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold">Menu Preview</h2>
                                {products.length > 0 && (
                                    <span className="text-sm text-muted-foreground">{products.length} products available</span>
                                )}
                            </div>

                            {products.length > 0 ? (
                                <ProductGrid products={products.slice(0, 8)} isLoading={false} brandSlug={''} variant="brand" />
                            ) : (
                                <div className="text-center py-12 bg-muted/20 rounded-lg">
                                    <p className="text-muted-foreground mb-4">
                                        This dispensary has not listed their full menu yet.
                                    </p>
                                    <Button variant="outline">Request Menu Update</Button>
                                </div>
                            )}

                            {products.length > 8 && (
                                <div className="mt-8 text-center">
                                    <Button size="lg" className="w-full sm:w-auto">
                                        View Full Menu ({products.length})
                                    </Button>
                                </div>
                            )}
                        </section>

                    </div>

                    {/* Right Rail / Sticky Operator */}
                    <div className="lg:col-span-4 space-y-6">
                        <StickyOperatorBox
                            entityName={dispensary.name}
                            entityType="dispensary"
                            verificationStatus={'unverified'}  // Default for now
                        />

                        <Card className="bg-blue-50/50 border-blue-100">
                            <CardContent className="p-4">
                                <h3 className="font-semibold text-blue-900 mb-2">Fix your visibility</h3>
                                <p className="text-sm text-blue-800 mb-4">
                                    Claim this page to add your menu, update hours, and appear in search results for brands you carry.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            {/* Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'LocalBusiness', // Dispensary if supported/specific
                        name: dispensary.name,
                        address: {
                            '@type': 'PostalAddress',
                            streetAddress: dispensary.address,
                            addressLocality: dispensary.city,
                            addressRegion: dispensary.state,
                            postalCode: dispensary.zip,
                            addressCountry: 'US'
                        },
                        geo: (dispensary.lat && dispensary.lon) ? {
                            '@type': 'GeoCoordinates',
                            latitude: dispensary.lat,
                            longitude: dispensary.lon
                        } : undefined,
                        telephone: dispensary.phone,
                        url: `https://bakedbot.ai/dispensaries/${dispensarySlug}`
                    })
                }}
            />
        </main>
    );
}
