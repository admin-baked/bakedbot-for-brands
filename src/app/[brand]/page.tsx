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
import { BrandMenuClient } from './brand-menu-client';
import { getActiveBundles } from '@/app/actions/bundles';
import { MenuWithAgeGate } from '@/components/menu/menu-with-age-gate';

// Disable caching to ensure fresh data on each request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BrandPage({ params }: { params: Promise<{ brand: string }> }) {
    const { brand: brandParam } = await params;

    // Reserved paths that should not be treated as brand slugs
    const RESERVED_PATHS = [
        'help',
        'dashboard',
        'api',
        'login',
        'signup',
        'auth',
        'vibe',
        '_next',
        'favicon.ico',
    ];

    // If this is a reserved path, let Next.js handle it with the proper route
    if (RESERVED_PATHS.includes(brandParam)) {
        notFound();
    }

    // Fetch real data
    const { brand, products, retailers, featuredBrands = [], carousels = [] } = await fetchBrandPageData(brandParam);

    // If brand not found, show helpful page or demo
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
        // Show a friendly "brand not found" page instead of hard 404
        // This helps users who haven't completed setup yet
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md mx-auto p-8">
                    <div className="text-6xl mb-4">🌿</div>
                    <h1 className="text-2xl font-bold mb-2">Brand Not Found</h1>
                    <p className="text-gray-600 mb-6">
                        The brand page &quot;{brandParam}&quot; hasn&apos;t been set up yet.
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                        If you own this brand, please complete your setup in the dashboard.
                    </p>
                    <a
                        href="/dashboard/brand-page"
                        className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                        Set Up Your Brand Page
                    </a>
                </div>
            </main>
        );
    }

    // Fetch active bundles for this brand/org
    let bundles: import('@/types/bundles').BundleDeal[] = [];
    try {
        bundles = await getActiveBundles(brand.id);
    } catch (e) {
        console.error('Failed to fetch bundles:', e);
    }

    return (
        <MenuWithAgeGate
            brandId={brand.id}
            source={`brand-menu-${brandParam}`}
        >
            <main className="relative min-h-screen">
                <BrandMenuClient
                    brand={brand}
                    products={products}
                    retailers={retailers}
                    brandSlug={brandParam}
                    bundles={bundles}
                    featuredBrands={featuredBrands}
                    carousels={carousels}
                />
            </main>
        </MenuWithAgeGate>
    );
}
