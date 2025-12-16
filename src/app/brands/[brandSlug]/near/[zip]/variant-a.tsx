/**
 * VARIANT A - Original Local Brand Page Design
 * 
 * This is the original local brand page design (preserved for A/B testing).
 * Current live page: page.tsx (Variant B - B2B design)
 * 
 * Key differences from Variant B:
 * - BrandHeader component with search
 * - WhereToBuy with retailer list
 * - RetailerMap for dispensary locations
 * - StickyOperatorBox for claiming
 * - BrandOpportunityModule for B2B
 * 
 * To switch back: rename this file to page.tsx
 */

import { fetchLocalBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { BrandHeader } from '@/components/brand/brand-header';
import { WhereToBuy } from '@/components/brand/where-to-buy';
import { StickyOperatorBox } from '@/components/brand/sticky-operator-box';
import { BrandOpportunityModule } from '@/components/brand/brand-opportunity-module';
import { DropAlertButton } from '@/components/brand/drop-alert-button';
import { RetailerMap } from '@/components/maps/retailer-map';
import { Button } from '@/components/ui/button';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { ChatbotPageContext } from '@/components/chatbot-page-context';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

// NOTE: This is a preserved variant - do not export as default
// To use this variant, rename file to page.tsx
export async function VariantALocalBrandPage({ params }: { params: Promise<{ brandSlug: string; zip: string }> }) {
    const { brandSlug, zip } = await params;
    const { brand, retailers, missingCount } = await fetchLocalBrandPageData(brandSlug, zip);

    if (!brand) {
        notFound();
    }

    // Freshness date
    const freshnessDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <main className="min-h-screen bg-background pb-20">
            <PageViewTracker
                pageType="brand"
                pageId={`${brand.id}_${zip}`}
                pageSlug={`${brandSlug}/near/${zip}`}
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

            <div className="container mx-auto px-4 mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-8 space-y-8">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight mb-2">
                                {brand.name} near {zip}
                            </h1>
                            <p className="text-muted-foreground">
                                Find {brand.name} products in stock at {retailers.length} dispensaries near you.
                            </p>
                        </div>

                        {/* Where to Buy Module */}
                        <section>
                            <h2 className="text-xl font-semibold mb-4">Where to buy {brand.name}</h2>
                            <WhereToBuy
                                retailers={retailers}
                                brandName={brand.name}
                            />

                            {/* Freshness Stamp */}
                            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
                                <span>Data refreshed: {freshnessDate}</span>
                                <span>Source: CannMenus</span>
                            </div>
                        </section>

                        {/* Map Section */}
                        {retailers.length > 0 && (
                            <section>
                                <h2 className="text-xl font-semibold mb-4">Dispensaries on Map</h2>
                                <RetailerMap
                                    retailers={retailers.map(r => ({
                                        id: r.id,
                                        name: r.name,
                                        address: r.address || 'Address unavailable',
                                        lat: r.lat,
                                        lng: r.lon
                                    }))}
                                    height="350px"
                                />
                            </section>
                        )}

                        {/* Fallback CTA if few retailers found */}
                        {retailers.length === 0 && (
                            <div className="bg-muted p-6 rounded-lg text-center">
                                <h3 className="font-semibold mb-2">Can&apos;t find {brand.name} nearby?</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Get notified when it drops in your area.
                                </p>
                                <DropAlertButton brandName={brand.name} zipCode={zip} />
                            </div>
                        )}

                        <div className="pt-8 border-t">
                            <h3 className="text-lg font-semibold mb-4">Explore Nearby</h3>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" size="sm" asChild>
                                    <Link href={`/local/${zip}`}>
                                        Dispensaries in {zip} (All Brands)
                                    </Link>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/brands/${brandSlug}`}>
                                        View All {brand.name} Products
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        {/* Report an Issue Link */}
                        <div className="text-center py-4 border-t">
                            <Link href={`/brands/claim?name=${encodeURIComponent(brand.name)}&type=correction`} className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Is this info wrong? Report an issue
                            </Link>
                        </div>
                    </div>

                    {/* Right Rail / Sticky Operator */}
                    <div className="lg:col-span-4 space-y-6">
                        <StickyOperatorBox
                            entityName={brand.name}
                            entityType="brand"
                            verificationStatus={brand.verificationStatus || 'unverified'}
                        />

                        <BrandOpportunityModule
                            brandName={brand.name}
                            missingCount={missingCount}
                            nearbyZip={zip}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
