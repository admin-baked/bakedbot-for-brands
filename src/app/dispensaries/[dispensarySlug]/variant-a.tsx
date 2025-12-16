/**
 * VARIANT A - Original Dispensary Page Design
 * 
 * This is the original dispensary page design (preserved for A/B testing).
 * Current live page: page.tsx (Variant B - B2B SEO design)
 * 
 * Key differences from Variant B:
 * - Traditional info card layout
 * - Map section with retailer marker
 * - Standard category badges
 * - Product grid (when available)
 * - Sticky claim card in sidebar
 * 
 * To switch back: rename this file to page.tsx
 */

import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RetailerMap } from '@/components/maps/retailer-map';
import { MapPin, Clock, ExternalLink, Globe, Phone, Navigation, AlertCircle, CheckCircle2, TrendingUp, Flame, Leaf, Droplets, Cookie, Cigarette, Store } from 'lucide-react';
import Link from 'next/link';
import { Retailer } from '@/types/domain';
import { fetchDispensaryPageData } from '@/lib/dispensary-data';
import { Metadata } from 'next';
import { ProductGrid } from '@/components/product-grid';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { ChatbotPageContext } from '@/components/chatbot-page-context';

// Common cannabis categories for crawlable content
const CATEGORIES = [
    { name: 'Flower', icon: Leaf, color: 'bg-green-100 text-green-700' },
    { name: 'Pre-Rolls', icon: Cigarette, color: 'bg-amber-100 text-amber-700' },
    { name: 'Vapes', icon: Droplets, color: 'bg-blue-100 text-blue-700' },
    { name: 'Edibles', icon: Cookie, color: 'bg-purple-100 text-purple-700' },
    { name: 'Concentrates', icon: Flame, color: 'bg-orange-100 text-orange-700' },
    { name: 'Topicals', icon: Store, color: 'bg-pink-100 text-pink-700' },
];

// Popular brands (would come from city scan in production)
const POPULAR_BRANDS = ['Cookies', 'STIIIZY', 'Cresco', 'Verano', 'Select'];

