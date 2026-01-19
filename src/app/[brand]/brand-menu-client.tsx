'use client';

import { useState, useEffect } from 'react';
import { ProductGrid } from '@/components/product-grid';
import { ProductDetailModal } from '@/components/product-detail-modal';
import DispensaryLocator from '@/components/dispensary-locator';
import { LeadCaptureForm } from '@/components/leads/lead-capture-form';
import Chatbot from '@/components/chatbot';
import { BundleDealsSection } from '@/components/demo/bundle-deals-section';
import type { Product, Retailer, Brand } from '@/types/domain';
import type { BundleDeal } from '@/types/bundles';
import { useStore } from '@/hooks/use-store';

interface BrandMenuClientProps {
  brand: Brand;
  products: Product[];
  retailers: Retailer[];
  brandSlug: string;
  bundles?: BundleDeal[];
}

const DEFAULT_PRIMARY_COLOR = '#16a34a';

export function BrandMenuClient({ brand, products, retailers, brandSlug, bundles = [] }: BrandMenuClientProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { addToCart } = useStore();

  // Extract theme color with fallback
  const primaryColor = brand.theme?.primaryColor || DEFAULT_PRIMARY_COLOR;

  // Load favorites from localStorage on mount
  useEffect(() => {
    const storedFavorites = localStorage.getItem(`favorites-${brand.id}`);
    if (storedFavorites) {
      setFavorites(new Set(JSON.parse(storedFavorites)));
    }
  }, [brand.id]);

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
    localStorage.setItem(`favorites-${brand.id}`, JSON.stringify(Array.from(newFavorites)));
  };

  const handleAddToCart = (product: Product, quantity: number) => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product, 'default');
    }
  };

  // Convert BundleDeal to BundleDealsSection format
  const bundlesForDisplay = bundles.map(b => ({
    id: b.id,
    name: b.name,
    description: b.description,
    originalPrice: b.originalTotal,
    bundlePrice: b.bundlePrice,
    savingsPercent: b.savingsPercent,
    image: b.imageUrl,
    products: b.products.map(p => p.name),
    badge: b.badgeText,
    backgroundColor: primaryColor,
  }));

  return (
    <>
      <div className="container mx-auto py-12 px-4 md:px-8">
        {/* Hero Image */}
        {brand.theme?.heroImageUrl && (
          <div className="mb-12 -mt-4 -mx-4 md:-mx-8">
            <img
              src={brand.theme.heroImageUrl}
              alt={`${brand.name} banner`}
              className="w-full h-48 md:h-64 object-cover"
            />
          </div>
        )}

        {/* Bundle Deals Section (if any) */}
        {bundlesForDisplay.length > 0 && (
          <BundleDealsSection
            bundles={bundlesForDisplay}
            title="Bundle Deals"
            subtitle="Save more when you bundle! Curated packs at special prices."
            primaryColor={primaryColor}
          />
        )}

        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8" style={{ color: primaryColor }}>Our Products</h2>
          <ProductGrid
            products={products}
            isLoading={false}
            brandSlug={brandSlug}
            variant="brand"
            isClaimedPage={brand.claimStatus === 'claimed'}
            onProductClick={setSelectedProduct}
            onFavorite={toggleFavorite}
            favorites={favorites}
          />
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Where to Buy</h2>
          <DispensaryLocator locations={retailers} />
        </section>

        <section className="max-w-xl mx-auto mt-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">Connect with {brand.name}</h2>
            <p className="text-slate-500">Have questions about our products? Send us a message.</p>
          </div>
          <LeadCaptureForm
            orgId={brand.id}
            orgName={brand.name}
            orgType="brand"
            variant="inline"
          />
        </section>
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onFavorite={toggleFavorite}
        isFavorite={selectedProduct ? favorites.has(selectedProduct.id) : false}
        primaryColor={primaryColor}
      />

      {/* Chatbot integrated with real products */}
      <Chatbot
        products={products}
        brandId={brand.id}
        initialOpen={false}
      />
    </>
  );
}
