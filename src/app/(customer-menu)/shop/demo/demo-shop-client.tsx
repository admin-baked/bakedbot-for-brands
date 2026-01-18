// src/app/shop/demo/demo-shop-client.tsx
'use client';

/**
 * Demo shopping page client component - Quality Roots inspired design
 * Full dispensary experience with ticker, carousels, bundles, and oversized cards
 */

import { useState, useMemo } from 'react';
import dynamicImport from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Search, Upload, X, Sparkles, Filter } from 'lucide-react';
import { demoProducts, demoRetailers } from '@/lib/demo/demo-data';
import { useStore } from '@/hooks/use-store';
import { Product, Retailer } from '@/types/domain';
import { Alert, AlertDescription } from '@/components/ui/alert';

// New demo components
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { HeroCarousel } from '@/components/demo/hero-carousel';
import { FeaturedBrandsCarousel } from '@/components/demo/featured-brands-carousel';
import { CategoryGrid } from '@/components/demo/category-grid';
import { BundleDealsSection } from '@/components/demo/bundle-deals-section';
import { ProductSection } from '@/components/demo/product-section';
import { OversizedProductCard } from '@/components/demo/oversized-product-card';
import { MenuImportDialog } from '@/components/demo/menu-import-dialog';
import type { MenuExtraction, ExtractedProduct } from '@/app/api/demo/import-menu/route';

// Dynamic import to prevent Firebase initialization during prerender
const Chatbot = dynamicImport(() => import('@/components/chatbot'), { ssr: false });

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

export default function DemoShopClient() {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('popular');
    const [showFilters, setShowFilters] = useState(false);

    // Imported menu state
    const [importedData, setImportedData] = useState<MenuExtraction | null>(null);
    const [useImportedMenu, setUseImportedMenu] = useState(false);

    const { addToCart, cartItems } = useStore();

    // Handle menu import completion
    const handleImportComplete = (data: MenuExtraction) => {
        setImportedData(data);
        setUseImportedMenu(true);
        setCategoryFilter('all');
        setSearchQuery('');
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
    const brandName = useImportedMenu && importedData
        ? importedData.dispensary.name || 'Your Menu'
        : 'BakedBot Demo';

    // Get custom brand colors for styling
    const brandColors = useImportedMenu && importedData ? {
        primary: importedData.dispensary.primaryColor || '#16a34a',
        secondary: importedData.dispensary.secondaryColor || '#064e3b',
    } : { primary: '#16a34a', secondary: '#064e3b' };

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
            addToCart(product, retailer.id);
        }
    };

    const getCartItemQuantity = (productId: string): number => {
        const item = cartItems.find(i => i.id === productId);
        return item?.quantity || 0;
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        // Scroll to products section
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

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Demo Header with Ticker */}
            <DemoHeader
                brandName={brandName}
                brandLogo={importedData?.dispensary.logoUrl}
                brandColors={brandColors}
                location={`${retailer.city}, ${retailer.state}`}
                onSearch={handleSearch}
                onCategorySelect={handleCategorySelect}
            />

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
                    <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 py-2">
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

            {/* Smokey Chatbot */}
            <Chatbot products={activeProducts} brandId={useImportedMenu ? 'imported-brand' : 'demo-40tons'} />
        </div>
    );
}
