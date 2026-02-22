'use client';

/**
 * Brand Menu Client - Production Brand/Dispensary Page Experience
 * Supports two menu modes based on brand.menuDesign:
 *
 * DISPENSARY MODE (menuDesign: 'dispensary'):
 * - Hero carousel with promotions
 * - Featured brands carousel
 * - Category grid
 * - Bundle deals
 * - Featured/deal products
 * - All products with filters
 *
 * BRAND MODE (menuDesign: 'brand' or default):
 * - Brand hero with stats and CTAs
 * - Category grid
 * - Featured/all products with filters
 * - Dispensary locator flow (for local pickup)
 * - Checkout flow
 * - Smokey AI Chatbot
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { normalizeCategoryName } from '@/lib/utils/product-image';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Search, Store, Truck, Cookie, Shirt, Leaf, Wind, Sparkles, Droplet, Heart, Package, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStore } from '@/hooks/use-store';
import type { Product, Retailer, Brand } from '@/types/domain';
import type { BundleDeal } from '@/types/bundles';
import type { HeroSlide } from '@/types/hero-slides';
import type { FeaturedBrand } from '@/server/actions/featured-brands';
import type { Carousel } from '@/types/carousels';

// Menu management components (dashboard only)
import { ManagedProductGrid } from '@/components/menu/ManagedProductGrid';

// Brand Menu Components
import { BrandMenuHeader } from '@/components/demo/brand-menu-header';
import { BrandHero } from '@/components/demo/brand-hero';
import { CategoryGrid } from '@/components/demo/category-grid';
import { ProductSection } from '@/components/demo/product-section';
import { OversizedProductCard } from '@/components/demo/oversized-product-card';
import { DispensaryLocatorFlow } from '@/components/demo/dispensary-locator-flow';
import { DemoFooter } from '@/components/demo/demo-footer';
import { ProductDetailModal } from '@/components/demo/product-detail-modal';
import { BundleDealsSection } from '@/components/demo/bundle-deals-section';
import { CartSlideOver } from '@/components/demo/cart-slide-over';
import { CheckoutFlow } from '@/components/checkout/checkout-flow';
import { ShippingCheckoutFlow } from '@/components/checkout/shipping-checkout-flow';
import Chatbot from '@/components/chatbot';

// Dispensary Menu Components
import { DemoHeader } from '@/components/demo/demo-header';
import { HeroCarousel } from '@/components/demo/hero-carousel';
import { FeaturedBrandsCarousel } from '@/components/demo/featured-brands-carousel';
import { MenuInfoBar } from '@/components/demo/menu-info-bar';
import type { PublicMenuSettings } from '@/components/demo/menu-info-bar';

interface BrandMenuClientProps {
  brand: Brand;
  products: Product[];
  retailers: Retailer[];
  brandSlug: string;
  bundles?: BundleDeal[];
  heroSlides?: HeroSlide[];
  featuredBrands?: FeaturedBrand[];
  carousels?: Carousel[];
  publicMenuSettings?: PublicMenuSettings | null;
  isManageMode?: boolean;
  onProductReorder?: (updates: { id: string; sortOrder: number }[]) => Promise<void>;
  onToggleFeatured?: (productId: string, featured: boolean) => Promise<void>;
}

// Category order for display
const CATEGORY_ORDER = ['Flower', 'Pre-roll', 'Vapes', 'Edibles', 'Concentrates', 'Tinctures', 'Topicals', 'Accessories', 'Merchandise', 'Apparel'];

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Flower': Leaf,
  'Pre-roll': Wind,
  'Pre-Rolls': Wind,
  'Vapes': Wind,
  'Edibles': Cookie,
  'Concentrates': Sparkles,
  'Tinctures': Droplet,
  'Topicals': Heart,
  'Accessories': Package,
  'Merchandise': Shirt,
  'Apparel': Shirt,
};

const DEFAULT_PRIMARY_COLOR = '#16a34a';

type BrandView = 'shop' | 'locator' | 'checkout' | 'shipping-checkout';

export function BrandMenuClient({ brand, products, retailers, brandSlug, bundles = [], heroSlides = [], featuredBrands = [], carousels = [], publicMenuSettings, isManageMode = false, onProductReorder, onToggleFeatured }: BrandMenuClientProps) {
  // URL params for all filtering
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get('category') || 'all';
  const urlSort = searchParams.get('sort') || 'popular';
  const urlSearch = searchParams.get('q') || '';
  const urlEffect = searchParams.get('effect') || null;

  // Check if a URL is a real product image (not a stock photo or placeholder)
  const isRealImage = (url?: string): boolean => {
    if (!url || url.trim() === '') return false;
    if (url.includes('unsplash.com')) return false; // Filter out old Unsplash stock photos
    if (url.includes('placeholder')) return false;
    if (url.startsWith('/icon') || url.startsWith('/bakedbot')) return false; // Skip our own mascot if it leaked into DB
    return true;
  };

  // Normalize products: clean up POS category strings + replace stock photo placeholders with Smokey
  const normalizedProducts = useMemo(() => products.map(p => ({
    ...p,
    category: normalizeCategoryName(p.category),
    imageUrl: isRealImage(p.imageUrl) ? p.imageUrl : '/icon-192.png',
  })), [products]); // eslint-disable-line react-hooks/exhaustive-deps

  // Use normalizedProducts everywhere (alias for clarity)
  const allProducts = normalizedProducts;

  // View state
  const [brandView, setBrandView] = useState<BrandView>('shop');

  // Product state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [categoryFilter, setCategoryFilter] = useState<string>(urlCategory);
  const [sortBy, setSortBy] = useState<string>(urlSort);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [effectFilter, setEffectFilter] = useState<string | null>(urlEffect);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Cart state
  const [cartOpen, setCartOpen] = useState(false);
  const { addToCart, cartItems, clearCart, removeFromCart, updateQuantity, setSelectedRetailerId } = useStore();

  // Dispensary state
  const [selectedDispensary, setSelectedDispensary] = useState<{
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    hours?: string;
  } | null>(null);

  // Refs
  const pageRef = useRef<HTMLDivElement>(null);

  // Router for URL updates
  const router = useRouter();

  // Extract theme colors with fallbacks
  const primaryColor = brand.theme?.primaryColor || DEFAULT_PRIMARY_COLOR;
  const secondaryColor = brand.theme?.secondaryColor || '#064e3b';
  const brandColors = { primary: primaryColor, secondary: secondaryColor };

  // Extract purchase model settings
  const purchaseModel = brand.purchaseModel || 'local_pickup';
  const isOnlineOnly = purchaseModel === 'online_only';
  const shipsNationwide = brand.shipsNationwide || false;

  // Determine menu design mode
  const isDispensaryMenu = brand.menuDesign === 'dispensary' || brand.type === 'dispensary';

  // Load favorites from localStorage on mount
  useEffect(() => {
    const storedFavorites = localStorage.getItem(`favorites-${brand.id}`);
    if (storedFavorites) {
      setFavorites(new Set(JSON.parse(storedFavorites)));
    }
  }, [brand.id]);

  // Sync all filters with URL params
  useEffect(() => {
    setCategoryFilter(urlCategory);
    setSortBy(urlSort);
    setSearchQuery(urlSearch);
    setEffectFilter(urlEffect);
  }, [urlCategory, urlSort, urlSearch, urlEffect]);

  // Show/hide back to top button on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        setShowBackToTop(window.scrollY > 300);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Back to top functionality
  const scrollToTop = () => {
    if (pageRef.current) {
      pageRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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

  // Add to cart handler
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product, selectedDispensary?.id || 'default');
    }
  };

  const getCartItemQuantity = (productId: string): number => {
    const item = cartItems.find(i => i.id === productId);
    return item?.quantity || 0;
  };

  // Handle cart quantity update
  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
    } else {
      updateQuantity(productId, quantity);
    }
  };

  // Filter and sort products (using normalizedProducts via allProducts)
  const filteredProducts = useMemo(() => {
    return allProducts
      .filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
        const matchesEffect = !effectFilter || product.effects?.includes(effectFilter);
        return matchesSearch && matchesCategory && matchesEffect;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'price-low': return a.price - b.price;
          case 'price-high': return b.price - a.price;
          case 'popular': {
            // Featured products always float to the top
            if (a.featured !== b.featured) return a.featured ? -1 : 1;
            // Custom sort order wins
            const aOrder = a.sortOrder ?? 9999;
            const bOrder = b.sortOrder ?? 9999;
            if (aOrder !== bOrder) return aOrder - bOrder;
            // Sales velocity (units per day) prioritized over likes
            const aVelocity = a.salesVelocity || 0;
            const bVelocity = b.salesVelocity || 0;
            if (aVelocity !== bVelocity) return bVelocity - aVelocity;
            // Sales count as secondary metric
            const aSalesCount = a.salesCount || 0;
            const bSalesCount = b.salesCount || 0;
            if (aSalesCount !== bSalesCount) return bSalesCount - aSalesCount;
            // Likes as final tiebreaker
            return (b.likes || 0) - (a.likes || 0);
          }
          case 'thc-high': return (b.thcPercent || 0) - (a.thcPercent || 0);
          default: return a.name.localeCompare(b.name);
        }
      });
  }, [allProducts, searchQuery, categoryFilter, sortBy, effectFilter]);

  // Get unique categories (normalized, for filter dropdown)
  const categories = useMemo(() => {
    const cats = Array.from(new Set(allProducts.map(p => p.category)));
    // Include any categories not in CATEGORY_ORDER (e.g., Seeds, Capsules)
    const extra = cats.filter(c => !CATEGORY_ORDER.includes(c)).sort();
    return [...CATEGORY_ORDER.filter(c => cats.includes(c)), ...extra];
  }, [allProducts]);

  // All unique effects across the menu (for filter pills)
  const allEffects = useMemo(() => {
    const effectSet = new Set<string>();
    allProducts.forEach(p => p.effects?.forEach(e => effectSet.add(e)));
    return Array.from(effectSet).slice(0, 8);
  }, [allProducts]);

  // Build category grid data with actual counts from products
  const categoryGridData = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    allProducts.forEach(p => {
      if (p.category) {
        categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
      }
    });

    return Object.entries(categoryCounts)
      .map(([name, count]) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        icon: CATEGORY_ICONS[name] || Package,
        productCount: count,
      }))
      .sort((a, b) => {
        const aIndex = CATEGORY_ORDER.indexOf(a.name);
        const bIndex = CATEGORY_ORDER.indexOf(b.name);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [allProducts]);

  // Featured products (highest likes or first 8)
  const featuredProducts = useMemo(() => {
    return [...allProducts]
      .sort((a, b) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 8);
  }, [allProducts]);

  // Deal products (for dispensary menu - products under $30)
  const dealProducts = useMemo(() => {
    return allProducts.filter(p => p.price < 30).slice(0, 8);
  }, [allProducts]);

  // Products grouped by category (for dispensary menu category sections)
  const productsByCategory = useMemo(() => {
    return allProducts.reduce((acc, product) => {
      const cat = product.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
  }, [allProducts]);

  // Deal badge helper
  const getDealBadge = (product: Product): string | undefined => {
    if (product.price < 20) return '2 for $30';
    if (product.price < 30) return 'DEAL';
    if ((product.thcPercent || 0) > 28) return 'HIGH THC';
    return undefined;
  };

  // Helper to update URL with current filter state
  const updateUrlParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search);

    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === 'all' || value === 'popular' || value === '') {
        params.delete(key);  // Remove default values for cleaner URLs
      } else {
        params.set(key, value);
      }
    });

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    router.push(newUrl, { scroll: false });
  };

  // Handlers for search and category
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    updateUrlParams({ q: query });
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCategorySelect = (category: string) => {
    setCategoryFilter(category);
    updateUrlParams({ category });
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    updateUrlParams({ sort: value });
  };

  const handleEffectSelect = (effect: string | null) => {
    setEffectFilter(effect);
    updateUrlParams({ effect });
  };

  // Handle dispensary selection
  const handleDispensarySelect = (dispensary: typeof selectedDispensary) => {
    setSelectedDispensary(dispensary);
    setSelectedRetailerId(dispensary?.id || null);
    if (dispensary && cartItems.length > 0) {
      setBrandView('checkout');
    }
  };

  // Cart items for checkout
  const cartItemsWithQuantity = cartItems.map(item => ({
    ...item,
    quantity: item.quantity || 1,
  }));

  // Convert bundles for display
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

  // Brand stats for hero (show in-stock count to be accurate)
  // stock undefined = unknown → treat as in stock; stock > 0 = in stock
  const inStockCount = allProducts.filter(p => p.stock === undefined || p.stock > 0).length;
  const brandStats = {
    products: inStockCount || allProducts.length,
    retailers: retailers.length,
    rating: 4.8,
  };

  // Shipping Checkout view (for online_only brands)
  if (brandView === 'shipping-checkout' && isOnlineOnly && cartItems.length > 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <BrandMenuHeader
          brandName={brand.name}
          brandLogo={brand.logoUrl}
          useLogoInHeader={brand.useLogoInHeader}
          brandColors={brandColors}
          verified={brand.verificationStatus === 'verified'}
          tagline={brand.tagline || ''}
          cartItemCount={cartItems.length}
          purchaseModel={purchaseModel}
          shipsNationwide={shipsNationwide}
          onCartClick={() => setBrandView('shipping-checkout')}
        />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <ShippingCheckoutFlow brandId={brand.id} />
        </main>

        <DemoFooter
          brandName={brand.name}
          brandLogo={brand.logoUrl}
          primaryColor={primaryColor}
          purchaseModel={purchaseModel}
          location={brand.shippingAddress ? {
            address: brand.shippingAddress.street,
            city: brand.shippingAddress.city,
            state: brand.shippingAddress.state,
            zip: brand.shippingAddress.zip,
            email: brand.contactEmail,
            phone: brand.contactPhone,
          } : undefined}
        />
      </div>
    );
  }

  // Local Pickup Checkout view
  if (brandView === 'checkout' && selectedDispensary && cartItems.length > 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <BrandMenuHeader
          brandName={brand.name}
          brandLogo={brand.logoUrl}
          useLogoInHeader={brand.useLogoInHeader}
          brandColors={brandColors}
          verified={brand.verificationStatus === 'verified'}
          tagline={brand.tagline || ''}
          cartItemCount={cartItems.length}
          purchaseModel={purchaseModel}
          selectedDispensary={selectedDispensary}
          onCartClick={() => setBrandView('checkout')}
          onLocationClick={() => setBrandView('locator')}
        />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <CheckoutFlow />
        </main>
      </div>
    );
  }

  // Locator view (only for local_pickup/hybrid models)
  if (brandView === 'locator' && !isOnlineOnly) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <BrandMenuHeader
          brandName={brand.name}
          brandLogo={brand.logoUrl}
          brandColors={brandColors}
          verified={brand.verificationStatus === 'verified'}
          tagline={brand.tagline || ''}
          cartItemCount={cartItems.length}
          purchaseModel={purchaseModel}
          selectedDispensary={selectedDispensary}
          onCartClick={() => cartItems.length > 0 && selectedDispensary && setBrandView('checkout')}
          onLocationClick={() => setBrandView('locator')}
        />

        <main className="flex-1">
          <DispensaryLocatorFlow
            brandName={brand.name}
            primaryColor={primaryColor}
            onDispensarySelect={handleDispensarySelect}
            selectedDispensary={selectedDispensary}
            cartItemCount={cartItems.length}
          />

          {/* Continue Shopping Button */}
          {selectedDispensary && (
            <div className="container mx-auto px-4 pb-8">
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setBrandView('shop')}
                >
                  Continue Shopping
                </Button>
                {cartItems.length > 0 && (
                  <Button
                    size="lg"
                    style={{ backgroundColor: primaryColor }}
                    onClick={() => setBrandView('checkout')}
                  >
                    Proceed to Checkout ({cartItems.length} items)
                  </Button>
                )}
              </div>
            </div>
          )}
        </main>

        <DemoFooter
          brandName={brand.name}
          brandLogo={brand.logoUrl}
          primaryColor={primaryColor}
        />
      </div>
    );
  }

  // ============================================
  // DISPENSARY MENU MODE
  // ============================================
  // Render dispensary-style menu with hero carousel, featured brands, deals
  if (isDispensaryMenu) {
    return (
      <div className="min-h-screen bg-background flex flex-col" ref={pageRef}>
        {/* Dispensary Header */}
        <DemoHeader
          brandName={brand.name}
          brandLogo={brand.logoUrl}
          brandSlug={brandSlug}
          useLogoInHeader={brand.useLogoInHeader}
          brandColors={brandColors}
          location={brand.location?.address ? `${brand.location.address}, ${brand.location.city}, ${brand.location.state} ${brand.location.zip}` : brand.location ? `${brand.location.city}, ${brand.location.state}` : `${brand.city || ''}, ${brand.state || ''}`}
          phone={brand.contactPhone}
          onSearch={handleSearch}
          onCategorySelect={handleCategorySelect}
          onCartClick={() => setCartOpen(true)}
        />

        <main className="flex-1">
          {/* Hero Carousel */}
          <HeroCarousel slides={heroSlides.length > 0 ? heroSlides : undefined} primaryColor={primaryColor} />

          {/* Loyalty & Discount Bar */}
          {publicMenuSettings && (
            <MenuInfoBar settings={publicMenuSettings} primaryColor={primaryColor} />
          )}

          {/* Featured Brands */}
          <FeaturedBrandsCarousel
            title="Featured Brands"
            brands={featuredBrands}
            primaryColor={primaryColor}
            onBrandClick={(brandId) => {
              // Find brand name from featured brands
              const selectedBrand = featuredBrands.find(b => b.id === brandId);
              if (selectedBrand) {
                router.push(`/${brandSlug}/brands/${encodeURIComponent(selectedBrand.name)}`);
              }
            }}
          />

          {/* Category Grid - Dynamic from actual products */}
          {categoryGridData.length > 0 && (
            <CategoryGrid
              title="Shop by Category"
              categories={categoryGridData}
              onCategoryClick={(categoryId) => {
                const cat = categoryGridData.find(c => c.id === categoryId);
                if (cat) handleCategorySelect(cat.name);
              }}
              primaryColor={primaryColor}
            />
          )}

          {/* Bundle Deals Section (if any) */}
          {bundlesForDisplay.length > 0 ? (
            <BundleDealsSection
              bundles={bundlesForDisplay}
              title="Bundle & Save"
              subtitle="Curated packs at special prices. More value, less hassle."
              primaryColor={primaryColor}
            />
          ) : (
            <BundleDealsSection
              title="Bundle & Save"
              subtitle="Curated packs at special prices. More value, less hassle."
              primaryColor={primaryColor}
            />
          )}

          {/* Dynamic Carousels from Dashboard */}
          {carousels.map((carousel) => {
            const carouselProducts = products.filter(p => carousel.productIds.includes(p.id));
            if (carouselProducts.length === 0) return null;

            return (
              <ProductSection
                key={carousel.id}
                title={carousel.title}
                subtitle={carousel.description || ''}
                products={carouselProducts}
                onAddToCart={handleAddToCart}
                getCartQuantity={getCartItemQuantity}
                primaryColor={primaryColor}
                layout="carousel"
                dealBadge={getDealBadge}
                onProductClick={setSelectedProduct}
                onFavorite={toggleFavorite}
                favorites={favorites}
              />
            );
          })}

          {/* Featured Products Section (fallback if no carousels) */}
          {carousels.length === 0 && featuredProducts.length > 0 && (
            <ProductSection
              title="Customer Favorites"
              subtitle="Our most loved products based on reviews and sales"
              products={featuredProducts}
              onAddToCart={handleAddToCart}
              getCartQuantity={getCartItemQuantity}
              primaryColor={primaryColor}
              layout="carousel"
              dealBadge={getDealBadge}
              onProductClick={setSelectedProduct}
              onFavorite={toggleFavorite}
              favorites={favorites}
            />
          )}

          {/* Deal Products Section */}
          {dealProducts.length > 0 && (
            <div id="deals" className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 py-2">
              <ProductSection
                title="Daily Deals"
                subtitle="Limited time offers - grab them while they last!"
                products={dealProducts}
                onAddToCart={handleAddToCart}
                getCartQuantity={getCartItemQuantity}
                primaryColor="#dc2626"
                layout="carousel"
                dealBadge={() => 'SALE'}
                onProductClick={setSelectedProduct}
                onFavorite={toggleFavorite}
                favorites={favorites}
              />
            </div>
          )}

          {/* All Products Section with Filters */}
          <section id="products" className="py-12">
            <div className="container mx-auto px-4">
              {/* Section Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">All Products</h2>
                  <p className="text-muted-foreground">
                    {filteredProducts.length} products available
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px] md:w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="thc-high">THC: High to Low</SelectItem>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Products Grid */}
              {filteredProducts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-xl font-medium mb-2">No products found</p>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your search or filters
                    </p>
                    <Button variant="outline" onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}>
                      Clear Filters
                    </Button>
                  </CardContent>
                </Card>
              ) : isManageMode ? (
                <ManagedProductGrid
                  products={filteredProducts}
                  primaryColor={primaryColor}
                  onAddToCart={handleAddToCart}
                  getCartQuantity={getCartItemQuantity}
                  onProductClick={setSelectedProduct}
                  onFavorite={toggleFavorite}
                  favorites={favorites}
                  getDealBadge={getDealBadge}
                  onReorderSave={onProductReorder}
                  onToggleFeatured={onToggleFeatured}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map((product) => (
                    <OversizedProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                      inCart={getCartItemQuantity(product.id)}
                      primaryColor={primaryColor}
                      size="large"
                      dealBadge={getDealBadge(product)}
                      onClick={() => setSelectedProduct(product)}
                      onFavorite={toggleFavorite}
                      isFavorite={favorites.has(product.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Category Sections */}
          {categoryFilter === 'all' && categories.map((category) => {
            const categoryProducts = productsByCategory[category] || [];
            if (categoryProducts.length === 0) return null;

            const categoryId = `category-${category.toLowerCase().replace(/\s+/g, '-')}`;

            return (
              <ProductSection
                key={category}
                id={categoryId}
                title={category}
                subtitle={`${categoryProducts.length} products`}
                products={categoryProducts.slice(0, 8)}
                onAddToCart={handleAddToCart}
                getCartQuantity={getCartItemQuantity}
                primaryColor={primaryColor}
                layout="carousel"
                onViewAll={() => handleCategorySelect(category)}
                dealBadge={getDealBadge}
                onProductClick={setSelectedProduct}
                onFavorite={toggleFavorite}
                favorites={favorites}
              />
            );
          })}
        </main>

        {/* Footer with Dispensary Location */}
        <DemoFooter
          brandName={brand.name}
          brandLogo={brand.logoUrl}
          primaryColor={primaryColor}
          location={brand.location ? {
            address: brand.location.address,
            city: brand.location.city,
            state: brand.location.state,
            zip: brand.location.zip,
            phone: brand.location.phone || brand.phone,
          } : {
            address: brand.address || '',
            city: brand.city || '',
            state: brand.state || '',
            zip: brand.zip || '',
            phone: brand.phone,
          }}
        />

        {/* Cart Slide-Over */}
        <CartSlideOver
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          items={cartItemsWithQuantity}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={removeFromCart}
          onClearCart={clearCart}
          onCheckout={() => {
            setCartOpen(false);
            // For dispensary, just close cart - they order in-store
          }}
          primaryColor={primaryColor}
          orgId={brand.id}
          onAddUpsellToCart={(product) => handleAddToCart(product, 1)}
        />

        {/* Product Detail Modal */}
        <ProductDetailModal
          product={selectedProduct}
          open={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          onFavorite={toggleFavorite}
          isFavorite={selectedProduct ? favorites.has(selectedProduct.id) : false}
          primaryColor={primaryColor}
          orgId={brand.id}
        />

        {/* Smokey AI Chatbot */}
        <Chatbot
          products={products}
          brandId={brand.id}
          initialOpen={false}
          chatbotConfig={brand.chatbotConfig}
        />
      </div>
    );
  }

  // ============================================
  // BRAND MENU MODE (Default)
  // ============================================
  // Default: Shopping view
  return (
    <div className="min-h-screen bg-background flex flex-col" ref={pageRef}>
      <BrandMenuHeader
        brandName={brand.name}
        brandLogo={brand.logoUrl}
        useLogoInHeader={brand.useLogoInHeader}
        brandColors={brandColors}
        verified={brand.verificationStatus === 'verified'}
        tagline={brand.tagline || ''}
        cartItemCount={cartItems.length}
        purchaseModel={purchaseModel}
        shipsNationwide={shipsNationwide}
        selectedDispensary={selectedDispensary}
        onSearch={handleSearch}
        onCartClick={() => {
          if (cartItems.length > 0) {
            if (isOnlineOnly) {
              // For online_only, go directly to shipping checkout
              setBrandView('shipping-checkout');
            } else if (selectedDispensary) {
              setBrandView('checkout');
            } else {
              setCartOpen(true);
            }
          }
        }}
        onLocationClick={() => !isOnlineOnly && setBrandView('locator')}
      />

      <main className="flex-1">
        {/* Brand Hero */}
        <BrandHero
          brandName={brand.name}
          brandLogo={brand.logoUrl}
          tagline={brand.tagline || ''}
          description={brand.description || ''}
          primaryColor={primaryColor}
          verified={brand.verificationStatus === 'verified'}
          stats={brandStats}
          heroImage={brand.theme?.heroImageUrl}
          purchaseModel={purchaseModel}
          shipsNationwide={shipsNationwide}
          onFindNearMe={() => !isOnlineOnly && setBrandView('locator')}
          onShopNow={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
        />

        {/* Selected Dispensary Banner - only for local pickup */}
        {!isOnlineOnly && selectedDispensary && (
          <div className="bg-green-50 dark:bg-green-950 border-b">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="gap-1 bg-green-100 text-green-700 border-green-300">
                    <Store className="h-3 w-3" />
                    Pickup Location
                  </Badge>
                  <span className="font-medium">{selectedDispensary.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {selectedDispensary.city}, {selectedDispensary.state}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBrandView('locator')}
                >
                  Change
                </Button>
              </div>
            </div>
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

        {/* Dynamic Carousels from Dashboard */}
        {carousels.map((carousel) => {
          const carouselProducts = products.filter(p => carousel.productIds.includes(p.id));
          if (carouselProducts.length === 0) return null;

          return (
            <ProductSection
              key={carousel.id}
              title={carousel.title}
              subtitle={carousel.description || ''}
              products={carouselProducts}
              onAddToCart={handleAddToCart}
              getCartQuantity={getCartItemQuantity}
              primaryColor={primaryColor}
              layout="carousel"
              dealBadge={getDealBadge}
              onProductClick={setSelectedProduct}
              onFavorite={toggleFavorite}
              favorites={favorites}
            />
          );
        })}

        {/* Featured Products Section (fallback if no carousels) */}
        {carousels.length === 0 && featuredProducts.length > 0 && (
          <ProductSection
            title="Featured Products"
            subtitle="Our most popular items"
            products={featuredProducts}
            onAddToCart={handleAddToCart}
            getCartQuantity={getCartItemQuantity}
            primaryColor={primaryColor}
            layout="carousel"
            dealBadge={getDealBadge}
            onProductClick={setSelectedProduct}
            onFavorite={toggleFavorite}
            favorites={favorites}
          />
        )}

        {/* Category Grid - Dynamic from actual products */}
        {categoryGridData.length > 0 && (
          <CategoryGrid
            title="Shop by Category"
            categories={categoryGridData}
            onCategoryClick={(categoryId) => {
              // Find the category name from the ID
              const cat = categoryGridData.find(c => c.id === categoryId);
              if (cat) handleCategorySelect(cat.name);
            }}
            primaryColor={primaryColor}
          />
        )}

        {/* All Products Section with Filters */}
        <section id="products" className="py-12">
          <div className="container mx-auto px-4">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">All {brand.name} Products</h2>
                <p className="text-muted-foreground">
                  {filteredProducts.length} products available
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px] md:w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={handleCategorySelect}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="thc-high">THC: High to Low</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Effect Filter Pills */}
            {allEffects.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-muted-foreground">Effects:</span>
                {allEffects.map((effect) => (
                  <button
                    key={effect}
                    onClick={() => handleEffectSelect(effectFilter === effect ? null : effect)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      effectFilter === effect
                        ? 'text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                    style={{
                      backgroundColor: effectFilter === effect ? primaryColor : undefined,
                    }}
                  >
                    {effect}
                  </button>
                ))}
                {effectFilter && (
                  <button
                    onClick={() => handleEffectSelect(null)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-xl font-medium mb-2">No products found</p>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search or filters
                  </p>
                  <Button variant="outline" onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}>
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <OversizedProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    inCart={getCartItemQuantity(product.id)}
                    primaryColor={primaryColor}
                    size="large"
                    dealBadge={getDealBadge(product)}
                    onClick={() => setSelectedProduct(product)}
                    onFavorite={toggleFavorite}
                    isFavorite={favorites.has(product.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Ready to Order CTA - Conditional based on purchase model */}
        {isOnlineOnly ? (
          // Online Only: Show checkout CTA if cart has items
          cartItems.length > 0 && (
            <section className="py-12 bg-muted/50">
              <div className="container mx-auto px-4 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Checkout?</h2>
                <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                  {shipsNationwide
                    ? `Your ${brand.name} products will be shipped directly to your door. Free shipping on all orders!`
                    : `Complete your order and we'll ship your ${brand.name} products directly to you.`}
                </p>
                <Button
                  size="lg"
                  className="font-bold gap-2"
                  style={{ backgroundColor: primaryColor }}
                  onClick={() => setBrandView('shipping-checkout')}
                >
                  <Truck className="h-5 w-5" />
                  Proceed to Checkout
                </Button>
              </div>
            </section>
          )
        ) : (
          // Local Pickup: Show find location CTA
          !selectedDispensary && retailers.length > 0 && (
            <section className="py-12 bg-muted/50">
              <div className="container mx-auto px-4 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Order?</h2>
                <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                  Find a licensed dispensary near you that carries {brand.name} products.
                  Order online and pick up in store.
                </p>
                <Button
                  size="lg"
                  className="font-bold gap-2"
                  style={{ backgroundColor: primaryColor }}
                  onClick={() => setBrandView('locator')}
                >
                  <Store className="h-5 w-5" />
                  Find Pickup Location
                </Button>
              </div>
            </section>
          )
        )}
      </main>

      <DemoFooter
        brandName={brand.name}
        brandLogo={brand.logoUrl}
        primaryColor={primaryColor}
        purchaseModel={purchaseModel}
        location={brand.shippingAddress ? {
          address: brand.shippingAddress.street,
          city: brand.shippingAddress.city,
          state: brand.shippingAddress.state,
          zip: brand.shippingAddress.zip,
          email: brand.contactEmail,
          phone: brand.contactPhone,
        } : undefined}
      />

      {/* Cart Slide-Over */}
      <CartSlideOver
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItemsWithQuantity}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onCheckout={() => {
          setCartOpen(false);
          if (isOnlineOnly) {
            setBrandView('shipping-checkout');
          } else {
            setBrandView('locator');
          }
        }}
        primaryColor={primaryColor}
        orgId={brand.id}
        onAddUpsellToCart={(product) => handleAddToCart(product, 1)}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onFavorite={toggleFavorite}
        isFavorite={selectedProduct ? favorites.has(selectedProduct.id) : false}
        primaryColor={primaryColor}
        orgId={brand.id}
      />

      {/* Smokey AI Chatbot */}
      <Chatbot
        products={products}
        brandId={brand.id}
        initialOpen={false}
        chatbotConfig={brand.chatbotConfig}
      />

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 bg-white rounded-full shadow-lg p-3 hover:shadow-xl transition-shadow flex items-center justify-center"
          style={{ backgroundColor: primaryColor }}
          title="Back to top"
          aria-label="Back to top"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
}
