// src/app/demo-shop/demo-shop-client.tsx
'use client';

/**
 * Demo shopping page client component - Quality Roots inspired design
 * Supports both Dispensary Menu and Brand Menu experiences
 *
 * Dispensary Menu: Traditional dispensary shopping experience
 * Brand Menu: Brand-centric shopping with dispensary pickup routing
 */

import { useState, useMemo, useEffect } from 'react';
import { AgeGateWithEmail, isAgeVerified } from '@/components/compliance/age-gate-with-email';
import dynamicImport from 'next/dynamic';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { ShoppingCart, Search, Upload, X, Sparkles, Store, Leaf, Globe, ArrowRight, Rocket } from 'lucide-react';
import { demoProducts, demoRetailers } from '@/lib/demo/demo-data';
import { useStore } from '@/hooks/use-store';
import { Product, Retailer } from '@/types/domain';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Dispensary Menu Components
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { HeroCarousel } from '@/components/demo/hero-carousel';
import { FeaturedBrandsCarousel } from '@/components/demo/featured-brands-carousel';
import { CategoryGrid } from '@/components/demo/category-grid';
import { BundleDealsSection } from '@/components/demo/bundle-deals-section';
import { ProductSection } from '@/components/demo/product-section';
import { OversizedProductCard } from '@/components/demo/oversized-product-card';
import { MenuImportDialog } from '@/components/demo/menu-import-dialog';
import { CartSlideOver } from '@/components/demo/cart-slide-over';
import { BundleDetailDialog, BundleDeal } from '@/components/demo/bundle-detail-dialog';
import { ProductDetailModal } from '@/components/demo/product-detail-modal';



// Brand Menu Components
import { BrandMenuHeader } from '@/components/demo/brand-menu-header';
import { BrandHero } from '@/components/demo/brand-hero';
import { DispensaryLocatorFlow } from '@/components/demo/dispensary-locator-flow';
import { BrandCheckoutFlow } from '@/components/demo/brand-checkout-flow';
import { DispensaryClaimCTA } from '@/components/demo/dispensary-claim-cta';

import type { MenuExtraction, ExtractedProduct } from '@/app/api/demo/import-menu/route';

// Dynamic import to prevent Firebase initialization during prerender
const Chatbot = dynamicImport(() => import('@/components/chatbot'), { ssr: false });

// Menu mode type
type MenuMode = 'dispensary' | 'brand';

// Brand checkout view type
type BrandView = 'shop' | 'locator' | 'checkout';

// Helper to convert imported products to our Product type
function convertImportedProducts(imported: ExtractedProduct[], brandId: string): Product[] {
    return imported.map((p, index) => ({
        id: `imported-${index + 1}`,
        name: p.name,
        category: p.category,
        price: p.price || 0,
        prices: {},
        imageUrl: p.imageUrl || '',
        imageHint: p.category.toLowerCase(),
        description: p.description || '',
        likes: Math.floor(Math.random() * 500) + 50,
        dislikes: Math.floor(Math.random() * 20),
        brandId,
        thcPercent: p.thcPercent || undefined,
        cbdPercent: p.cbdPercent || undefined,
        strainType: p.strainType,
        effects: p.effects || [],
    }));
}

// Category order for display
const CATEGORY_ORDER = ['Flower', 'Pre-roll', 'Vapes', 'Edibles', 'Concentrates', 'Tinctures', 'Topicals', 'Accessories'];

// Demo brand for brand menu mode
const demoBrand = {
    name: '40 Tons',
    tagline: 'Premium California Cannabis',
    description: 'Crafted in the heart of California, 40 Tons brings you premium cannabis products grown with care and precision. Our commitment to quality means every product is lab-tested and hand-selected for the perfect experience.',
    primaryColor: '#8b5cf6',
    secondaryColor: '#6d28d9',
    stats: {
        products: 24,
        retailers: 150,
        rating: 4.8,
    },
};

