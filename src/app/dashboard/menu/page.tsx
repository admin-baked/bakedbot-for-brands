
// src/app/dashboard/menu/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, ShoppingBag, RefreshCw, DollarSign, AlertTriangle, Pencil, Check, X } from 'lucide-react';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { logger } from '@/lib/logger';
import { getMenuData, syncMenu, getPosConfig, updateProductCost, type PosConfigInfo } from './actions';
import { useToast } from '@/hooks/use-toast';

interface Product {
    id: string;
    name: string;
    brand: string;
    category: string;
    price: number;
    originalPrice: number;
    imageUrl?: string;
    thc?: number;
    cbd?: number;
    cost?: number;
    url?: string;
    inStock?: boolean;
    stockCount?: number;
}

function CostCell({ product, onSaved }: { product: Product; onSaved: (id: string, cost: number | null) => void }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(product.cost != null ? String(product.cost) : '');
    const [saving, setSaving] = useState(false);

    const margin = product.cost != null && product.price > 0
        ? ((product.price - product.cost) / product.price * 100).toFixed(0)
        : null;

    const save = async () => {
        setSaving(true);
        const parsed = value.trim() === '' ? null : parseFloat(value);
        if (parsed !== null && isNaN(parsed)) {
            setSaving(false);
            return;
        }
        const result = await updateProductCost(product.id, parsed);
        setSaving(false);
        if (result.success) {
            onSaved(product.id, parsed);
            setEditing(false);
        }
    };

    if (editing) {
        return (
            <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">$</span>
                <Input
                    autoFocus
                    type="number"
                    step="0.01"
                    min="0"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
                    className="h-7 w-20 text-sm px-1"
                />
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-emerald-600" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)}>
                    <X className="h-3 w-3" />
                </Button>
            </div>
        );
    }

    if (product.cost == null) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => setEditing(true)}
                            className="flex items-center gap-1 group"
                        >
                            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs font-normal">
                                Not Set
                            </Badge>
                            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Click to add cost — required for margin calculations and deal safety checks</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 group text-left"
        >
            <div>
                <div className="text-sm font-medium">${product.cost.toFixed(2)}</div>
                {margin !== null && (
                    <div className={`text-xs ${Number(margin) < 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {margin}% margin
                    </div>
                )}
            </div>
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
    );
}

export default function MenuPage() {
    const [products, setProducts] = useState<Product[]>([]);
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
                toast({
                    title: "Sync Complete",
                    description: `Synced ${result.count} products from ${posConfig.displayName}.${result.removed ? ` Removed ${result.removed} stale products.` : ''}`,
                });
                await loadProducts();
            } else {
                toast({ title: "Sync Failed", description: result.error, variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
        } finally {
            setIsSyncing(false);
        }
    };

    const loadProducts = useCallback(async () => {
        setLoading(true);
        try {
            const [data, config] = await Promise.all([getMenuData(), getPosConfig()]);
            setPosConfig(config);

            const normalized: Product[] = data.products.map((p: any) => ({
                id: p.id || p.cann_sku_id,
                name: p.name || p.product_name,
                brand: p.brandName || p.brand_name || 'Unknown',
                category: p.category || 'Other',
                price: p.price || p.latest_price || 0,
                originalPrice: p.originalPrice || p.original_price || p.price || p.latest_price || 0,
                imageUrl: p.imageUrl || p.image_url,
                thc: p.thcPercent || p.percentage_thc,
                cbd: p.cbdPercent || p.percentage_cbd,
                cost: p.cost ?? undefined,
                url: p.url,
                inStock: p.inStock,
                stockCount: p.stockCount,
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

    useEffect(() => { loadProducts(); }, [loadProducts]);

    const handleCostSaved = (id: string, cost: number | null) => {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, cost: cost ?? undefined } : p));
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const categories = Array.from(new Set(products.map(p => p.category)));
    const missingCOGSCount = products.filter(p => p.cost == null).length;

    return (
        <div className="space-y-6">
            {/* Header */}
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

            {/* COGS Alert Banner */}
            {missingCOGSCount > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                        <span className="font-semibold">{missingCOGSCount} product{missingCOGSCount !== 1 ? 's' : ''}</span> missing cost data.
                        Without COGS, you risk over-discounting. Click <span className="font-medium">Not Set</span> on any product to add it.
                    </p>
                </div>
            )}

            {/* Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Search className="h-4 w-4" />
                        Search & Filter
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories ({products.length})</SelectItem>
                                {categories.map((cat) => {
                                    const count = products.filter(p => p.category === cat).length;
                                    return (
                                        <SelectItem key={cat} value={cat}>
                                            {cat} ({count})
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Product Table */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : filteredProducts.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No products found</p>
                        <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            <span>Click any COGS cell to edit</span>
                        </div>
                    </div>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="text-left font-medium px-4 py-3 w-12"></th>
                                        <th className="text-left font-medium px-4 py-3">Product</th>
                                        <th className="text-left font-medium px-4 py-3">Category</th>
                                        <th className="text-left font-medium px-4 py-3">THC / CBD</th>
                                        <th className="text-right font-medium px-4 py-3">Retail Price</th>
                                        <th className="text-left font-medium px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                COGS
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Cost of Goods Sold — what you paid for this product.
                                                            Used to calculate margin and prevent over-discounting.
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </th>
                                        <th className="text-left font-medium px-4 py-3">Stock</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-muted/20 transition-colors">
                                            {/* Thumbnail */}
                                            <td className="px-4 py-3">
                                                <div className="w-10 h-10 rounded bg-muted relative overflow-hidden flex-shrink-0">
                                                    {product.imageUrl ? (
                                                        <Image
                                                            src={product.imageUrl}
                                                            alt={product.name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="40px"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full">
                                                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Name + Brand */}
                                            <td className="px-4 py-3">
                                                <div className="font-medium line-clamp-1">{product.name}</div>
                                                <div className="text-xs text-muted-foreground">{product.brand}</div>
                                            </td>

                                            {/* Category */}
                                            <td className="px-4 py-3">
                                                <Badge variant="secondary" className="text-xs font-normal">
                                                    {product.category}
                                                </Badge>
                                            </td>

                                            {/* THC / CBD */}
                                            <td className="px-4 py-3 text-muted-foreground text-xs">
                                                {product.thc ? <span className="text-green-700 font-medium">{product.thc}% THC</span> : '—'}
                                                {product.thc && product.cbd ? ' · ' : ''}
                                                {product.cbd ? <span>{product.cbd}% CBD</span> : ''}
                                                {!product.thc && !product.cbd ? '—' : ''}
                                            </td>

                                            {/* Retail Price */}
                                            <td className="px-4 py-3 text-right font-semibold">
                                                ${product.price ? product.price.toFixed(2) : '0.00'}
                                            </td>

                                            {/* COGS — editable */}
                                            <td className="px-4 py-3">
                                                <CostCell product={product} onSaved={handleCostSaved} />
                                            </td>

                                            {/* Stock */}
                                            <td className="px-4 py-3">
                                                {product.inStock !== undefined ? (
                                                    <span className={`text-xs font-medium ${product.inStock ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {product.inStock ? (product.stockCount != null ? `${product.stockCount} in stock` : 'In Stock') : 'Out of Stock'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}