// NOTE: This is a preserved variant - do not export as default
// To use this variant, rename file to page.tsx
export async function VariantADispensaryPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
    const { dispensarySlug } = await params;
    const { retailer: dispensary, products } = await fetchDispensaryPageData(dispensarySlug);

    if (!dispensary) {
        notFound();
    }

    // Generate Google Maps directions URL
    const directionsUrl = dispensary.lat && dispensary.lon
        ? `https://www.google.com/maps/dir/?api=1&destination=${dispensary.lat},${dispensary.lon}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${dispensary.address}, ${dispensary.city}, ${dispensary.state} ${dispensary.zip}`)}`;

    // Format phone for tel: link
    const phoneLink = dispensary.phone ? `tel:${dispensary.phone.replace(/\D/g, '')}` : null;

    // Freshness date (use updatedAt or current date as fallback)
    const freshnessDate = dispensary.updatedAt
        ? new Date(dispensary.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <main className="min-h-screen bg-background pb-20">
            <PageViewTracker
                pageType="dispensary"
                pageId={dispensary.id}
                pageSlug={dispensarySlug}
            />

            {/* Set chatbot context for this dispensary */}
            <ChatbotPageContext
                dispensaryId={dispensary.id}
                entityName={dispensary.name}
                entityType="dispensary"
            />
            {/* Header with Action Buttons */}
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

                        {/* Action Buttons: Directions + Call + Website */}
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" asChild className="gap-2">
                                <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                                    <Navigation className="w-4 h-4" />
                                    Directions
                                </a>
                            </Button>
                            {phoneLink && (
                                <Button variant="outline" asChild className="gap-2">
                                    <a href={phoneLink}>
                                        <Phone className="w-4 h-4" />
                                        Call
                                    </a>
                                </Button>
                            )}
                            {dispensary.website && (
                                <Button variant="default" asChild className="gap-2">
                                    <a href={dispensary.website} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-4 h-4" />
                                        Order Online
                                    </a>
                                </Button>
                            )}
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
                                        <Button variant="outline" className="w-full justify-between" asChild>
                                            <a href={dispensary.website || '#'} target="_blank" rel="noopener noreferrer">
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

                        {/* Categories Available (Crawlable SEO Content) */}
                        <section>
                            <h2 className="text-xl font-bold mb-4">Categories Available</h2>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map((cat) => (
                                    <Badge key={cat.name} variant="secondary" className={`${cat.color} px-3 py-2 text-sm gap-2`}>
                                        <cat.icon className="w-4 h-4" />
                                        {cat.name}
                                    </Badge>
                                ))}
                            </div>
                            <p className="text-sm text-muted-foreground mt-4">
                                {dispensary.name} in {dispensary.city}, {dispensary.state} typically carries flower, pre-rolls, vapes, edibles, concentrates, and topicals.
                                Contact the dispensary directly for current inventory availability.
                            </p>
                        </section>

                        {/* Top Brands at this Location (Crawlable SEO Content) */}
                        <section>
                            <h2 className="text-xl font-bold mb-4">Popular Brands Near {dispensary.city}</h2>
                            <div className="flex flex-wrap gap-2">
                                {POPULAR_BRANDS.map((brand) => (
                                    <Link key={brand} href={`/brands/${brand.toLowerCase().replace(/\s+/g, '-')}`}>
                                        <Badge variant="outline" className="px-3 py-2 text-sm hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                                            {brand}
                                        </Badge>
                                    </Link>
                                ))}
                            </div>
                        </section>

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
                                <div className="bg-muted/20 rounded-lg p-8">
                                    <div className="text-center mb-6">
                                        <p className="text-muted-foreground mb-4">
                                            Full menu data is being updated. Check back soon or visit the dispensary's website.
                                        </p>
                                        <Button variant="outline" asChild>
                                            <a href={dispensary.website || '#'} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                View Menu on Website
                                            </a>
                                        </Button>
                                    </div>

                                    {/* Crawlable fallback content */}
                                    <div className="border-t pt-6">
                                        <p className="text-sm text-muted-foreground text-center">
                                            Looking for cannabis products in {dispensary.city}? {dispensary.name} offers a variety of {CATEGORIES.map(c => c.name.toLowerCase()).join(', ')} from top brands like {POPULAR_BRANDS.slice(0, 3).join(', ')}.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {products.length > 8 && (
                                <div className="mt-8 text-center">
                                    <Button size="lg" className="w-full sm:w-auto">
                                        View Full Menu ({products.length})
                                    </Button>
                                </div>
                            )}

                            {/* Freshness Stamp + Data Source */}
                            <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
                                <span>Menu data refreshed: {freshnessDate}</span>
                                <span>Data source: CannMenus</span>
                            </div>
                        </section>

                        {/* Internal Links: Nearby ZIPs + City Hub */}
                        <section className="border-t pt-8">
                            <h2 className="text-lg font-semibold mb-4">Explore Nearby</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Link href={`/cities/${dispensary.city?.toLowerCase()}-${dispensary.state?.toLowerCase()}`} className="block">
                                    <Card className="hover:border-primary transition-colors">
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <Store className="w-5 h-5 text-primary" />
                                            <div>
                                                <p className="font-medium">{dispensary.city} Cannabis Guide</p>
                                                <p className="text-xs text-muted-foreground">All dispensaries in {dispensary.city}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                                <Link href={`/local/${dispensary.zip}`} className="block">
                                    <Card className="hover:border-primary transition-colors">
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <MapPin className="w-5 h-5 text-primary" />
                                            <div>
                                                <p className="font-medium">Dispensaries in {dispensary.zip}</p>
                                                <p className="text-xs text-muted-foreground">Browse by ZIP code</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            </div>
                        </section>

                        {/* Report an Issue Link */}
                        <div className="text-center py-4 border-t">
                            <Link href={`/brands/claim?name=${encodeURIComponent(dispensary.name)}&type=correction`} className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Is this info wrong? Report an issue
                            </Link>
                        </div>

                    </div>

                    {/* Right Rail - Unified Claim Module */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Unified Claim Conversion Module */}
                        <Card className="sticky top-20 border-l-4 border-l-green-500 shadow-lg">
                            <CardContent className="p-6 space-y-4">
                                {/* Header */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-5 h-5 text-green-600" />
                                        <span className="font-semibold">This page is getting noticed</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        <strong className="text-foreground">308 views</strong> in the last 30 days from customers searching for cannabis in {dispensary.city}.
                                    </p>
                                </div>

                                {/* Founders Offer */}
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Flame className="w-4 h-4 text-amber-600" />
                                        <span className="text-sm font-semibold text-amber-800">Founders Pricing Available</span>
                                    </div>
                                    <p className="text-xs text-amber-700 mb-2">
                                        Lock in <strong>$79/mo</strong> (normally $99/mo) – only <strong>75 spots left</strong>.
                                    </p>
                                </div>

                                {/* What You Unlock */}
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Claim to unlock:</p>
                                    <ul className="text-sm space-y-1 text-muted-foreground">
                                        <li className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            Update hours, address, links
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            See visitor analytics
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            Get Verified badge
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            Priority in local rankings
                                        </li>
                                    </ul>
                                </div>

                                {/* CTA Button */}
                                <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg">
                                    <Link href={`/brands/claim?name=${encodeURIComponent(dispensary.name)}&type=dispensary`}>
                                        Claim This Page
                                    </Link>
                                </Button>

                                <p className="text-xs text-center text-muted-foreground">
                                    Are you the owner or manager of {dispensary.name}?
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
                        '@type': 'LocalBusiness',
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
