// import { CategoryNav } from '@/components/dispensary/category-nav';
// import { DealsCarousel } from '@/components/dispensary/deals-carousel';
import Chatbot from '@/components/chatbot';
import { ProductGrid } from '@/components/product-grid';
import { demoProducts } from '@/lib/demo/demo-data';
import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import DispensaryLocator from '@/components/dispensary-locator';
import { DispensaryHeader } from '@/components/dispensary/dispensary-header';

export default async function BrandPage({ params }: { params: Promise<{ brand: string }> }) {
    const { brand: brandParam } = await params;

    // Fetch real data
    const { brand, products, retailers } = await fetchBrandPageData(brandParam);

    // If brand not found, show 404
    if (!brand) {
        // Fallback for "demo" slug to show the placeholder experience
        if (brandParam === 'demo' || brandParam === 'demo-brand') {
            return (
                <main className="relative min-h-screen">
                    <DispensaryHeader brandName="Demo Dispensary" />
                    {/* <CategoryNav />
                    <DealsCarousel /> */}
                    <div className="container mx-auto py-8">
                        <ProductGrid products={demoProducts} isLoading={false} />
                    </div>
                    {/* Demo locator if we had demo retailers, or empty */}
                    <DispensaryLocator locations={[]} isLoading={false} />
                    <Chatbot products={demoProducts} brandId="demo" initialOpen={true} />
                </main>
            );
        }
        notFound();
    }

    return (
        <main className="relative min-h-screen">
            {/* Removed Dispensary-specific CategoryNav and DealsCarousel for cleaner Brand look */}

            <div className="container mx-auto py-12 px-4 md:px-8">

                {/* Brand Header Section could go here if needed, but DispensaryHeader handles top nav */}

                <section className="mb-16">
                    <h2 className="text-3xl font-bold mb-8">Our Products</h2>
                    <ProductGrid products={products} isLoading={false} brandSlug={brandParam} variant="brand" />
                </section>

                <section className="mb-16">
                    <h2 className="text-2xl font-bold mb-6">Where to Buy</h2>
                    <DispensaryLocator locations={retailers} />
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
