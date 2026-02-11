'use client';

/**
 * Menu Preview Component
 *
 * Renders the customer-facing menu experience for dashboard preview.
 * Mirrors the dispensary mode from BrandMenuClient.
 */

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Search, X, Eye, Cookie, Shirt, Leaf, Wind, Sparkles, Droplet, Heart, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStore } from '@/hooks/use-store';
import type { Product, Brand } from '@/types/products';
import type { BundleDeal } from '@/types/bundles';
import type { FeaturedBrand } from '@/server/actions/featured-brands';
import type { Carousel } from '@/types/carousels';
import type { Hero } from '@/types/heroes';

// Demo components
import { DemoHeader } from '@/components/demo/demo-header';
import { HeroCarousel } from '@/components/demo/hero-carousel';
import { FeaturedBrandsCarousel } from '@/components/demo/featured-brands-carousel';
import { CategoryGrid } from '@/components/demo/category-grid';
import { BundleDealsSection } from '@/components/demo/bundle-deals-section';
import { ProductSection } from '@/components/demo/product-section';
import { OversizedProductCard } from '@/components/demo/oversized-product-card';
import { DemoFooter } from '@/components/demo/demo-footer';
import { ProductDetailModal } from '@/components/demo/product-detail-modal';
import { CartSlideOver } from '@/components/demo/cart-slide-over';
import Chatbot from '@/components/chatbot';

import type { MenuPreviewData } from './preview-actions';

interface MenuPreviewProps {
    data: MenuPreviewData;
    onExit: () => void;
}

// Category order for display
const CATEGORY_ORDER = ['Flower', 'Pre-roll', 'Pre-Rolls', 'Vapes', 'Edibles', 'Concentrates', 'Tinctures', 'Topicals', 'Accessories', 'Merchandise', 'Apparel', 'Other'];

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
    'Other': Package,
};

const DEFAULT_PRIMARY_COLOR = '#16a34a';

