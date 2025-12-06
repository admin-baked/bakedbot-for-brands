import Chatbot from '@/components/chatbot';
import { ProductGrid } from '@/components/product-grid';
import { demoProducts } from '@/lib/demo/demo-data'; // Keep as fallback/demo
import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
    const { brand: brandParam } = await params;
    const { brand } = await fetchBrandPageData(brandParam);

    if (!brand) {
        return {
            title: 'Store Not Found',
        };
    }

    return {
        title: `${brand.name} | Official Store`,
        description: `Shop the best cannabis products from ${brand.name}.`,
    };
}

export default async function BrandPage({ params }: { params: Promise<{ brand: string }> }) {
    const { brand: brandParam } = await params;

    // Fetch real data
    const { brand, products } = await fetchBrandPageData(brandParam);

    // If brand not found, show 404
    if (!brand) {
        // Fallback for "demo" slug to show the placeholder experience
        if (brandParam === 'demo' || brandParam === 'demo-brand') {
            return (
                <main className="relative min-h-screen">
                    <div className="container mx-auto py-8">
                        <h1 className="text-3xl font-bold mb-6 capitalize">Demo Brand</h1>
                        <div className="p-8 border rounded-lg bg-card text-card-foreground shadow-sm mb-8">
                            <h2 className="text-xl mb-4">Welcome to the Demo Store</h2>
                            <p className="text-muted-foreground mb-4">
                                This is a demonstration of the Headless Menu system.
                            </p>
                        </div>
                        <ProductGrid products={demoProducts} isLoading={false} />
                    </div>
                    <Chatbot products={demoProducts} brandId="demo" initialOpen={true} />
                </main>
            );
        }
        notFound();
    }

    return (
        <main className="relative min-h-screen">
            <div className="container mx-auto py-8 px-4 md:px-6">
                <header className="mb-10 flex flex-col md:flex-row gap-6 items-center md:items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight mb-2">{brand.name}</h1>
                        <p className="text-muted-foreground max-w-2xl">
                            Welcome to our official product catalog. Explore our latest strains, edibles, and vapes.
                        </p>
                    </div>
                    {/* Placeholder for Brand Logo if available */}
                    {brand.logoUrl && (
                        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={brand.logoUrl} alt={brand.name} className="object-cover w-full h-full" />
                        </div>
                    )}
                </header>

                <section>
                    <ProductGrid products={products} isLoading={false} brandSlug={brandParam} />
                </section>
            </div>

            {/* Chatbot integrated with real products */}
            <Chatbot
                products={products}
                brandId={brand.id}
                initialOpen={false} // Closed by default on real sites usually
            />
        </main>
    );
}
