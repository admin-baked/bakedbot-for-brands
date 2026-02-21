'use client';

/**
 * Dispensary Menu Client - Production Dispensary Shopping Experience
 * Full-featured dispensary menu with:
 * - Hero carousel with promotions
 * - Featured brands carousel
 * - Category grid
 * - Bundle deals section
 * - Featured/deal products with filters
 * - Product detail modal
 * - Cart and checkout
 * - Smokey AI Chatbot
 */

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/hooks/use-store';
import { useRouter } from 'next/navigation';
import type { Product, Retailer } from '@/types/domain';
import type { BundleDeal } from '@/types/bundles';
import { MenuInfoBar } from '@/components/demo/menu-info-bar';
import type { PublicMenuSettings } from '@/components/demo/menu-info-bar';

// Dispensary Menu Components (from demo-shop)
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { HeroCarousel } from '@/components/demo/hero-carousel';
import { FeaturedBrandsCarousel } from '@/components/demo/featured-brands-carousel';
import { CategoryGrid } from '@/components/demo/category-grid';
import { BundleDealsSection } from '@/components/demo/bundle-deals-section';
import { ProductSection } from '@/components/demo/product-section';
import { OversizedProductCard } from '@/components/demo/oversized-product-card';
import { CartSlideOver } from '@/components/demo/cart-slide-over';
import { BundleDetailDialog, BundleDeal as BundleDialogDeal } from '@/components/demo/bundle-detail-dialog';
import { ProductDetailModal } from '@/components/demo/product-detail-modal';
import Chatbot from '@/components/chatbot';

interface DispensaryMenuClientProps {
  dispensary: Retailer & {
    primaryColor?: string;
    secondaryColor?: string;
    hours?: string;
    tagline?: string;
  };
  products: Product[];
  bundles?: BundleDeal[];
  publicMenuSettings?: PublicMenuSettings | null;
}

// Category order for display
const CATEGORY_ORDER = ['Flower', 'Pre-roll', 'Vapes', 'Edibles', 'Concentrates', 'Tinctures', 'Topicals', 'Accessories'];

const DEFAULT_PRIMARY_COLOR = '#16a34a';

