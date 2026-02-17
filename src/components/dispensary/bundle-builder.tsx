'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BundleDeal, BundleProduct } from '@/types/bundles';
import { Plus, Check, Sparkles, AlertCircle, Loader2, Search, Filter, X, Leaf, Cookie, Droplets, Droplet, Wind, HandHeart, Pill, Coffee, Package, Cigarette } from 'lucide-react';
import { getCategoryIconName, getCategoryIconColor } from '@/lib/utils/product-image';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import Image from 'next/image';
import { fetchEligibleBundleProducts, getBundleFilterOptions, type BundleEligibleProduct, type BundleProductFilters } from '@/app/actions/bundle-products';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    Leaf, Cookie, Droplets, Droplet, Wind, HandHeart, Pill, Coffee, Package, Cigarette,
};

interface BundleBuilderProps {
    deal: BundleDeal;
    orgId: string; // Added orgId for product fetching
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function BundleBuilder({ deal, orgId, open, onOpenChange }: BundleBuilderProps) {
    const { toast } = useToast();

    // Determine how many slots we need. For Mix & Match "Buy 3", it's 3 slots.
    const requiredCount = deal.minProducts || 3;
    const [slots, setSlots] = useState<Array<BundleEligibleProduct | null>>(Array(requiredCount).fill(null));

    // Product data and loading states
    const [eligibleProducts, setEligibleProducts] = useState<BundleEligibleProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // AI price suggestion state
    const [aiSuggestion, setAiSuggestion] = useState<{
        suggestedPrice: number;
        reasoning: string;
        marginAtSuggestedPrice: number;
        priceRange: { min: number; max: number };
        competitiveNote?: string;
    } | null>(null);
    const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);

    // Filter states
    const [filters, setFilters] = useState<BundleProductFilters>({
        inStockOnly: true,
    });
    const [filterOptions, setFilterOptions] = useState<{
        categories: string[];
        brands: string[];
        priceRange: { min: number; max: number };
    }>({
        categories: [],
        brands: [],
        priceRange: { min: 0, max: 100 },
    });

