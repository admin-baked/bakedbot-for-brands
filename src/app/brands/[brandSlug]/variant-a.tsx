/**
 * VARIANT A - Original Global Brand Page Design
 * 
 * This is the original brand page design (preserved for A/B testing).
 * Current live page: page.tsx (Variant B - B2B design)
 * 
 * Key differences from Variant B:
 * - BrandHeader component with search
 * - BrandAbout section
 * - WhereToBuy with retailer list
 * - ProductGrid showcase
 * - Sticky claim card in sidebar
 * 
 * To switch back: rename this file to page.tsx
 */

import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { BrandHeader } from '@/components/brand/brand-header';
import { ProductGrid } from '@/components/product-grid';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { ChatbotPageContext } from '@/components/chatbot-page-context';
import Link from 'next/link';
import { BrandAbout } from '@/components/brand/brand-about';
import { WhereToBuy } from '@/components/brand/where-to-buy';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, CheckCircle2, Flame, AlertCircle, MapPin, Store } from 'lucide-react';

// NOTE: This is a preserved variant - do not export as default
// To use this variant, rename file to page.tsx
export async function VariantAGlobalBrandPage({ params }: { params: Promise<{ brandSlug: string }> }) {
    const { brandSlug } = await params;
    const { brand, products, retailers } = await fetchBrandPageData(brandSlug);

    if (!brand) {
        notFound();
    }

    // Freshness date
    const freshnessDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <main className="min-h-screen bg-background pb-20">
            <PageViewTracker
                pageType="brand"
                pageId={brand.id}
                pageSlug={brandSlug}
            />

            {/* Set chatbot context for this brand */}
            <ChatbotPageContext
                brandId={brand.id}
                entityName={brand.name}
                entityType="brand"
            />

            <BrandHeader
                brandName={brand.name}
                logoUrl={brand.logoUrl}
                verified={brand.verificationStatus === 'verified' || brand.verificationStatus === 'featured'}
            />

            <div className="container mx-auto px-4 mt-6 mb-8 relative">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        {/* Hero Section */}
                        <section className="relative bg-gradient-to-b from-secondary/30 to-background rounded-2xl p-8 text-center mb-8">
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                                {brand.name}
                            </h1>
                            <p className="text-lg text-muted-foreground mb-4 text-balance">
                                Discover products from {brand.name}. Find availability near you.
                            </p>

                            <Badge variant="outline" className="bg-background/50">
                                Last Updated: {freshnessDate}
                            </Badge>
                        </section>

                        {/* About Section */}
                        <BrandAbout brand={brand} />

                        {/* Where to Buy */}
                        <WhereToBuy retailers={retailers || []} brandName={brand.name} />

                        {/* Product Showcase */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold">Top Products</h2>
                                <Link href="#" className="text-primary hover:underline text-sm font-medium">
                                    View All
                                </Link>
                            </div>
                            <ProductGrid products={products} isLoading={false} brandSlug={brandSlug} variant="brand" />

                            {/* Freshness Stamp */}
                            <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
                                <span>Product data refreshed: {freshnessDate}</span>
                                <span>Data source: CannMenus</span>
                            </div>
                        </section>

                        {/* Internal Links: Explore */}
                        <section className="border-t pt-8">
                            <h2 className="text-lg font-semibold mb-4">Explore {brand.name}</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {retailers && retailers.length > 0 && retailers[0]?.city && (
                                    <Link href={`/cities/${retailers[0].city.toLowerCase().replace(/\s+/g, '-')}-${retailers[0].state?.toLowerCase()}`} className="block">
                                        <Card className="hover:border-primary transition-colors">
                                            <CardContent className="p-4 flex items-center gap-3">
                                                <Store className="w-5 h-5 text-primary" />
                                                <div>
                                                    <p className="font-medium">{brand.name} in {retailers[0].city}</p>
                                                    <p className="text-xs text-muted-foreground">Find local dispensaries</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                )}
                                <Link href={`/brands/${brandSlug}/near/60605`} className="block">
                                    <Card className="hover:border-primary transition-colors">
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <MapPin className="w-5 h-5 text-primary" />
                                            <div>
                                                <p className="font-medium">{brand.name} Near You</p>
                                                <p className="text-xs text-muted-foreground">Find by ZIP code</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            </div>
                        </section>

                        {/* Report an Issue Link */}
                        <div className="text-center py-4 border-t">
                            <Link href={`/brands/claim?name=${encodeURIComponent(brand.name)}&type=correction`} className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Is this info wrong? Report an issue
                            </Link>
                        </div>

                    </div>

                    {/* Right Rail - Unified Claim Module */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-24 space-y-6">
                            {/* Unified Claim Conversion Module */}
                            <Card className="border-l-4 border-l-green-500 shadow-lg">
                                <CardContent className="p-6 space-y-4">
                                    {/* Header */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="w-5 h-5 text-green-600" />
                                            <span className="font-semibold">This brand is trending</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            <strong className="text-foreground">{brand.dispensaryCount || retailers?.length || 50}+ dispensaries</strong> carry {brand.name} products.
                                        </p>
                                    </div>

                                    {/* Founders Offer */}
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Flame className="w-4 h-4 text-amber-600" />
                                            <span className="text-sm font-semibold text-amber-800">Founders Pricing Available</span>
                                        </div>
                                        <p className="text-xs text-amber-700 mb-2">
                                            Lock in <strong>$79/mo</strong> (normally $99/mo) – limited spots available.
                                        </p>
                                    </div>

                                    {/* What You Unlock */}
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Claim to unlock:</p>
                                        <ul className="text-sm space-y-1 text-muted-foreground">
                                            <li className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                Verified Brand badge
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                Edit brand info & products
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                See visitor analytics
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                Priority in search rankings
                                            </li>
                                        </ul>
                                    </div>

                                    {/* CTA Button */}
                                    <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg">
                                        <Link href={`/brands/claim?name=${encodeURIComponent(brand.name)}&type=brand`}>
                                            Claim This Brand
                                        </Link>
                                    </Button>

                                    <p className="text-xs text-center text-muted-foreground">
                                        Are you the owner or authorized rep for {brand.name}?
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Brand Stats */}
                            <div className="bg-muted/20 border rounded-lg p-4">
                                <h3 className="font-semibold mb-2 text-sm">Brand Stats</h3>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>Seen in {brand.dispensaryCount || retailers?.length || 0} dispensaries</p>
                                    <p>Top Category: {products[0]?.category || 'Various'}</p>
                                    <p>{products.length} products listed</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Brand',
                        name: brand.name,
                        description: brand.description,
                        logo: brand.logoUrl,
                        url: `https://bakedbot.ai/brands/${brandSlug}`,
                        sameAs: brand.website ? [brand.website] : []
                    })
                }}
            />
        </main>
    );
}