export function DispensaryMenuClient({ dispensary, products, bundles = [], publicMenuSettings }: DispensaryMenuClientProps) {
  // Product state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [effectFilter, setEffectFilter] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Cart state
  const [cartOpen, setCartOpen] = useState(false);
  const { addToCart, cartItems, clearCart, removeFromCart, updateQuantity, setSelectedRetailerId, setPurchaseMode, setSelectedBrandId } = useStore();
  const router = useRouter();

  // Bundle state
  const [selectedBundle, setSelectedBundle] = useState<BundleDialogDeal | null>(null);

  // Extract theme colors with fallbacks
  const primaryColor = dispensary.primaryColor || DEFAULT_PRIMARY_COLOR;
  const secondaryColor = dispensary.secondaryColor || '#064e3b';
  const brandColors = { primary: primaryColor, secondary: secondaryColor };

  // Load favorites from localStorage on mount
  useEffect(() => {
    const storedFavorites = localStorage.getItem(`favorites-${dispensary.id}`);
    if (storedFavorites) {
      setFavorites(new Set(JSON.parse(storedFavorites)));
    }
  }, [dispensary.id]);

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
    localStorage.setItem(`favorites-${dispensary.id}`, JSON.stringify(Array.from(newFavorites)));
  };

  // Add to cart handler
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product, dispensary.id);
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

  // All unique effects across the menu (for filter pills)
  const allEffects = useMemo(() => {
    const effectSet = new Set<string>();
    products.forEach(p => p.effects?.forEach(e => effectSet.add(e)));
    return Array.from(effectSet).slice(0, 8);
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
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
            // Custom operator sort order wins; likes as tiebreaker
            const aOrder = a.sortOrder ?? 9999;
            const bOrder = b.sortOrder ?? 9999;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return (b.likes || 0) - (a.likes || 0);
          }
          case 'thc-high': return (b.thcPercent || 0) - (a.thcPercent || 0);
          default: return a.name.localeCompare(b.name);
        }
      });
  }, [products, searchQuery, categoryFilter, sortBy]);

  // Group products by category
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    products.forEach(product => {
      if (!grouped[product.category]) {
        grouped[product.category] = [];
      }
      grouped[product.category].push(product);
    });
    return grouped;
  }, [products]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category)));
    return CATEGORY_ORDER.filter(c => cats.includes(c));
  }, [products]);

  // Featured products (highest likes or first 8)
  const featuredProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 8);
  }, [products]);

  // Deal products (products under $30)
  const dealProducts = useMemo(() => {
    return products.filter(p => p.price < 30).slice(0, 8);
  }, [products]);

  // Deal badge helper
  const getDealBadge = (product: Product): string | undefined => {
    if (product.price < 20) return '2 for $30';
    if (product.price < 30) return 'DEAL';
    if ((product.thcPercent || 0) > 28) return 'HIGH THC';
    return undefined;
  };

  // Handlers for search and category
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCategorySelect = (category: string) => {
    setCategoryFilter(category);

    // Update URL without page reload
    const params = new URLSearchParams(window.location.search);
    if (category === 'all') {
      params.delete('category');  // Remove param for 'all' (cleaner URL)
    } else {
      params.set('category', category);
    }

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    router.push(newUrl, { scroll: false });  // Update URL without scroll reset

    // Scroll to products section
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

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

  // Default bundles if none provided
  const defaultBundles = [
    { id: '1', name: 'Starter Pack', description: 'Pre-roll + Gummies + Grinder', originalPrice: 55, bundlePrice: 40, savingsPercent: 27, badge: 'BEST SELLER', backgroundColor: primaryColor },
    { id: '2', name: 'Weekend Vibes', description: 'Any 3 Edibles for $50', originalPrice: 66, bundlePrice: 50, savingsPercent: 24, badge: 'POPULAR', backgroundColor: '#8b5cf6' },
    { id: '3', name: 'Concentrate Bundle', description: 'Live Resin + Badder + Diamonds', originalPrice: 160, bundlePrice: 120, savingsPercent: 25, badge: 'PREMIUM', backgroundColor: '#f59e0b' },
  ];

  // Handle bundle click
  const handleBundleClick = (bundleId: string) => {
    const displayBundles = bundlesForDisplay.length > 0 ? bundlesForDisplay : defaultBundles;
    const bundle = displayBundles.find(b => b.id === bundleId);
    if (bundle) {
      setSelectedBundle(bundle as BundleDialogDeal);
    }
  };

  // Handle adding bundle to cart
  const handleAddBundleToCart = (bundle: BundleDialogDeal, quantity: number) => {
    const bundleProduct: Product = {
      id: `bundle-${bundle.id}`,
      name: bundle.name,
      category: 'Bundle',
      price: bundle.bundlePrice,
      prices: {},
      imageUrl: '',
      imageHint: 'bundle',
      description: bundle.description,
      likes: 100,
      dislikes: 0,
      brandId: 'bundle',
    };
    for (let i = 0; i < quantity; i++) {
      addToCart(bundleProduct, dispensary.id);
    }
  };

  // Cart items for checkout
  const cartItemsWithQuantity = cartItems.map(item => ({
    ...item,
    quantity: item.quantity || 1,
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Dispensary Header */}
      <DemoHeader
        brandName={dispensary.name}
        brandLogo={dispensary.logo}
        brandColors={brandColors}
        location={`${dispensary.city}, ${dispensary.state}`}
        onSearch={handleSearch}
        onCategorySelect={handleCategorySelect}
        onCartClick={() => setCartOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Carousel */}
        <HeroCarousel primaryColor={primaryColor} />

        {/* Loyalty & Discount Bar (driven by loyalty settings) */}
        {publicMenuSettings && (
          <MenuInfoBar settings={publicMenuSettings} primaryColor={primaryColor} />
        )}

        {/* Featured Brands */}
        <FeaturedBrandsCarousel
          title="Featured Brands"
          primaryColor={primaryColor}
        />

        {/* Category Grid */}
        <CategoryGrid
          title="Shop by Category"
          onCategoryClick={handleCategorySelect}
          primaryColor={primaryColor}
        />

        {/* Bundle Deals */}
        <BundleDealsSection
          title="Bundle & Save"
          subtitle="Curated packs at special prices. More value, less hassle."
          primaryColor={primaryColor}
          bundles={bundlesForDisplay.length > 0 ? bundlesForDisplay : defaultBundles}
          onBundleClick={handleBundleClick}
        />

        {/* Featured Products Section */}
        {featuredProducts.length > 0 && (
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

        {/* Deals Section */}
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

            {/* Effect Filter Pills */}
            {allEffects.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {allEffects.map((effect) => (
                  <button
                    key={effect}
                    onClick={() => setEffectFilter(effectFilter === effect ? null : effect)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      effectFilter === effect
                        ? 'text-white border-transparent'
                        : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary'
                    }`}
                    style={effectFilter === effect ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                  >
                    {effect}
                  </button>
                ))}
                {effectFilter && (
                  <button
                    onClick={() => setEffectFilter(null)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-muted-foreground border border-border hover:border-destructive hover:text-destructive transition-all"
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

        {/* Category Sections */}
        {categoryFilter === 'all' && categories.map((category) => {
          const categoryProducts = productsByCategory[category] || [];
          if (categoryProducts.length === 0) return null;

          return (
            <ProductSection
              key={category}
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

      {/* Footer */}
      <DemoFooter
        brandName={dispensary.name}
        brandLogo={dispensary.logo}
        primaryColor={primaryColor}
        location={{
          address: dispensary.address,
          city: dispensary.city,
          state: dispensary.state,
          zip: dispensary.zip,
          phone: dispensary.phone,
          hours: dispensary.hours || '9AM - 10PM',
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
          setSelectedRetailerId(dispensary.id);
          setSelectedBrandId(null);
          setPurchaseMode('pickup');
          router.push('/checkout');
        }}
        primaryColor={primaryColor}
      />

      {/* Bundle Detail Dialog */}
      <BundleDetailDialog
        bundle={selectedBundle}
        open={!!selectedBundle}
        onClose={() => setSelectedBundle(null)}
        onAddToCart={handleAddBundleToCart}
        primaryColor={primaryColor}
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
      />

      {/* Smokey AI Chatbot */}
      <Chatbot
        products={products}
        brandId={dispensary.id}
        initialOpen={false}
      />
    </div>
  );
}
