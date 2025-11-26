// src/app/dashboard/menu/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, ShoppingBag } from 'lucide-react';
import Image from 'next/image';

type Product = {
    cann_sku_id: string;
    brand_name: string | null;
    brand_id: number;
    url: string;
    image_url: string;
    product_name: string;
    display_weight: string;
    category: string;
    percentage_thc: number | null;
    percentage_cbd: number | null;
    latest_price: number;
    original_price: number;
    medical: boolean;
    recreational: boolean;
};

type ApiResponse = {
    data: Array<{
        retailer_id: string;
        sku: string;
        products: Product[];
    }>;
    pagination: {
        total_records: number;
        current_page: number;
        total_pages: number;
        next_page: number | null;
        prev_page: number | null;
    };
};

export default function MenuPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [brandId] = useState('10982'); // CRONJA brand
    const [state] = useState('Illinois');

    useEffect(() => {
        loadProducts();
    }, [brandId, state]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                states: state,
                brands: brandId,
            });

            const response = await fetch(`/api/cannmenus/products?${params}`);
            const result = await response.json();

            if (result.data?.data) {
                // Flatten the nested structure: each retailer has products array
                const allProducts: Product[] = [];
                result.data.data.forEach((item: any) => {
                    if (item.products && Array.isArray(item.products)) {
                        allProducts.push(...item.products);
                    }
                });

                // Deduplicate by cann_sku_id
                const uniqueProducts = Array.from(
                    new Map(allProducts.map(p => [p.cann_sku_id, p])).values()
                );

                setProducts(uniqueProducts);
            }
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.product_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        const matchesCategory =
            categoryFilter === 'all' || product.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const categories = Array.from(new Set(products.map(p => p.category)));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Headless Menu</h1>
                <p className="text-muted-foreground">
                    Manage and preview your product catalog powered by CannMenus
                </p>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Search & Filter
                    </CardTitle>
                    <CardDescription>
                        Find products by name or filter by category
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[200px]">
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
                    </div>
                </CardContent>
            </Card>

            {/* Products Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : filteredProducts.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No products found</p>
                        <p className="text-sm text-muted-foreground">
                            Try adjusting your search or filters
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map((product) => (
                            <Card key={product.cann_sku_id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <div className="aspect-square relative bg-muted">
                                    {product.image_url ? (
                                        <Image
                                            src={product.image_url}
                                            alt={product.product_name}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                                <CardHeader className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-base line-clamp-2">
                                                {product.product_name}
                                            </CardTitle>
                                            <CardDescription className="text-xs mt-1">
                                                {product.category} • {product.display_weight}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 space-y-2">
                                    {product.percentage_thc && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">THC</span>
                                            <span className="font-medium">{product.percentage_thc}%</span>
                                        </div>
                                    )}
                                    {product.percentage_cbd && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">CBD</span>
                                            <span className="font-medium">{product.percentage_cbd}%</span>
                                        </div>
                                    )}
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
                                    <Button variant="outline" size="sm" className="w-full" asChild>
                                        <a href={product.url} target="_blank" rel="noopener noreferrer">
                                            View on Menu
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