    // Load products and filter options when dialog opens
    useEffect(() => {
        if (open) {
            loadProducts();
            loadFilterOptions();
        }
    }, [open, orgId]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const excludeIds = slots.filter(s => s !== null).map(s => s.id);
            const result = await fetchEligibleBundleProducts(
                orgId,
                deal.type,
                deal.criteria || {},
                { ...filters, excludeIds }
            );

            if (result.success && result.data) {
                setEligibleProducts(result.data);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'Failed to load products',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load products',
            });
        } finally {
            setLoading(false);
        }
    };

    const loadFilterOptions = async () => {
        try {
            const result = await getBundleFilterOptions(orgId);
            if (result.success && result.data) {
                setFilterOptions(result.data);
            }
        } catch (error) {
            console.error('Failed to load filter options:', error);
        }
    };

    // Reload products when filters change
    useEffect(() => {
        if (open) {
            loadProducts();
        }
    }, [filters]);

    const handleSelectProduct = (product: BundleEligibleProduct) => {
        // Find first empty slot
        const emptySlotIndex = slots.findIndex(s => s === null);
        if (emptySlotIndex !== -1) {
            const newSlots = [...slots];
            newSlots[emptySlotIndex] = product;
            setSlots(newSlots);
            // Reload products to exclude newly selected one
            loadProducts();
        }
    };

    const handleRemoveProduct = (index: number) => {
        const newSlots = [...slots];
        newSlots[index] = null;
        setSlots(newSlots);
        // Reload products to include removed product
        loadProducts();
    };

    const isComplete = slots.every(s => s !== null);

    // Calculate pricing metrics
    const selectedProducts = slots.filter(s => s !== null);
    const originalTotal = selectedProducts.reduce((sum, p) => sum + p.price, 0);
    const totalSavings = originalTotal - deal.bundlePrice;
    const savingsPercent = originalTotal > 0 ? (totalSavings / originalTotal) * 100 : 0;
    const avgUnitCost = selectedProducts.reduce((sum, p) => sum + (p.unitCost || 0), 0) / Math.max(selectedProducts.length, 1);
    const totalMargin = deal.bundlePrice - (avgUnitCost * selectedProducts.length);
    const marginPercent = deal.bundlePrice > 0 ? (totalMargin / deal.bundlePrice) * 100 : 0;

    // Filter products by search query
    const filteredProducts = eligibleProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get AI price suggestion
    const handleGetAiPriceSuggestion = async () => {
        if (selectedProducts.length === 0) return;
        setAiSuggestionLoading(true);
        setAiSuggestion(null);
        try {
            const { getBundlePriceSuggestion } = await import('@/app/actions/dynamic-pricing');
            const result = await getBundlePriceSuggestion(
                selectedProducts.map(p => ({
                    name: p.name,
                    category: p.category,
                    price: p.price,
                    unitCost: p.unitCost,
                    marginPercent: p.marginPercent,
                    thcPercentage: p.thcPercentage,
                })),
                deal.bundlePrice,
                30
            );
            if (result.success && result.data) {
                setAiSuggestion(result.data);
            }
        } catch {
            // Silently fail - AI suggestion is enhancement only
        } finally {
            setAiSuggestionLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b shrink-0 bg-secondary/20">
                    <div className="flex items-start justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                {deal.name}
                                <Badge variant="secondary" className="ml-2 font-normal">
                                    {deal.type === 'mix_match' ? 'Mix & Match' : 'Bundle'}
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-base mt-2">
                                {deal.description}
                            </DialogDescription>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-primary">${deal.bundlePrice.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground line-through">
                                Value: ${(deal.originalTotal || (22 * requiredCount)).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Product Selection */}
                    <div className="w-full md:w-2/3 flex flex-col border-r">
                        <div className="p-4 border-b bg-muted/30 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Select {requiredCount} Items</h3>
                                <Badge variant="outline" className="gap-1 bg-background">
                                    <Sparkles className="h-3 w-3 text-purple-500" />
                                    {eligibleProducts.length} Available
                                </Badge>
                            </div>

                            {/* Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search products..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-9"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2"
                                    >
                                        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                    </button>
                                )}
                            </div>

                            {/* Filter Toggle */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                                className="w-full"
                            >
                                <Filter className="mr-2 h-4 w-4" />
                                {showFilters ? 'Hide Filters' : 'Show Filters'}
                            </Button>

                            {/* Filters Panel */}
                            {showFilters && (
                                <div className="space-y-3 p-3 bg-background rounded-lg border">
                                    {/* Category Filter */}
                                    <div>
                                        <label className="text-xs font-medium">Category</label>
                                        <Select
                                            value={filters.category?.[0] || 'all'}
                                            onValueChange={(value) =>
                                                setFilters({ ...filters, category: value === 'all' ? undefined : [value] })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All Categories" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Categories</SelectItem>
                                                {filterOptions.categories.map(cat => (
                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Brand Filter */}
                                    <div>
                                        <label className="text-xs font-medium">Brand</label>
                                        <Select
                                            value={filters.brand?.[0] || 'all'}
                                            onValueChange={(value) =>
                                                setFilters({ ...filters, brand: value === 'all' ? undefined : [value] })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All Brands" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Brands</SelectItem>
                                                {filterOptions.brands.map(brand => (
                                                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* In Stock Only */}
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={filters.inStockOnly}
                                            onChange={(e) => setFilters({ ...filters, inStockOnly: e.target.checked })}
                                            className="rounded"
                                        />
                                        In Stock Only
                                    </label>
                                </div>
                            )}
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            {loading ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h4 className="font-semibold text-lg">No Products Found</h4>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Try adjusting your filters or search query
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredProducts.map((product) => (
                                    <Card
                                        key={product.id}
                                        className="cursor-pointer hover:border-primary transition-all group relative overflow-hidden"
                                        onClick={() => handleSelectProduct(product)}
                                    >
                                        <div className="aspect-square bg-muted relative">
                                            {product.imageUrl ? (
                                                <Image
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="150px"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    {(() => {
                                                        const iconName = getCategoryIconName(product.category);
                                                        const IconComponent = CATEGORY_ICONS[iconName] || Leaf;
                                                        return <IconComponent className={cn('h-8 w-8', getCategoryIconColor(product.category))} />;
                                                    })()}
                                                </div>
                                            )}

                                            {/* Stock Badge */}
                                            {product.quantity === 0 ? (
                                                <div className="absolute top-2 left-2 bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                    Out of Stock
                                                </div>
                                            ) : product.quantity < 5 ? (
                                                <div className="absolute top-2 left-2 bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                    Low Stock
                                                </div>
                                            ) : null}

                                            {/* AI Recommendation Badge */}
                                            {product.recommendationScore && product.recommendationScore > 80 && (
                                                <div className="absolute top-2 right-2 bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm">
                                                    <Sparkles className="h-2 w-2" /> Top Pick
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-3 space-y-2">
                                            <div>
                                                <h4 className="font-medium text-sm line-clamp-1">{product.name}</h4>
                                                <p className="text-xs text-muted-foreground">{product.brand}</p>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-muted-foreground">{product.category}</span>
                                                <div className="text-right">
                                                    <div className="font-bold text-sm">${product.price.toFixed(2)}</div>
                                                    {product.unitCost && (
                                                        <div className="text-[10px] text-muted-foreground">
                                                            Cost: ${product.unitCost.toFixed(2)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {product.marginPercent && (
                                                <div className="text-[10px] text-muted-foreground">
                                                    Margin: {product.marginPercent.toFixed(1)}%
                                                </div>
                                            )}

                                            <Button size="sm" variant="secondary" className="w-full h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus className="h-3 w-3 mr-1" /> Add
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Right: Bundle State (Slots) */}
                    <div className="w-full md:w-1/3 bg-secondary/10 flex flex-col">
                        <div className="p-4 border-b">
                            <h3 className="font-semibold">Your Bundle</h3>
                            <p className="text-xs text-muted-foreground">
                                {slots.filter(s => s !== null).length} of {requiredCount} items selected
                            </p>
                        </div>

                        <div className="flex-1 p-4 space-y-4">
                            {slots.map((slot, idx) => (
                                <div
                                    key={idx}
                                    className={`
                                        h-24 border-2 border-dashed rounded-xl flex items-center justify-center relative overflow-hidden transition-all
                                        ${slot ? 'border-solid border-primary/20 bg-background' : 'border-muted-foreground/30 hover:border-primary/50'}
                                    `}
                                >
                                    {slot ? (
                                        <div className="flex items-center gap-3 p-3 w-full">
                                            <div className="h-16 w-16 bg-muted rounded-md shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">{slot.name}</div>
                                                <div className="text-xs text-muted-foreground">${slot.price.toFixed(2)}</div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleRemoveProduct(idx)}
                                            >
                                                <span className="sr-only">Remove</span>
                                                &times;
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center text-muted-foreground/50">
                                            <Plus className="h-8 w-8 mb-1" />
                                            <span className="text-xs font-medium uppercase tracking-wider">Add Item</span>
                                        </div>
                                    )}

                                    <div className="absolute top-2 left-2 text-[10px] font-bold text-muted-foreground/50">
                                        0{idx + 1}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pricing Metrics Summary */}
                        {selectedProducts.length > 0 && (
                            <div className="p-4 border-t bg-muted/30 space-y-2">
                                <h4 className="font-semibold text-sm">Bundle Pricing</h4>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Original Total:</span>
                                        <span className="font-medium">${originalTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Bundle Price:</span>
                                        <span className="font-bold text-primary">${deal.bundlePrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-green-600">
                                        <span>Customer Savings:</span>
                                        <span className="font-bold">${totalSavings.toFixed(2)} ({savingsPercent.toFixed(1)}%)</span>
                                    </div>
                                    {avgUnitCost > 0 && (
                                        <>
                                            <Separator className="my-2" />
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Avg Unit Cost:</span>
                                                <span>${avgUnitCost.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Total Margin:</span>
                                                <span className={marginPercent > 30 ? 'text-green-600 font-medium' : marginPercent < 15 ? 'text-red-600 font-medium' : ''}>
                                                    ${totalMargin.toFixed(2)} ({marginPercent.toFixed(1)}%)
                                                </span>
                                            </div>
                                            {marginPercent < 15 && (
                                                <div className="text-[10px] text-yellow-700 bg-yellow-50 p-2 rounded">
                                                    ⚠️ Low margin - consider increasing bundle price
                                                </div>
                                            )}
                                            {marginPercent > 40 && (
                                                <div className="text-[10px] text-blue-700 bg-blue-50 p-2 rounded">
                                                    💡 High margin - could offer better customer deal
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* AI Price Suggestion */}
                                    <Separator className="my-2" />
                                    {!aiSuggestion ? (
                                        <button
                                            onClick={handleGetAiPriceSuggestion}
                                            disabled={aiSuggestionLoading || selectedProducts.length === 0}
                                            className="w-full text-[10px] text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 p-2 rounded flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                                        >
                                            {aiSuggestionLoading ? (
                                                <><Loader2 className="h-3 w-3 animate-spin" /> Analyzing...</>
                                            ) : (
                                                <><Sparkles className="h-3 w-3" /> Get AI Price Suggestion</>
                                            )}
                                        </button>
                                    ) : (
                                        <div className="text-[10px] bg-purple-50 border border-purple-200 p-2 rounded space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-purple-800 flex items-center gap-1">
                                                    <Sparkles className="h-3 w-3" /> AI Suggestion
                                                </span>
                                                <button onClick={() => setAiSuggestion(null)} className="text-purple-400 hover:text-purple-600">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <div className="text-purple-900 font-bold text-sm">${aiSuggestion.suggestedPrice.toFixed(2)}</div>
                                            <div className="text-purple-700">{aiSuggestion.reasoning}</div>
                                            {aiSuggestion.competitiveNote && (
                                                <div className="text-purple-600 italic">{aiSuggestion.competitiveNote}</div>
                                            )}
                                            <div className="text-purple-600">Range: ${aiSuggestion.priceRange.min.toFixed(2)} – ${aiSuggestion.priceRange.max.toFixed(2)}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="p-4 border-t bg-background mt-auto">
                            {!isComplete && (
                                <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                    Add {slots.filter(s => s === null).length} more item(s) to unlock this deal.
                                </div>
                            )}

                            <Button
                                className="w-full h-12 text-lg font-bold"
                                disabled={!isComplete}
                            >
                                {isComplete ? (
                                    <>
                                        Add Bundle to Cart - ${deal.bundlePrice.toFixed(2)}
                                    </>
                                ) : (
                                    'Complete Bundle to Add'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
