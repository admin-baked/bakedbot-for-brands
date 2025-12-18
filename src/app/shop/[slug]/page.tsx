
import { fetchZipPageData } from '@/lib/zip-data';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/shop/product-card';
import { Sparkles, MapPin, ArrowLeft } from 'lucide-react';
import { SmokeyCtaCard } from '@/components/foot-traffic/smokey-cta-card';

// Force dynamic because we use searchParams (optional) or just slug
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    // Slug format: "90210-dispensary"
    const zipCode = slug.split('-')[0];
    const { zip } = await fetchZipPageData(zipCode);

    if (!zip) return { title: 'Dispensary Not Found' };

    return {
        title: `Dispensaries in ${zip.zipCode} (${zip.city}) | BakedBot`,
        description: `Shop cannabis in ${zip.city}, ${zip.zipCode}. Browse menus from ${zip.dispensaryCount} local dispensaries.`,
    };
}

export default async function ZipPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const zipCode = slug.split('-')[0];

    // Basic validation
    if (!/^\d{5}$/.test(zipCode)) {
        notFound();
    }

    const { zip, products } = await fetchZipPageData(zipCode);

    if (!zip) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="bg-gradient-to-b from-green-50 to-background border-b pt-12 pb-8">
                <div className="container mx-auto px-4 text-center">
                    <Link href={`/city/${zip.city.toLowerCase().replace(/ /g, '-')}-cannabis-guide`} className="inline-flex items-center text-sm text-muted-foreground hover:text-green-700 mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to {zip.city} Guide
                    </Link>

                    <Badge variant="outline" className="mb-4 bg-background block w-fit mx-auto">
                        Zip Code {zip.zipCode}
                    </Badge>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Dispensaries in {zip.city}, {zip.state}
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        {zip.seoIntro || `Explore the best cannabis products from ${zip.dispensaryCount} dispensaries serving the ${zip.zipCode} area.`}
                    </p>

                    {/* Smokey CTA */}
                    <div className="mt-8 max-w-md mx-auto">
                        <SmokeyCtaCard zipCode={zip.zipCode} city={zip.city} state={zip.state} />
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-12">

                {/* Product Grid */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Featured Products in {zip.zipCode}</h2>
                        <Button variant="ghost" asChild>
                            <Link href="/shop">View All <Sparkles className="w-4 h-4 ml-2" /></Link>
                        </Button>
                    </div>

                    {products.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {products.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={{
                                        ...product,
                                        score: 0.99, // Implicit high relevance for local
                                        reasons: ['Local favorite']
                                    }}
                                // Use a simple click handler or link wrapper in the card
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-muted/20 rounded-lg">
                            <StoreIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                            <p className="text-lg font-medium text-slate-700">Checking local menus...</p>
                            <p className="text-slate-500 mb-6">Smokey is scanning for real-time inventory in {zip.zipCode}.</p>
                            <Button variant="outline">
                                Check Nearby Zips
                            </Button>
                        </div>
                    )}
                </section>

                {/* Internal Linking / Nearby */}
                <section className="mt-16 pt-8 border-t">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                        Nearby Areas in {zip.city}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {/* Placeholder for sibling zips - in real app, fetch from City config */}
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/city/${zip.city.toLowerCase().replace(/ /g, '-')}-cannabis-guide`}>
                                All {zip.city} Zips
                            </Link>
                        </Button>
                    </div>
                </section>

            </div>
        </main>
    );
}

function StoreIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
            <path d="M2 7h20" />
            <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
        </svg>
    )
}
