
import { fetchLocalBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { BrandHeader } from '@/components/brand/brand-header';
import { WhereToBuy } from '@/components/brand/where-to-buy';
import { StickyOperatorBox } from '@/components/brand/sticky-operator-box';
import { BrandOpportunityModule } from '@/components/brand/brand-opportunity-module';
import { RetailerMap } from '@/components/maps/retailer-map';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Helper to sanitize Retailer to RetailerLite
function toRetailerLite(r: any) {
    return {
        id: r.id,
        name: r.name,
        address: r.address,
        isOpen: true // Placeholder
    };
}

export default async function LocalBrandPage({ params }: { params: Promise<{ brandSlug: string; zip: string }> }) {
    const { brandSlug, zip } = await params;
    const { brand, retailers, missingCount } = await fetchLocalBrandPageData(brandSlug, zip);

    if (!brand) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-background pb-20">
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
                                retailers={retailers.map(toRetailerLite)}
                                brandName={brand.name}
                                zipCode={zip}
                            />
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
                                <Button variant="outline">Set Drop Alert</Button>
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
                                {/* Future: Neighboring ZIPs */}
                            </div>
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

                        {/* Featured Slot Logic (Placeholder) */}
                        {/* if (features.hasFeaturedPartner) { <FeaturedPartnerCard ... /> } */}
                    </div>
                </div>
            </div>
        </main>
    );
}
