
'use client';

// src/app/(customer-menu)/shop/[dispensaryId]/page.tsx
/**
 * Main shopping page for a selected dispensary
 * Shows products with real-time CannMenus pricing, filters, search, and cart actions
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, ShoppingCart, Plus, Heart } from 'lucide-react';
import { getRetailerProducts } from '@/lib/cannmenus-api';
import { CannMenusProduct } from '@/types/cannmenus';
import { useCartStore } from '@/stores/cart-store';
import { trackSearch, trackFilter, getOrCreateSessionId } from '@/lib/customer-analytics';
import Image from 'next/image';
import Link from 'next/link';
import { FloatingCartButton } from '@/components/floating-cart-button';

export default function DispensaryShopPage() {
    const params = useParams();

    if (!params || typeof params.dispensaryId !== 'string') {
        // This will render the not-found.tsx file if the dispensaryId is missing.
        notFound();
    }
    const dispensaryId = params.dispensaryId;

    const [products, setProducts] = useState<CannMenusProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('name');
    const [sessionId] = useState(() => getOrCreateSessionId());

    const { addItem, items: cartItems, setDispensary } = useCartStore();
    
    const loadProducts = useCallback(async () => {
        setLoading(true);
        try {
            const retailerProducts = await getRetailerProducts(dispensaryId);
            setProducts(retailerProducts);
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setLoading(false);
        }
    }, [dispensaryId]);

    useEffect(() => {
        loadProducts();
        // Set the selected dispensary in cart
        setDispensary(dispensaryId, 'Dispensary Name'); // TODO: Get actual name
    }, [dispensaryId, setDispensary, loadProducts]);

    useEffect(() => {
        if (searchQuery) {
            trackSearch(searchQuery, filteredProducts.length, sessionId);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    const filteredProducts = products
        .filter(product => {
            const matchesSearch = product.product_name
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            const matchesCategory =
                categoryFilter === 'all' || product.category === categoryFilter;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'price-low':
                    return a.latest_price - b.latest_price;
                case 'price-high':
                    return b.latest_price - a.latest_price;
                case 'thc':
                    return (b.percentage_thc || 0) - (a.percentage_thc || 0);
                default:
                    return a.product_name.localeCompare(b.product_name);
            }
        });

    const categories = Array.from(new Set(products.map(p => p.category)));

    const handleAddToCart = (product: CannMenusProduct) => {
        addItem({
            id: product.cann_sku_id,
            productId: product.cann_sku_id,
            name: product.product_name,
            price: product.latest_price,
            imageUrl: product.image_url || '/placeholder-product.jpg',
            brandId: product.brand_id.toString(),
            brandName: product.brand_name || 'Unknown',
            category: product.category,
            dispensaryId: dispensaryId,
            dispensaryName: 'Dispensary Name', // TODO: Get actual name
            displayWeight: product.display_weight,
            thcPercent: product.percentage_thc || undefined,
            cbdPercent: product.percentage_cbd || undefined,
        });
    };

    const getCartItemQuantity = (productId: string): number => {
        const item = cartItems.find(i => i.productId === productId);
        return item?.quantity || 0;
    };

    const handleCategoryChange = (value: string) => {
        setCategoryFilter(value);
        trackFilter('category', value, sessionId);
    };

    const handleSortChange = (value: string) => {
        setSortBy(value);
        trackFilter('sort', value, sessionId);
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-12">
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-lg text-muted-foreground">Loading products...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Shop Products</h1>
                        <p className="text-muted-foreground">Browse our selection</p>
                    </div>
                    <Link href="/">
                        <Button variant="outline">
                            Change Location
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Search & Filter
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <Input
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={sortBy} onValueChange={handleSortChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="name">Name (A-Z)</SelectItem>
                                <SelectItem value="price-low">Price (Low to High)</SelectItem>
                                <SelectItem value="price-high">Price (High to Low)</SelectItem>
                                <SelectItem value="thc">THC % (High to Low)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Results Count */}
            <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                    Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No products found</p>
                        <p className="text-sm text-muted-foreground">
                            Try adjusting your search or filters
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => {
                        const inCart = getCartItemQuantity(product.cann_sku_id) > 0;

                        return (
                            <Card key={product.cann_sku_id} className="overflow-hidden hover:shadow-lg transition-all group">
                                {/* Product Image */}
                                <div className="aspect-square relative bg-muted">
                                    {product.image_url ? (
                                        <Image
                                            src={product.image_url}
                                            alt={product.product_name}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform"
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                                        </div>
                                    )}

                                    {/* Sale Badge */}
                                    {product.original_price !== product.latest_price && (
                                        <Badge className="absolute top-2 left-2 bg-destructive">
                                            Sale
                                        </Badge>
                                    )}

                                    {/* Quick Actions */}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="secondary" className="rounded-full">
                                            <Heart className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Product Info */}
                                <CardHeader className="p-4">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base line-clamp-2 leading-tight">
                                            {product.product_name}
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            {product.brand_name || 'Unknown Brand'} • {product.display_weight}
                                        </CardDescription>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-4 pt-0 space-y-3">
                                    {/* Potency */}
                                    <div className="flex gap-2">
                                        {product.percentage_thc && (
                                            <Badge variant="outline" className="text-xs">
                                                {product.percentage_thc}% THC
                                            </Badge>
                                        )}
                                        {product.percentage_cbd && (
                                            <Badge variant="outline" className="text-xs">
                                                {product.percentage_cbd}% CBD
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Price and Add to Cart */}
                                    <div className="flex items-center justify-between pt-2 border-t">
                                        <div>
                                            {product.original_price !== product.latest_price && (
                                                <span className="text-xs text-muted-foreground line-through mr-2">
                                                    ${product.original_price.toFixed(2)}
                                                </span>
                                            )}
                                            <span className="text-lg font-bold">
                                                ${product.latest_price.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handleAddToCart(product)}
                                        className="w-full"
                                        size="sm"
                                        variant={inCart ? "secondary" : "default"}
                                    >
                                        {inCart ? (
                                            <>
                                                <ShoppingCart className="h-4 w-4 mr-2" />
                                                In Cart ({getCartItemQuantity(product.cann_sku_id)})
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add to Cart
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Floating Cart Button */}
            <FloatingCartButton />
        </div>
    );
}
