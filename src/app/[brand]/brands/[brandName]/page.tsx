/**
 * Brand Detail Page
 * Shows all products from a specific brand
 * Route: /[brand]/brands/[brandName]
 */

import { notFound } from 'next/navigation';
import { fetchBrandPageData } from '@/lib/brand-data';
import { MenuWithAgeGate } from '@/components/menu/menu-with-age-gate';
import { BrandMenuClient } from '../../brand-menu-client';
import { getActiveBundles } from '@/app/actions/bundles';
import { getHeroSlides } from '@/app/actions/hero-slides';
import { getPublicMenuSettings } from '@/server/actions/loyalty-settings';
import type { Product } from '@/types/products';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ brand: string; brandName: string }>;
}) {
  const { brand: brandParam, brandName } = await params;

  // Decode brand name from URL
  const decodedBrandName = decodeURIComponent(brandName);

  // Fetch main brand page data
  const { brand, products: allProducts, retailers, featuredBrands = [], carousels = [] } = await fetchBrandPageData(brandParam);

  if (!brand) {
    notFound();
  }

  // Filter products to only those from the selected brand
  // Match by brandName field (from POS) or brand name
  const products = allProducts.filter((p: Product) => {
    const productBrandName = p.brandName?.toLowerCase() || '';
    const targetBrandName = decodedBrandName.toLowerCase();
    return productBrandName === targetBrandName;
  });

  if (products.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4">🍃</div>
          <h1 className="text-2xl font-bold mb-2">No Products Found</h1>
          <p className="text-gray-600 mb-6">
            {decodedBrandName} doesn't have products available right now.
          </p>
          <a
            href={`/${brandParam}`}
            className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            ← Back to Menu
          </a>
        </div>
      </main>
    );
  }

  // Fetch bundles and hero slides
  let bundles: import('@/types/bundles').BundleDeal[] = [];
  try {
    bundles = await getActiveBundles(brand.id);
    // Filter bundles that contain products from this brand
    bundles = bundles.filter(b =>
      b.products.some((p) => products.some((prod: Product) => prod.id === p.productId))
    );
  } catch (e) {
    console.error('Failed to fetch bundles:', e);
  }

  let heroSlides: import('@/types/hero-slides').HeroSlide[] = [];
  try {
    heroSlides = await getHeroSlides(brand.id);
  } catch (e) {
    console.error('Failed to fetch hero slides:', e);
  }

  // Fetch public menu settings
  const publicMenuSettings = await getPublicMenuSettings(brand.id).catch(() => null);

  return (
    <MenuWithAgeGate
      brandId={brand.id}
      source={`brand-detail-${brandName}`}
    >
      <main className="relative min-h-screen">
        <BrandMenuClient
          brand={brand}
          products={products}
          retailers={retailers}
          brandSlug={brandParam}
          bundles={bundles}
          heroSlides={heroSlides}
          featuredBrands={featuredBrands}
          carousels={carousels}
          publicMenuSettings={publicMenuSettings}
        />
      </main>
    </MenuWithAgeGate>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string; brandName: string }>;
}) {
  const { brandName } = await params;
  const decodedBrandName = decodeURIComponent(brandName);

  return {
    title: `${decodedBrandName} Products`,
    description: `Shop products from ${decodedBrandName}`,
  };
}
