'use client';

/**
 * Embed Menu Client Component
 *
 * Renders the full menu experience for iframe embedding.
 * Includes PostMessage bridge for parent site communication.
 *
 * Payment Flow by Entity Type:
 * - Dispensaries: Smokey Pay (CannPay), POS Checkout, or Pay In-Store
 * - Hemp Brands (CBD/Delta-9): Authorize.net or SquareCBD
 * - THC Brands: Forward order to dispensary for payment
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Search, Store, Truck, X } from 'lucide-react';
import { useStore } from '@/hooks/use-store';
import type { Product, Retailer, Brand } from '@/types/domain';

// Components
import { CategoryGrid } from '@/components/demo/category-grid';
import { ProductSection } from '@/components/demo/product-section';
import { OversizedProductCard } from '@/components/demo/oversized-product-card';
import { CartSlideOver } from '@/components/demo/cart-slide-over';
import { ProductDetailModal } from '@/components/demo/product-detail-modal';
import { DispensaryLocatorFlow } from '@/components/demo/dispensary-locator-flow';
import { BrandCheckoutFlow } from '@/components/demo/brand-checkout-flow';
import { ShippingCheckoutFlow } from '@/components/checkout/shipping-checkout-flow';

// PostMessage event types
type PostMessageEvent =
    | { type: 'bakedbot:cart:updated'; payload: { items: unknown[]; total: number } }
    | { type: 'bakedbot:checkout:start'; payload: { items: unknown[]; total: number } }
    | { type: 'bakedbot:checkout:complete'; payload: { orderId: string } }
    | { type: 'bakedbot:resize'; payload: { height: number } };

interface EmbedMenuClientProps {
    brand: Brand;
    products: Product[];
    retailers: Retailer[];
    config: {
        layout: 'grid' | 'list' | 'compact';
        showCart: boolean;
        showCategories: boolean;
        primaryColor: string;
    };
}

// Category order for display
const CATEGORY_ORDER = ['Flower', 'Pre-roll', 'Vapes', 'Edibles', 'Concentrates', 'Tinctures', 'Topicals', 'Accessories', 'Merchandise', 'Apparel'];

type EmbedView = 'shop' | 'locator' | 'checkout' | 'shipping-checkout';

export function EmbedMenuClient({ brand, products, retailers, config }: EmbedMenuClientProps) {
    // View state
    const [view, setView] = useState<EmbedView>('shop');

    // Product state
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('popular');
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    // Cart state
    const [cartOpen, setCartOpen] = useState(false);
    const { addToCart, cartItems, clearCart, removeFromCart, updateQuantity } = useStore();

    // Dispensary state (for THC brands with local pickup)
    const [selectedDispensary, setSelectedDispensary] = useState<{
        id: string;
        name: string;
        address: string;
        city: string;
        state: string;
        zip: string;
        phone?: string;
    } | null>(null);

    // Theme
    const primaryColor = config.primaryColor;

    // Purchase model
    const purchaseModel = brand.purchaseModel || 'local_pickup';
    const isOnlineOnly = purchaseModel === 'online_only';
    const isDispensary = brand.menuDesign === 'dispensary' || brand.type === 'dispensary';

    // PostMessage bridge - send events to parent
    const postToParent = useCallback((event: PostMessageEvent) => {
        if (typeof window !== 'undefined' && window.parent !== window) {
            window.parent.postMessage(event, '*');
        }
    }, []);

    // Send cart updates to parent
    useEffect(() => {
        const total = cartItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
        postToParent({
            type: 'bakedbot:cart:updated',
            payload: { items: cartItems, total },
        });
    }, [cartItems, postToParent]);

    // Send resize events to parent for dynamic iframe height
    useEffect(() => {
        const sendHeight = () => {
            const height = document.documentElement.scrollHeight;
            postToParent({ type: 'bakedbot:resize', payload: { height } });
        };

        // Send initial height
        sendHeight();

        // Observer for content changes
        const observer = new ResizeObserver(sendHeight);
        observer.observe(document.body);

        return () => observer.disconnect();
    }, [postToParent]);

    // Load favorites from localStorage
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

    // Add to cart
    const handleAddToCart = (product: Product, quantity: number = 1) => {
        for (let i = 0; i < quantity; i++) {
            addToCart(product, selectedDispensary?.id || 'default');
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

    // Category grid data
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

    // Featured products
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

    // Handle category select
    const handleCategorySelect = (category: string) => {
        setCategoryFilter(category);
        document.getElementById('embed-products')?.scrollIntoView({ behavior: 'smooth' });
    };

    // Handle dispensary selection (for THC brands)
    const handleDispensarySelect = (dispensary: typeof selectedDispensary) => {
        setSelectedDispensary(dispensary);
        if (dispensary && cartItems.length > 0) {
            setView('checkout');
        }
    };

    // Handle checkout complete
    const handleCheckoutComplete = () => {
        const total = cartItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
        postToParent({
            type: 'bakedbot:checkout:complete',
            payload: { orderId: `order_${Date.now()}` },
        });
        clearCart();
        setView('shop');
        setSelectedDispensary(null);
    };

    // Proceed to checkout
    const handleCheckout = () => {
        const total = cartItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
        postToParent({
            type: 'bakedbot:checkout:start',
            payload: { items: cartItems, total },
        });

        if (isDispensary) {
            // Dispensary: Smokey Pay, POS, or Pay In-Store
            // For now, show cart slide-over - checkout handled there
            setCartOpen(true);
        } else if (isOnlineOnly) {
            // Online-only brand: Authorize.net / SquareCBD
            setView('shipping-checkout');
        } else {
            // THC brand with local pickup: Show dispensary locator
            setView('locator');
        }
    };

    // Cart items for checkout
    const cartItemsWithQuantity = cartItems.map(item => ({
        ...item,
        quantity: item.quantity || 1,
    }));

    // ============================================
    // SHIPPING CHECKOUT VIEW (Online-only brands)
    // ============================================
    if (view === 'shipping-checkout' && isOnlineOnly && cartItems.length > 0) {
        return (
            <div className="min-h-screen bg-background p-4">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold">Checkout</h1>
                        <Button variant="ghost" size="sm" onClick={() => setView('shop')}>
                            <X className="h-4 w-4 mr-2" />
                            Back to Shop
                        </Button>
                    </div>
                    <ShippingCheckoutFlow brandId={brand.id} />
                </div>
            </div>
        );
    }

    // ============================================
    // LOCAL PICKUP CHECKOUT VIEW
    // ============================================
    if (view === 'checkout' && selectedDispensary && cartItems.length > 0) {
        return (
            <div className="min-h-screen bg-background">
                <BrandCheckoutFlow
                    brandName={brand.name}
                    primaryColor={primaryColor}
                    cartItems={cartItemsWithQuantity}
                    pickupLocation={selectedDispensary}
                    onBack={() => setView('locator')}
                    onComplete={handleCheckoutComplete}
                />
            </div>
        );
    }

    // ============================================
    // DISPENSARY LOCATOR VIEW (THC brands)
    // ============================================
    if (view === 'locator' && !isOnlineOnly) {
        return (
            <div className="min-h-screen bg-background">
                <div className="p-4">
                    <Button variant="ghost" size="sm" onClick={() => setView('shop')} className="mb-4">
                        <X className="h-4 w-4 mr-2" />
                        Back to Shop
                    </Button>
                </div>
                <DispensaryLocatorFlow
                    brandName={brand.name}
                    primaryColor={primaryColor}
                    onDispensarySelect={handleDispensarySelect}
                    selectedDispensary={selectedDispensary}
                    cartItemCount={cartItems.length}
                />
                {selectedDispensary && (
                    <div className="p-4 flex justify-center gap-4">
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => setView('shop')}
                        >
                            Continue Shopping
                        </Button>
                        {cartItems.length > 0 && (
                            <Button
                                size="lg"
                                style={{ backgroundColor: primaryColor }}
                                onClick={() => setView('checkout')}
                            >
                                Proceed to Checkout ({cartItems.length} items)
                            </Button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // MAIN SHOP VIEW
    // ============================================
    return (
        <div className="min-h-screen bg-background">
            {/* Embed Header */}
            <header className="sticky top-0 z-40 bg-background border-b">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                        {/* Brand Info */}
                        <div className="flex items-center gap-3">
                            {brand.logoUrl && (
                                <img
                                    src={brand.logoUrl}
                                    alt={brand.name}
                                    className="h-8 w-8 rounded-full object-cover"
                                />
                            )}
                            <span className="font-semibold text-lg">{brand.name}</span>
                        </div>

                        {/* Search */}
                        <div className="flex-1 max-w-md hidden md:block">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search products..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* Cart Button */}
                        {config.showCart && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="relative"
                                onClick={() => cartItems.length > 0 ? handleCheckout() : setCartOpen(true)}
                            >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Cart
                                {cartItems.length > 0 && (
                                    <Badge
                                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {cartItems.length}
                                    </Badge>
                                )}
                            </Button>
                        )}
                    </div>

                    {/* Mobile Search */}
                    <div className="mt-3 md:hidden">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main>
                {/* Category Grid */}
                {config.showCategories && categoryGridData.length > 0 && (
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

                {/* Featured Products */}
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

                {/* All Products with Filters */}
                <section id="embed-products" className="py-8">
                    <div className="container mx-auto px-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-xl md:text-2xl font-bold">All Products</h2>
                                <p className="text-muted-foreground text-sm">
                                    {filteredProducts.length} products
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-[140px]">
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
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="popular">Most Popular</SelectItem>
                                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                                        <SelectItem value="thc-high">THC: High to Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {filteredProducts.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <ShoppingCart className="h-12 w-12 text-muted-foreground mb-3" />
                                    <p className="text-lg font-medium mb-1">No products found</p>
                                    <p className="text-muted-foreground text-sm mb-3">
                                        Try adjusting your search or filters
                                    </p>
                                    <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}>
                                        Clear Filters
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className={`grid gap-4 ${
                                config.layout === 'compact'
                                    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                                    : config.layout === 'list'
                                        ? 'grid-cols-1'
                                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                            }`}>
                                {filteredProducts.map((product) => (
                                    <OversizedProductCard
                                        key={product.id}
                                        product={product}
                                        onAddToCart={handleAddToCart}
                                        inCart={getCartItemQuantity(product.id)}
                                        primaryColor={primaryColor}
                                        size={config.layout === 'compact' ? 'normal' : 'large'}
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

                {/* Checkout CTA */}
                {cartItems.length > 0 && (
                    <div className="sticky bottom-0 bg-background border-t p-4">
                        <div className="container mx-auto flex items-center justify-between">
                            <div>
                                <p className="font-medium">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in cart</p>
                                <p className="text-sm text-muted-foreground">
                                    ${cartItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0).toFixed(2)}
                                </p>
                            </div>
                            <Button
                                size="lg"
                                style={{ backgroundColor: primaryColor }}
                                onClick={handleCheckout}
                            >
                                {isDispensary ? (
                                    <>
                                        <Store className="h-4 w-4 mr-2" />
                                        Checkout
                                    </>
                                ) : isOnlineOnly ? (
                                    <>
                                        <Truck className="h-4 w-4 mr-2" />
                                        Checkout
                                    </>
                                ) : (
                                    <>
                                        <Store className="h-4 w-4 mr-2" />
                                        Find Pickup Location
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </main>

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
                    handleCheckout();
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
        </div>
    );
}
