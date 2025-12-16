
import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { BrandHeader } from '@/components/brand/brand-header';
import { ProductGrid } from '@/components/product-grid';
import { Button } from '@/components/ui/button';
import { StickyOperatorBox } from '@/components/brand/sticky-operator-box';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import Link from 'next/link';
import { Metadata } from 'next';
import { BrandAbout } from '@/components/brand/brand-about';
import { WhereToBuy } from '@/components/brand/where-to-buy';
import { Badge } from '@/components/ui/badge';

export async function generateMetadata({ params }: { params: Promise<{ brandSlug: string }> }): Promise<Metadata> {
    const { brandSlug } = await params;
    const { brand } = await fetchBrandPageData(brandSlug);

    if (!brand) return { title: 'Brand Not Found' };

    return {
        title: `${brand.name} Cannabis Products | BakedBot`,
        description: brand.description?.slice(0, 160) || `Discover premium cannabis products from ${brand.name}. Find availability near you and verify authenticity on BakedBot.`,
        openGraph: {
            title: `${brand.name} | BakedBot`,
            description: `Verify authenticity and find ${brand.name} products near you.`,
            images: brand.logoUrl ? [brand.logoUrl] : [],
        }
    };
}

export default async function GlobalBrandPage({ params }: { params: Promise<{ brandSlug: string }> }) {
    const { brandSlug } = await params;
    const { brand, products, retailers } = await fetchBrandPageData(brandSlug);

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
                        <section className="relative bg-gradient-to-b from-secondary/30 to-background rounded-2xl p-8 text-center mb-8">
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                                {brand.name}
                            </h1>
                            <p className="text-lg text-muted-foreground mb-4 text-balance">
                                Discover products from {brand.name}. Find availability near you.
                            </p>

                            <Badge variant="outline" className="bg-background/50">
                                Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
