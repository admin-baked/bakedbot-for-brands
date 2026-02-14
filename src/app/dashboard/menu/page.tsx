
// src/app/dashboard/menu/page.tsx
// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, ShoppingBag } from 'lucide-react';
import Image from 'next/image';

import { logger } from '@/lib/logger';
// Product type is now dynamic or imported from actions/domain if needed
import { getMenuData, syncMenu, getPosConfig, type PosConfigInfo } from './actions';
import { RefreshCw } from 'lucide-react'; // Import icon
import { useToast } from '@/hooks/use-toast'; 

export default function MenuPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [source, setSource] = useState<string>('none');
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [posConfig, setPosConfig] = useState<PosConfigInfo>({ provider: null, status: null, displayName: 'POS' });
    const { toast } = useToast();

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await syncMenu();
            if (result.success) {
                const providerName = posConfig.displayName || 'POS';
                toast({
                    title: "Sync Complete",
                    description: `Synced ${result.count} products from ${providerName}.`,
                });
                await loadProducts(); // Reload local data
            } else {
                toast({
                    title: "Sync Failed",
                    description: result.error,
                    variant: "destructive"
                });
            }
        } catch (e) {
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive"
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const loadProducts = useCallback(async () => {
        setLoading(true);
        try {
            // Load POS config and menu data in parallel
            const [data, config] = await Promise.all([
                getMenuData(),
                getPosConfig()
            ]);

            setPosConfig(config);

            // Normalize product format if needed
            const normalized = data.products.map(p => ({
                id: p.id || p.cann_sku_id,
                name: p.name || p.product_name,
                brand: p.brandName || p.brand_name || 'Unknown',
                category: p.category || 'Other',
                price: p.price || p.latest_price || 0,
                originalPrice: p.originalPrice || p.original_price || p.price || p.latest_price || 0,
                imageUrl: p.imageUrl || p.image_url,
                thc: p.thcPercent || p.percentage_thc,
                cbd: p.cbdPercent || p.percentage_cbd,
                url: p.url
            }));

            setProducts(normalized);
            setSource(data.source);
            setLastSyncedAt(data.lastSyncedAt);
        } catch (error) {
            logger.error('Failed to load products:', error instanceof Error ? error : new Error(String(error)));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        const matchesCategory =
            categoryFilter === 'all' || product.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const categories = Array.from(new Set(products.map(p => p.category)));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Main Menu</h1>
                    <p className="text-muted-foreground">
                        Source: <span className="capitalize font-medium text-foreground">{source}</span> 
                        {lastSyncedAt && ` • Last sync: ${lastSyncedAt}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        SOT: POS &gt; CannMenus &gt; Discovery
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSync}
                        disabled={isSyncing || !posConfig.provider}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing...' : `Sync with ${posConfig.displayName}`}
                    </Button>
                </div>
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
                            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <div className="aspect-square relative bg-muted">
                                    {product.imageUrl ? (
                                        <Image
                                            src={product.imageUrl}
                                            alt={product.name}
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
                                                {product.name}
                                            </CardTitle>
                                            <CardDescription className="text-xs mt-1">
                                                {product.category} • {product.brand}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 space-y-2">
                                    {product.thc && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">THC</span>
                                            <span className="font-medium">{product.thc}%</span>
                                        </div>
                                    )}
                                    {product.cbd && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">CBD</span>
                                            <span className="font-medium">{product.cbd}%</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between pt-2 border-t">
                                        <div>
                                            {product.originalPrice > product.price && (
                                                <span className="text-xs text-muted-foreground line-through mr-2">
                                                    ${product.originalPrice.toFixed(2)}
                                                </span>
                                            )}
                                            <span className="text-lg font-bold">
                                                ${product.price ? product.price.toFixed(2) : '0.00'}
                                            </span>
                                        </div>
                                    </div>
                                    {product.url && (
                                        <Button variant="outline" size="sm" className="w-full" asChild>
                                            <a href={product.url} target="_blank" rel="noopener noreferrer">
                                                View on Source
                                            </a>
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