export function MenuPreview({ data, onExit }: MenuPreviewProps) {
    const { products, carousels, bundles, featuredBrands, activeHero, brand, vibe } = data;

    // Product state
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('popular');
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    // Cart state
    const [cartOpen, setCartOpen] = useState(false);
    const { addToCart, cartItems, clearCart, removeFromCart, updateQuantity } = useStore();

    // Extract theme colors - vibe takes precedence over brand config
    const primaryColor = vibe?.theme?.colors?.primary || brand?.theme?.primaryColor || DEFAULT_PRIMARY_COLOR;
    const secondaryColor = vibe?.theme?.colors?.secondary || brand?.theme?.secondaryColor || '#064e3b';
    const accentColor = vibe?.theme?.colors?.accent || primaryColor;
    const backgroundColor = vibe?.theme?.colors?.background || '#ffffff';
    const surfaceColor = vibe?.theme?.colors?.surface || '#f8fafc';
    const textColor = vibe?.theme?.colors?.text || '#0f172a';
    const brandColors = { primary: primaryColor, secondary: secondaryColor };

    // Typography from vibe
    const headingFont = vibe?.theme?.typography?.headingFont || 'Inter';
    const bodyFont = vibe?.theme?.typography?.bodyFont || 'Inter';

    // Build CSS variables for vibe theming
    const vibeStyles = vibe ? {
        '--vibe-primary': primaryColor,
        '--vibe-secondary': secondaryColor,
        '--vibe-accent': accentColor,
        '--vibe-background': backgroundColor,
        '--vibe-surface': surfaceColor,
        '--vibe-text': textColor,
        '--vibe-heading-font': headingFont,
        '--vibe-body-font': bodyFont,
    } as React.CSSProperties : {};

    // Load favorites from localStorage on mount
    useEffect(() => {
        if (brand?.id) {
            const storedFavorites = localStorage.getItem(`favorites-${brand.id}`);
            if (storedFavorites) {
                setFavorites(new Set(JSON.parse(storedFavorites)));
            }
        }
    }, [brand?.id]);

    const toggleFavorite = (productId: string) => {
        const newFavorites = new Set(favorites);
        if (newFavorites.has(productId)) {
            newFavorites.delete(productId);
        } else {
            newFavorites.add(productId);
        }
        setFavorites(newFavorites);
        if (brand?.id) {
            localStorage.setItem(`favorites-${brand.id}`, JSON.stringify(Array.from(newFavorites)));
        }
    };

    // Add to cart handler
    const handleAddToCart = (product: Product, quantity: number = 1) => {
        for (let i = 0; i < quantity; i++) {
            addToCart(product, 'preview');
        }
    };

    const getCartItemQuantity = (productId: string): number => {
        const item = cartItems.find(i => i.id === productId);
        return item?.quantity || 0;
    };

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

    // Build category grid data
    const categoryGridData = useMemo(() => {
        const categoryCounts: Record<string, number> = {};
        products.forEach(p => {
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

    // Products grouped by category
    const productsByCategory = useMemo(() => {
        return products.reduce((acc, product) => {
            const cat = product.category;
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(product);
            return acc;
        }, {} as Record<string, Product[]>);
    }, [products]);

    // Deal badge helper
    const getDealBadge = (product: Product): string | undefined => {
        if (product.price < 20) return '2 for $30';
        if (product.price < 30) return 'DEAL';
        if ((product.thcPercent || 0) > 28) return 'HIGH THC';
        return undefined;
    };

    // Handlers
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        document.getElementById('preview-products')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleCategorySelect = (category: string) => {
        setCategoryFilter(category);
        document.getElementById('preview-products')?.scrollIntoView({ behavior: 'smooth' });
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

    // Cart items for checkout
    const cartItemsWithQuantity = cartItems.map(item => ({
        ...item,
        quantity: item.quantity || 1,
    }));

    return (
        <div
            className="min-h-screen flex flex-col relative"
            style={{
                ...vibeStyles,
                backgroundColor: backgroundColor,
                color: textColor,
                fontFamily: bodyFont,
            }}
        >
            {/* Preview Mode Banner */}
            <div className="sticky top-0 z-50 bg-amber-500 text-amber-950 px-4 py-2">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <span className="font-medium text-sm">
                            Preview Mode - This is how customers see your menu
                            {vibe && (
                                <span className="ml-2 px-2 py-0.5 bg-amber-600/50 rounded text-xs">
                                    Vibe: {vibe.name}
                                </span>
                            )}
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onExit}
                        className="text-amber-950 hover:bg-amber-600"
                    >
                        <X className="h-4 w-4 mr-1" />
                        Exit Preview
                    </Button>
                </div>
            </div>

            {/* Dispensary Header */}
            <DemoHeader
                brandName={brand?.name || 'Your Dispensary'}
                brandLogo={brand?.logoUrl}
                useLogoInHeader={brand?.useLogoInHeader}
                brandColors={brandColors}
                location={brand?.location ? `${brand.location.city}, ${brand.location.state}` : `${brand?.city || ''}, ${brand?.state || ''}`}
                onSearch={handleSearch}
                onCategorySelect={handleCategorySelect}
                onCartClick={() => setCartOpen(true)}
            />

            <main className="flex-1">
                {/* Hero Carousel */}
                <HeroCarousel primaryColor={primaryColor} />

                {/* Featured Brands */}
                {featuredBrands.length > 0 && (
                    <FeaturedBrandsCarousel
                        title="Featured Brands"
                        brands={featuredBrands}
                        primaryColor={primaryColor}
                    />
                )}

                {/* Category Grid */}
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

                {/* Bundle Deals Section */}
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
                <section id="preview-products" className="py-12">
                    <div className="container mx-auto px-4">
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
                brandName={brand?.name || 'Your Dispensary'}
                brandLogo={brand?.logoUrl}
                primaryColor={primaryColor}
                location={brand?.location ? {
                    address: brand.location.address,
                    city: brand.location.city,
                    state: brand.location.state,
                    zip: brand.location.zip,
                    phone: brand.location.phone || brand.phone,
                } : brand?.address ? {
                    address: brand.address,
                    city: brand.city || '',
                    state: brand.state || '',
                    zip: brand.zip || '',
                    phone: brand.phone,
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
                    // In preview mode, just close cart
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
                brandId={brand?.id}
                initialOpen={false}
                chatbotConfig={brand?.chatbotConfig}
            />
        </div>
    );
}
