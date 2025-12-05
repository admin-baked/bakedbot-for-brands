// src/app/shop/demo/demo-shop-client.tsx
'use client';

/**
 * Demo shopping page client component using 40 Tons demo data
 * Standalone layout without the customer-menu wrapper
 */

import { useState } from 'react';
import dynamicImport from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, ShoppingCart, Plus, Heart, Sparkles, ArrowLeft, Grid, List } from 'lucide-react';
import { demoProducts, demoRetailers } from '@/lib/demo/demo-data';
import { useStore } from '@/hooks/use-store';
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/types/domain';

// Dynamic import to prevent Firebase initialization during prerender
const Chatbot = dynamicImport(() => import('@/components/chatbot'), { ssr: false });

// Convert demo products to full Product type for chatbot
const chatProducts: Product[] = demoProducts.map(p => ({
    ...p,
    brandId: 'demo-40tons',
}));

export default function DemoShopClient() {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('name');
    const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');

    const { addToCart, cartItems, setSelectedRetailerId } = useStore();

    const retailer = demoRetailers[0]; // Bayside Cannabis

    const filteredProducts = demoProducts
        .filter(product => {
            const matchesSearch = product.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            const matchesCategory =
                categoryFilter === 'all' || product.category === categoryFilter;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'price-low':
                    return a.price - b.price;
                case 'price-high':
                    return b.price - a.price;
                case 'popular':
                    return (b.likes || 0) - (a.likes || 0);
                default:
                    return a.name.localeCompare(b.name);
            }
        });

    const categories = Array.from(new Set(demoProducts.map(p => p.category)));

    const handleAddToCart = (product: typeof demoProducts[0]) => {
        // Convert demo product to domain Product type
        const domainProduct: Product = {
            ...product,
            brandId: 'demo-40tons',
        };
        addToCart(domainProduct, retailer.id);
    };

    const getCartItemQuantity = (productId: string): number => {
        const item = cartItems.find(i => i.id === productId);
        return item?.quantity || 0;
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header removed to avoid duplication with AppLayout */}

            <div className="container mx-auto px-4 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2">
                                <ArrowLeft size={16} />
                                Back to Home
                            </Link>
                            <h1 className="text-3xl font-bold tracking-tight">40 Tons Demo Menu</h1>
                            <p className="text-muted-foreground">Experience our headless menu powered by AI</p>
                        </div>
                    </div>

                    {/* Retailer Info */}
                    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-green-900">{retailer.name}</p>
                                    <p className="text-sm text-green-700">{retailer.address}, {retailer.city}, {retailer.state} {retailer.zip}</p>
                                </div>
                                <Badge className="bg-green-600">Open Now</Badge>
                            </div>
                        </CardContent>
                    </Card>
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
                                    placeholder="Search 40 Tons products..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">Name (A-Z)</SelectItem>
                                    <SelectItem value="price-low">Price (Low to High)</SelectItem>
                                    <SelectItem value="price-high">Price (High to Low)</SelectItem>
                                    <SelectItem value="popular">Most Popular</SelectItem>
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

                {/* View Toggle */}
                <div className="flex justify-end mb-4">
                    <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('grid')}
                            className="h-8 w-8 p-0"
                        >
                            <Grid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'compact' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('compact')}
                            className="h-8 w-8 p-0"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
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
                    <div className={viewMode === 'grid'
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    }>
                        {filteredProducts.map((product) => {
                            const inCart = getCartItemQuantity(product.id) > 0;

                            if (viewMode === 'compact') {
                                return (
                                    <Card key={product.id} className="overflow-hidden hover:shadow-md transition-all flex flex-row h-32">
                                        <div className="relative w-32 h-full bg-muted shrink-0">
                                            {product.imageUrl ? (
                                                <Image
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full">
                                                    <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col justify-between p-3 flex-1 min-w-0">
                                            <div>
                                                <h3 className="font-semibold text-sm line-clamp-1" title={product.name}>{product.name}</h3>
                                                <p className="text-xs text-muted-foreground line-clamp-1">{product.category}</p>
                                                <div className="mt-1 font-bold text-sm">${product.price.toFixed(2)}</div>
                                            </div>
                                            <Button
                                                onClick={() => handleAddToCart(product)}
                                                size="sm"
                                                variant={inCart ? "secondary" : "outline"}
                                                className="w-full h-8 text-xs"
                                            >
                                                {inCart ? 'In Cart' : 'Add'}
                                            </Button>
                                        </div>
                                    </Card>
                                );
                            }

                            return (
                                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-all group">
                                    {/* Product Image */}
                                    <div className="aspect-square relative bg-muted">
                                        {product.imageUrl ? (
                                            <Image
                                                src={product.imageUrl}
                                                alt={product.name}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform"
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                                            </div>
                                        )}

                                        {/* Quick Actions */}
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="secondary" className="rounded-full">
                                                <Heart className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* Brand Badge */}
                                        <Badge className="absolute top-2 left-2 bg-black/70">
                                            40 Tons
                                        </Badge>
                                    </div>

                                    {/* Product Info */}
                                    <CardHeader className="p-4">
                                        <div className="space-y-1">
                                            <CardTitle className="text-base line-clamp-2 leading-tight">
                                                {product.name}
                                            </CardTitle>
                                            <CardDescription className="text-xs line-clamp-2">
                                                {product.description}
                                            </CardDescription>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-4 pt-0 space-y-3">
                                        {/* Category Badge */}
                                        <Badge variant="outline" className="text-xs">
                                            {product.category}
                                        </Badge>

                                        {/* Engagement */}
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>👍 {product.likes}</span>
                                        </div>

                                        {/* Price and Add to Cart */}
                                        <div className="flex items-center justify-between pt-2 border-t">
                                            <span className="text-lg font-bold">
                                                ${product.price.toFixed(2)}
                                            </span>
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
                                                    In Cart ({getCartItemQuantity(product.id)})
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
            </div>

            {/* Simple Footer */}
            <footer className="border-t bg-muted/40 py-6 mt-12">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    © 2025 BakedBot AI - Agentic Commerce OS for Cannabis
                </div>
            </footer>

            {/* Smokey Chatbot */}
            <Chatbot products={chatProducts} brandId="demo-40tons" />
        </div>
    );
}