export default function DemoShopClient() {
    // Age verification state
    const [showAgeGate, setShowAgeGate] = useState(false);

    // Check age verification on mount
    useEffect(() => {
        if (!isAgeVerified()) {
            setShowAgeGate(true);
        }
    }, []);

    // Menu mode state
    const [menuMode, setMenuMode] = useState<MenuMode>('dispensary');
    const [brandView, setBrandView] = useState<BrandView>('shop');

    // Common state
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('popular');

    // Imported menu state
    const [importedData, setImportedData] = useState<MenuExtraction | null>(null);
    const [useImportedMenu, setUseImportedMenu] = useState(false);

    // UI state
    const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
    const [cartOpen, setCartOpen] = useState(false);
    const [selectedBundle, setSelectedBundle] = useState<BundleDeal | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    
    // Favorites state (persisted in localStorage in a real app, mock for now)
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    useEffect(() => {
        const storedFavorites = localStorage.getItem('demo-favorites');
        if (storedFavorites) {
            setFavorites(new Set(JSON.parse(storedFavorites)));
        }
    }, []);

    const toggleFavorite = (productId: string) => {
        const newFavorites = new Set(favorites);
        if (newFavorites.has(productId)) {
            newFavorites.delete(productId);
        } else {
            newFavorites.add(productId);
        }
        setFavorites(newFavorites);
        localStorage.setItem('demo-favorites', JSON.stringify(Array.from(newFavorites)));
    };

    // Brand menu state
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

    const { addToCart, cartItems, clearCart, removeFromCart, updateQuantity } = useStore();

    // Show welcome dialog on first visit
    useEffect(() => {
        const hasVisited = sessionStorage.getItem('demo-visited');
        if (!hasVisited) {
            setShowWelcomeDialog(true);
            sessionStorage.setItem('demo-visited', 'true');
        }
    }, []);

    // Handle menu import completion
    const handleImportComplete = (data: MenuExtraction) => {
        setImportedData(data);
        setUseImportedMenu(true);
        setCategoryFilter('all');
        setSearchQuery('');
        setShowWelcomeDialog(false);
    };

    // Clear imported data and revert to demo
    const handleClearImport = () => {
        setImportedData(null);
        setUseImportedMenu(false);
        setCategoryFilter('all');
        setSearchQuery('');
    };

    // Create retailer from imported data or use demo
    const retailer: Retailer = useImportedMenu && importedData ? {
        id: 'imported-retailer',
        name: importedData.dispensary.name || 'Your Dispensary',
        address: importedData.dispensary.address || '123 Main St',
        city: importedData.dispensary.city || 'San Francisco',
        state: importedData.dispensary.state || 'CA',
        zip: '94102',
        phone: importedData.dispensary.phone || '',
        lat: 37.7749,
        lon: -122.4194,
        brandIds: ['imported-brand'],
        logo: importedData.dispensary.logoUrl,
    } : demoRetailers[0];

    // Get products based on import state
    const activeProducts = useImportedMenu && importedData
        ? convertImportedProducts(importedData.products, 'imported-brand')
        : demoProducts.map(p => ({ ...p, brandId: 'demo-40tons' }));

    // Get brand info for display
    const brandName = menuMode === 'brand'
        ? demoBrand.name
        : (useImportedMenu && importedData ? importedData.dispensary.name || 'Your Menu' : 'BakedBot Demo');

    // Get custom brand colors for styling
    const brandColors = menuMode === 'brand'
        ? { primary: demoBrand.primaryColor, secondary: demoBrand.secondaryColor }
        : (useImportedMenu && importedData ? {
            primary: importedData.dispensary.primaryColor || '#16a34a',
            secondary: importedData.dispensary.secondaryColor || '#064e3b',
        } : { primary: '#16a34a', secondary: '#064e3b' });

    // Filter and sort products
    const filteredProducts = useMemo(() => {
        return activeProducts
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
    }, [activeProducts, searchQuery, categoryFilter, sortBy]);

    // Group products by category
    const productsByCategory = useMemo(() => {
        const grouped: Record<string, Product[]> = {};
        activeProducts.forEach(product => {
            if (!grouped[product.category]) {
                grouped[product.category] = [];
            }
            grouped[product.category].push(product);
        });
        return grouped;
    }, [activeProducts]);

    // Get unique categories
    const categories = useMemo(() => {
        const cats = Array.from(new Set(activeProducts.map(p => p.category)));
        return CATEGORY_ORDER.filter(c => cats.includes(c));
    }, [activeProducts]);

    // Featured products (highest likes)
    const featuredProducts = useMemo(() => {
        return [...activeProducts]
            .sort((a, b) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 8);
    }, [activeProducts]);

    // Deals/Sale products (for demo, products under $30)
    const dealProducts = useMemo(() => {
        return activeProducts.filter(p => p.price < 30).slice(0, 8);
    }, [activeProducts]);

    const handleAddToCart = (product: Product, quantity: number = 1) => {
        for (let i = 0; i < quantity; i++) {
            addToCart(product, selectedDispensary?.id || retailer.id);
        }
    };

    const getCartItemQuantity = (productId: string): number => {
        const item = cartItems.find(i => i.id === productId);
        return item?.quantity || 0;
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleCategorySelect = (category: string) => {
        setCategoryFilter(category);
        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    };



    // Get deal badge for products
    const getDealBadge = (product: Product): string | undefined => {
        if (product.price < 20) return '2 for $30';
        if (product.price < 30) return 'DEAL';
        if ((product.thcPercent || 0) > 28) return 'HIGH THC';
        return undefined;
    };

    // Handle dispensary selection in brand mode
    const handleDispensarySelect = (dispensary: typeof selectedDispensary) => {
        setSelectedDispensary(dispensary);
        if (dispensary && cartItems.length > 0) {
            setBrandView('checkout');
        }
    };

    // Handle brand checkout completion
    const handleCheckoutComplete = () => {
        clearCart();
        setBrandView('shop');
        setSelectedDispensary(null);
    };

    // Cart items for brand checkout
    const cartItemsWithQuantity = cartItems.map(item => ({
        ...item,
        quantity: item.quantity || 1,
    }));

    // Handle cart quantity update
    const handleUpdateCartQuantity = (productId: string, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(productId);
        } else {
            updateQuantity(productId, quantity);
        }
    };

    // Default bundles for click handling
    const defaultBundles = [
        { id: '1', name: 'Starter Pack', description: 'Pre-roll + Gummies + Grinder', originalPrice: 55, bundlePrice: 40, savingsPercent: 27, badge: 'BEST SELLER', backgroundColor: '#16a34a' },
        { id: '2', name: 'Weekend Vibes', description: 'Any 3 Edibles for $50', originalPrice: 66, bundlePrice: 50, savingsPercent: 24, badge: 'POPULAR', backgroundColor: '#8b5cf6' },
        { id: '3', name: 'Concentrate Bundle', description: 'Live Resin + Badder + Diamonds', originalPrice: 160, bundlePrice: 120, savingsPercent: 25, badge: 'PREMIUM', backgroundColor: '#f59e0b' },
        { id: '4', name: 'Vape Trio', description: '3 Cartridges for $100', originalPrice: 135, bundlePrice: 100, savingsPercent: 26, backgroundColor: '#3b82f6' },
        { id: '5', name: 'Sleep Bundle', description: 'Indica Flower + Sleep Tincture', originalPrice: 100, bundlePrice: 75, savingsPercent: 25, badge: 'NEW', backgroundColor: '#6366f1' },
        { id: '6', name: 'First Timer Pack', description: 'CBD Pre-Roll + 1:1 Gummies', originalPrice: 38, bundlePrice: 28, savingsPercent: 26, badge: 'LOW THC', backgroundColor: '#10b981' },
    ];

    // Handle bundle click
    const handleBundleClick = (bundleId: string) => {
        const bundle = defaultBundles.find(b => b.id === bundleId);
        if (bundle) {
            setSelectedBundle(bundle);
        }
    };

    // Handle adding bundle to cart
    const handleAddBundleToCart = (bundle: BundleDeal, quantity: number) => {
        // Create a synthetic product for the bundle
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
            addToCart(bundleProduct, selectedDispensary?.id || retailer.id);
        }
    };

    // Render welcome dialog with import option
    const renderWelcomeDialog = () => (
        <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Sparkles className="h-6 w-6 text-green-600" />
                        Welcome to BakedBot Demo
                    </DialogTitle>
                    <DialogDescription>
                        Experience how BakedBot can transform your dispensary&apos;s online presence.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Import Option */}
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                        <Globe className="h-10 w-10 mx-auto mb-3 text-green-600" />
                        <h3 className="font-semibold mb-2">Import Your Menu</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Enter your dispensary URL to see your actual products in BakedBot
                        </p>
                        <MenuImportDialog
                            onImportComplete={handleImportComplete}
                            trigger={
                                <Button className="gap-2" style={{ backgroundColor: '#16a34a' }}>
                                    <Upload className="h-4 w-4" />
                                    Import My Menu
                                </Button>
                            }
                        />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">or</span>
                        </div>
                    </div>

                    {/* Browse Demo Option */}
                    <Button
                        variant="outline"
                        className="w-full h-12"
                        onClick={() => setShowWelcomeDialog(false)}
                    >
                        Browse Demo Menu
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>

                {/* Get Started CTA */}
                <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground text-center mb-3">
                        Ready to power up your dispensary?
                    </p>
                    <Link href="/get-started" className="block">
                        <Button className="w-full gap-2" variant="default">
                            <Rocket className="h-4 w-4" />
                            Get Started Free
                        </Button>
                    </Link>
                </div>
            </DialogContent>
        </Dialog>
    );

    // Render mode toggle
    const renderModeToggle = () => (
        <div className="bg-gradient-to-r from-green-50 to-purple-50 dark:from-green-950 dark:to-purple-950 border-b">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-center gap-4">
                    <span className="text-sm font-medium hidden sm:inline">Try Demo Mode:</span>
                    <Tabs value={menuMode} onValueChange={(v) => {
                        setMenuMode(v as MenuMode);
                        setBrandView('shop');
                        setSelectedDispensary(null);
                    }}>
                        <TabsList className="grid grid-cols-2 w-[320px] h-11">
                            <TabsTrigger value="dispensary" className="gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white">
                                <Store className="h-4 w-4" />
                                Dispensary Menu
                            </TabsTrigger>
                            <TabsTrigger value="brand" className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                                <Leaf className="h-4 w-4" />
                                Brand Menu
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>
        </div>
    );

    // Render Brand Menu Experience
    const renderBrandMenu = () => {
        // Show checkout flow if in checkout view with selected dispensary
        if (brandView === 'checkout' && selectedDispensary && cartItems.length > 0) {
            return (
                <div className="min-h-screen bg-background flex flex-col">
                    <BrandMenuHeader
                        brandName={demoBrand.name}
                        brandColors={brandColors}
                        verified
                        tagline={demoBrand.tagline}
                        cartItemCount={cartItems.length}
                        selectedDispensary={selectedDispensary}
                        onCartClick={() => setBrandView('checkout')}
                        onLocationClick={() => setBrandView('locator')}
                    />
                    {renderModeToggle()}

                    <main className="flex-1">
                        <BrandCheckoutFlow
                            brandName={demoBrand.name}
                            primaryColor={brandColors.primary}
                            cartItems={cartItemsWithQuantity}
                            pickupLocation={selectedDispensary}
                            onBack={() => setBrandView('locator')}
                            onComplete={handleCheckoutComplete}
                        />
                    </main>
                </div>
            );
        }

        // Show dispensary locator if in locator view
        if (brandView === 'locator') {
            return (
                <div className="min-h-screen bg-background flex flex-col">
                    <BrandMenuHeader
                        brandName={demoBrand.name}
                        brandColors={brandColors}
                        verified
                        tagline={demoBrand.tagline}
                        cartItemCount={cartItems.length}
                        selectedDispensary={selectedDispensary}
                        onCartClick={() => cartItems.length > 0 && selectedDispensary && setBrandView('checkout')}
                        onLocationClick={() => setBrandView('locator')}
                    />
                    {renderModeToggle()}

                    <main className="flex-1">
                        <DispensaryLocatorFlow
                            brandName={demoBrand.name}
                            primaryColor={brandColors.primary}
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
                                            style={{ backgroundColor: brandColors.primary }}
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
                        brandName={demoBrand.name}
                        primaryColor={brandColors.primary}
                    />
                </div>
            );
        }

        // Default: Brand shopping experience
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <BrandMenuHeader
                    brandName={demoBrand.name}
                    brandColors={brandColors}
                    verified
                    tagline={demoBrand.tagline}
                    cartItemCount={cartItems.length}
                    selectedDispensary={selectedDispensary}
                    onSearch={handleSearch}
                    onCartClick={() => {
                        if (cartItems.length > 0) {
                            if (selectedDispensary) {
                                setBrandView('checkout');
                            } else {
                                setBrandView('locator');
                            }
                        }
                    }}
                    onLocationClick={() => setBrandView('locator')}
                />
                {renderModeToggle()}

                <main className="flex-1">
                    {/* Brand Hero */}
                    <BrandHero
                        brandName={demoBrand.name}
                        tagline={demoBrand.tagline}
                        description={demoBrand.description}
                        primaryColor={brandColors.primary}
                        verified
                        stats={demoBrand.stats}
                        onFindNearMe={() => setBrandView('locator')}
                        onShopNow={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                    />

                    {/* Selected Dispensary Banner */}
                    {selectedDispensary && (
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

                    {/* Featured Products Section */}
                    <ProductSection
                        title="Featured Products"
                        subtitle="Our most popular items"
                        products={featuredProducts}
                        onAddToCart={handleAddToCart}
                        getCartQuantity={getCartItemQuantity}
                        primaryColor={brandColors.primary}
                        layout="carousel"
                        dealBadge={getDealBadge}
                        onProductClick={setSelectedProduct}
                        onFavorite={toggleFavorite}
                        favorites={favorites}
                    />

                    {/* Category Grid */}
                    <CategoryGrid
                        title="Shop by Category"
                        onCategoryClick={handleCategorySelect}
                        primaryColor={brandColors.primary}
                    />

                    {/* All Products Section with Filters */}
                    <section id="products" className="py-12">
                        <div className="container mx-auto px-4">
                            {/* Section Header */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">All {demoBrand.name} Products</h2>
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
                                            primaryColor={brandColors.primary}
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

                    {/* Find Pickup Location CTA */}
                    {!selectedDispensary && (
                        <section className="py-12 bg-muted/50">
                            <div className="container mx-auto px-4 text-center">
                                <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Order?</h2>
                                <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                                    Find a licensed dispensary near you that carries {demoBrand.name} products.
                                    Order online and pick up in store.
                                </p>
                                <Button
                                    size="lg"
                                    className="font-bold gap-2"
                                    style={{ backgroundColor: brandColors.primary }}
                                    onClick={() => setBrandView('locator')}
                                >
                                    <Store className="h-5 w-5" />
                                    Find Pickup Location
                                </Button>
                            </div>
                        </section>
                    )}

                    {/* Dispensary Claim CTA */}
                    <DispensaryClaimCTA
                        brandName={demoBrand.name}
                        primaryColor={brandColors.primary}
                        variant="inline"
                    />
                </main>

                <DemoFooter
                    brandName={demoBrand.name}
                    primaryColor={brandColors.primary}
                />

                {/* Smokey Chatbot */}
                <Chatbot products={activeProducts} brandId="demo-40tons" />
            </div>
        );
    };

    // Render Dispensary Menu Experience (existing)
    const renderDispensaryMenu = () => (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Demo Header with Ticker */}
            <DemoHeader
                brandName={brandName}
                brandLogo={importedData?.dispensary.logoUrl}
                brandColors={brandColors}
                location={`${retailer.city}, ${retailer.state}`}
                onSearch={handleSearch}
                onCategorySelect={handleCategorySelect}
                onCartClick={() => setCartOpen(true)}
            />

            {renderModeToggle()}

            {/* Import Banner */}
            {useImportedMenu && importedData && (
                <div className="bg-green-50 border-b border-green-200 dark:bg-green-950 dark:border-green-800">
                    <div className="container mx-auto px-4 py-3">
                        <Alert className="bg-transparent border-0 p-0">
                            <Sparkles className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 dark:text-green-200 flex items-center justify-between">
                                <span>
                                    Previewing your menu from <strong>{importedData.dispensary.name}</strong> with {activeProducts.length} products.
                                </span>
                                <Button variant="ghost" size="sm" onClick={handleClearImport} className="gap-1 text-green-700">
                                    <X className="h-4 w-4" />
                                    Clear
                                </Button>
                            </AlertDescription>
                        </Alert>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1">
                {/* Hero Carousel */}
                <HeroCarousel primaryColor={brandColors.primary} />

                {/* Featured Brands */}
                <FeaturedBrandsCarousel
                    title="Featured Brands"
                    primaryColor={brandColors.primary}
                />

                {/* Category Grid */}
                <CategoryGrid
                    title="Shop by Category"
                    onCategoryClick={handleCategorySelect}
                    primaryColor={brandColors.primary}
                />

                {/* Bundle Deals */}
                <BundleDealsSection
                    title="Bundle & Save"
                    subtitle="Curated packs at special prices. More value, less hassle."
                    primaryColor={brandColors.primary}
                    onBundleClick={handleBundleClick}
                />

                {/* Featured Products Section */}
                <ProductSection
                    title="Customer Favorites"
                    subtitle="Our most loved products based on reviews and sales"
                    products={featuredProducts}
                    onAddToCart={handleAddToCart}
                    getCartQuantity={getCartItemQuantity}
                    primaryColor={brandColors.primary}
                    layout="carousel"
                    dealBadge={getDealBadge}
                />

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
                        />
                    </div>
                )}

                {/* Import Your Menu CTA */}
                {!useImportedMenu && (
                    <section className="py-12 bg-muted/50">
                        <div className="container mx-auto px-4">
                            <Card className="overflow-hidden">
                                <div className="grid md:grid-cols-2 gap-0">
                                    <div
                                        className="p-8 md:p-12 flex flex-col justify-center"
                                        style={{ backgroundColor: brandColors.primary }}
                                    >
                                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                                            See Your Menu in BakedBot
                                        </h2>
                                        <p className="text-white/90 mb-6">
                                            Enter your dispensary URL and we&apos;ll import your products, branding, and deals
                                            to show you exactly how your menu would look.
                                        </p>
                                        <MenuImportDialog
                                            onImportComplete={handleImportComplete}
                                            trigger={
                                                <Button size="lg" className="w-fit bg-white text-black hover:bg-white/90 font-bold gap-2">
                                                    <Upload className="h-5 w-5" />
                                                    Import Your Menu
                                                </Button>
                                            }
                                        />
                                    </div>
                                    <div className="p-8 md:p-12 bg-background">
                                        <h3 className="font-bold text-lg mb-4">What we&apos;ll extract:</h3>
                                        <ul className="space-y-3 text-muted-foreground">
                                            <li className="flex items-center gap-2">
                                                <span className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm">✓</span>
                                                All your products with prices, THC/CBD, categories
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm">✓</span>
                                                Your brand colors and logo
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm">✓</span>
                                                Current deals and promotions
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm">✓</span>
                                                Store info and hours
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </section>
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
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredProducts.map((product) => (
                                    <OversizedProductCard
                                        key={product.id}
                                        product={product}
                                        onAddToCart={handleAddToCart}
                                        inCart={getCartItemQuantity(product.id)}
                                        primaryColor={brandColors.primary}
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
                            primaryColor={brandColors.primary}
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
                brandName={brandName}
                brandLogo={importedData?.dispensary.logoUrl}
                primaryColor={brandColors.primary}
                location={{
                    address: retailer.address,
                    city: retailer.city,
                    state: retailer.state,
                    zip: retailer.zip,
                    phone: retailer.phone,
                    hours: importedData?.dispensary.hours || '9AM - 10PM',
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
                    // In demo mode, just show a message
                    alert('In production, this would proceed to checkout!');
                }}
                primaryColor={brandColors.primary}
            />

            {/* Bundle Detail Dialog */}
            <BundleDetailDialog
                bundle={selectedBundle}
                open={!!selectedBundle}
                onClose={() => setSelectedBundle(null)}
                onAddToCart={handleAddBundleToCart}
                primaryColor={brandColors.primary}
            />

            {/* Product Detail Modal */}
            <ProductDetailModal
                product={selectedProduct}
                open={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onAddToCart={handleAddToCart}
                onFavorite={toggleFavorite}
                isFavorite={selectedProduct ? favorites.has(selectedProduct.id) : false}
                primaryColor={brandColors.primary}
            />

            {/* Smokey Chatbot */}
            <Chatbot products={activeProducts} brandId={useImportedMenu ? 'imported-brand' : 'demo-40tons'} />
        </div>
    );

    // Render based on menu mode
    return (
        <>
            {showAgeGate && (
                <AgeGateWithEmail
                    onVerified={() => setShowAgeGate(false)}
                    brandId="demo-40tons"
                    source="demo-shop"
                    state="IL"
                />
            )}
            {renderWelcomeDialog()}
            {menuMode === 'brand' ? renderBrandMenu() : renderDispensaryMenu()}
        </>
    );
}
