
import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { BrandHeader } from '@/components/brand/brand-header';
import { ProductGrid } from '@/components/product-grid';
import { Button } from '@/components/ui/button';
import { StickyOperatorBox } from '@/components/brand/sticky-operator-box';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

export default async function GlobalBrandPage({ params }: { params: Promise<{ brandSlug: string }> }) {
    const { brandSlug } = await params;
    const { brand, products } = await fetchBrandPageData(brandSlug);

    if (!brand) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-background pb-20">
            <PageViewTracker
                pageType="brand"
                pageId={brand.id}
                pageSlug={brandSlug}
            />
            <BrandHeader
                brandName={brand.name}
                logoUrl={brand.logoUrl}
                verified={brand.verificationStatus === 'verified' || brand.verificationStatus === 'featured'}
            />

            {/* Sticky Operator Box for Mobile/Desktop */}
            <div className="container mx-auto px-4 mt-6 mb-8 relative">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        {/* Hero Section */}
                        <section className="relative bg-gradient-to-b from-secondary/30 to-background rounded-2xl p-8 text-center">
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                                {brand.name}
                            </h1>
                            <p className="text-lg text-muted-foreground mb-8 text-balance">
                                Discover products from {brand.name}. Find availability near you.
                            </p>

                            <div className="max-w-md mx-auto bg-card border rounded-full p-2 flex items-center shadow-sm">
                                <MapPin className="ml-3 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Enter your ZIP code..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 px-3 text-sm outline-none"
                                />
                                <Button className="rounded-full">Find Nearby</Button>
                            </div>
                        </section>

                        {/* Product Showcase */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold">Top Products</h2>
                                <Link href="#" className="text-primary hover:underline text-sm font-medium">
                                    View All
                                </Link>
                            </div>
                            <ProductGrid products={products} isLoading={false} brandSlug={brandSlug} variant="brand" />
                        </section>
                    </div>

                    <div className="lg:col-span-4">
                        <div className="sticky top-24 space-y-6">
                            <StickyOperatorBox
                                entityName={brand.name}
                                entityType="brand"
                                verificationStatus={brand.verificationStatus || 'unverified'}
                            />

                            {/* Placeholder for Rankings/Stats */}
                            <div className="bg-muted/20 border rounded-lg p-4">
                                <h3 className="font-semibold mb-2 text-sm">Brand Stats</h3>
                                <div className="text-sm text-muted-foreground">
                                    <p>Seen in {brand.dispensaryCount || 0} dispensaries</p>
                                    <p>Top Category: {products[0]?.category || 'Various'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
