'use client';

/**
 * Brand Menu Client - Production Brand Page Experience
 * Mirrors the demo-shop Brand Menu with full features:
 * - Brand hero with stats and CTAs
 * - Category grid
 * - Featured/all products with filters
 * - Dispensary locator flow
 * - Checkout flow (for local pickup model)
 * - Smokey AI Chatbot
 */

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Search, Store, Truck } from 'lucide-react';
import { useStore } from '@/hooks/use-store';
import type { Product, Retailer, Brand } from '@/types/domain';
import type { BundleDeal } from '@/types/bundles';

// Brand Menu Components
import { BrandMenuHeader } from '@/components/demo/brand-menu-header';
import { BrandHero } from '@/components/demo/brand-hero';
import { CategoryGrid } from '@/components/demo/category-grid';
import { ProductSection } from '@/components/demo/product-section';
import { OversizedProductCard } from '@/components/demo/oversized-product-card';
import { DispensaryLocatorFlow } from '@/components/demo/dispensary-locator-flow';
import { BrandCheckoutFlow } from '@/components/demo/brand-checkout-flow';
import { DemoFooter } from '@/components/demo/demo-footer';
import { ProductDetailModal } from '@/components/demo/product-detail-modal';
import { BundleDealsSection } from '@/components/demo/bundle-deals-section';
import { CartSlideOver } from '@/components/demo/cart-slide-over';
import { ShippingCheckoutFlow } from '@/components/checkout/shipping-checkout-flow';
import Chatbot from '@/components/chatbot';

interface BrandMenuClientProps {
  brand: Brand;
  products: Product[];
  retailers: Retailer[];
  brandSlug: string;
  bundles?: BundleDeal[];
}

// Category order for display
const CATEGORY_ORDER = ['Flower', 'Pre-roll', 'Vapes', 'Edibles', 'Concentrates', 'Tinctures', 'Topicals', 'Accessories'];

const DEFAULT_PRIMARY_COLOR = '#16a34a';

type BrandView = 'shop' | 'locator' | 'checkout' | 'shipping-checkout';

export function BrandMenuClient({ brand, products, retailers, brandSlug, bundles = [] }: BrandMenuClientProps) {
  // View state
  const [brandView, setBrandView] = useState<BrandView>('shop');

  // Product state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Cart state
  const [cartOpen, setCartOpen] = useState(false);
  const { addToCart, cartItems, clearCart, removeFromCart, updateQuantity } = useStore();

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

  // Extract theme colors with fallbacks
  const primaryColor = brand.theme?.primaryColor || DEFAULT_PRIMARY_COLOR;
  const secondaryColor = brand.theme?.secondaryColor || '#064e3b';
  const brandColors = { primary: primaryColor, secondary: secondaryColor };

  // Extract purchase model settings
  const purchaseModel = brand.purchaseModel || 'local_pickup';
  const isOnlineOnly = purchaseModel === 'online_only';
  const shipsNationwide = brand.shipsNationwide || false;

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

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'price-low': return a.price - b.price;
          case 'price-high': return b.price - a.price;
          case 'popular': return (b.likes || 0) - (a.likes || 0);
          case 'thc-high': return (b.thcPercent || 0) - (a.thcPercent || 0);
          default: return a.name.localeCompare(b.name);
        }
      });
  }, [products, searchQuery, categoryFilter, sortBy]);

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
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle dispensary selection
  const handleDispensarySelect = (dispensary: typeof selectedDispensary) => {
    setSelectedDispensary(dispensary);
    if (dispensary && cartItems.length > 0) {
      setBrandView('checkout');
    }
  };

  // Handle checkout completion
  const handleCheckoutComplete = () => {
    clearCart();
    setBrandView('shop');
    setSelectedDispensary(null);
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

  // Brand stats for hero
  const brandStats = {
    products: products.length,
    retailers: retailers.length,
    rating: 4.8, // Could be calculated from reviews in the future
  };

  // Shipping Checkout view (for online_only brands)
  if (brandView === 'shipping-checkout' && isOnlineOnly && cartItems.length > 0) {
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
          brandColors={brandColors}
          verified={brand.verificationStatus === 'verified'}
          tagline={brand.tagline || ''}
          cartItemCount={cartItems.length}
          purchaseModel={purchaseModel}
          selectedDispensary={selectedDispensary}
          onCartClick={() => setBrandView('checkout')}
          onLocationClick={() => setBrandView('locator')}
        />

        <main className="flex-1">
          <BrandCheckoutFlow
            brandName={brand.name}
            primaryColor={primaryColor}
            cartItems={cartItemsWithQuantity}
            pickupLocation={selectedDispensary}
            onBack={() => setBrandView('locator')}
            onComplete={handleCheckoutComplete}
          />
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

  // Default: Shopping view
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

        {/* Featured Products Section */}
        {featuredProducts.length > 0 && (
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

        {/* Category Grid */}
        <CategoryGrid
          title="Shop by Category"
          onCategoryClick={handleCategorySelect}
          primaryColor={primaryColor}
        />

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
        brandId={brand.id}
        initialOpen={false}
        chatbotConfig={brand.chatbotConfig}
      />
    </div>
  );
}
