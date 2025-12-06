import { fetchCollectionData } from '@/lib/brand-data';
import { ProductGrid } from '@/components/product-grid';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ brand: string; slug: string }> }): Promise<Metadata> {
    const { brand: brandParam, slug } = await params;
    const { brand, categoryName } = await fetchCollectionData(brandParam, slug);

    if (!brand) {
        return { title: 'Collection Not Found' };
    }

    return {
        title: `Shop ${categoryName} | ${brand.name}`,
        description: `Browse our selection of ${categoryName} at ${brand.name}.`,
    };
}

export default async function CollectionPage({ params }: { params: Promise<{ brand: string; slug: string }> }) {
    const { brand: brandParam, slug } = await params;
    const { brand, products, categoryName } = await fetchCollectionData(brandParam, slug);

    if (!brand) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-background">
            <div className="container mx-auto py-8 px-4 md:px-6">
                <div className="mb-6">
                    <Link href={`/${brandParam}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to All Products
                    </Link>
                </div>

                <header className="mb-10">
                    <h1 className="text-3xl font-extrabold tracking-tight mb-2">{categoryName}</h1>
                    <p className="text-muted-foreground">
                        {products.length} result{products.length !== 1 ? 's' : ''} found
                    </p>
                </header>

                <section>
                    <ProductGrid products={products} isLoading={false} brandSlug={brandParam} />
                </section>
            </div>
        </main>
    );
}
