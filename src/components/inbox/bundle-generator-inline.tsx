'use client';

/**
 * Inline Bundle Generator
 *
 * AI-powered bundle creation tool matching the Carousel/Hero Builder pattern.
 * Includes auto-generation, smart presets, natural language input, margin protection, and manual builder.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Package,
    Sparkles,
    Wand2,
    Plus,
    X,
    Loader2,
    Tag,
    Percent,
    Check,
    Clock,
    Layers,
    Gift,
    AlertTriangle,
    ShieldCheck,
    TrendingUp,
    Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { ProductPicker } from '@/components/dashboard/carousels/product-picker';
import { createBundle } from '@/app/actions/bundles';
import {
    generateAIBundleSuggestions,
    getSmartPresets,
    parseNaturalLanguageRule,
    createBundleFromSuggestion,
    type SuggestedBundle,
} from '@/app/actions/bundle-suggestions';
import { getBundlePriceSuggestion } from '@/app/actions/dynamic-pricing';
import { useToast } from '@/hooks/use-toast';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BundleDeal, BundleType } from '@/types/bundles';
import { BundlePreview } from '@/components/dashboard/bundles/bundle-preview';

interface BundleGeneratorInlineProps {
    orgId: string;
    onComplete?: (bundleData: BundleDeal) => void;
    initialPrompt?: string;
    className?: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
    clock: <Clock className="h-4 w-4" />,
    package: <Package className="h-4 w-4" />,
    layers: <Layers className="h-4 w-4" />,
    percent: <Percent className="h-4 w-4" />,
    gift: <Gift className="h-4 w-4" />,
    'alert-triangle': <AlertTriangle className="h-4 w-4" />,
};

export function BundleGeneratorInline({
    orgId,
    onComplete,
    initialPrompt = '',
    className
}: BundleGeneratorInlineProps) {
    const { toast } = useToast();

    // UI State
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingPresets, setLoadingPresets] = useState(true);
    const [showManualBuilder, setShowManualBuilder] = useState(false);

    // Data State
    const [suggestions, setSuggestions] = useState<SuggestedBundle[]>([]);
    const [presets, setPresets] = useState<Array<{
        label: string;
        prompt: string;
        icon: string;
        available: boolean;
        reason?: string;
    }>>([]);
    const [rulePrompt, setRulePrompt] = useState(initialPrompt);
    const [creatingSuggestion, setCreatingSuggestion] = useState<string | null>(null);

    // Bundle-specific State
    const [minMargin, setMinMargin] = useState(15);

    // Manual builder state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [bundleType, setBundleType] = useState<BundleType>('mix_match');
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [fixedPrice, setFixedPrice] = useState(0);

    // Preview State
    const [lastCreatedBundle, setLastCreatedBundle] = useState<BundleDeal | null>(null);
    const [showCreatedPreview, setShowCreatedPreview] = useState(false);

    // Price Recommendation State
    const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
    const [priceRecommendations, setPriceRecommendations] = useState<Record<string, any>>({});
    const [isLoadingPrices, setIsLoadingPrices] = useState(false);

    // Load smart presets on mount
    useEffect(() => {
        async function loadPresets() {
            if (!orgId) return;
            setLoadingPresets(true);
            const result = await getSmartPresets(orgId);
            if (result.success && result.presets) {
                setPresets(result.presets);
            }
            setLoadingPresets(false);
        }
        loadPresets();
    }, [orgId]);

    const handlePresetClick = (prompt: string) => {
        setRulePrompt(prompt);
    };

    const handleGenerateAllSuggestions = async () => {
        if (!orgId) {
            toast({
                title: "Organization Required",
                description: "Could not determine your organization.",
                variant: "destructive",
            });
            return;
        }

        setIsGeneratingAll(true);
        setSuggestions([]);

        try {
            const result = await generateAIBundleSuggestions(orgId);

            if (result.success && result.suggestions && result.suggestions.length > 0) {
                setSuggestions(result.suggestions);
                toast({
                    title: "Suggestions Ready",
                    description: `Generated ${result.suggestions.length} bundle suggestions based on inventory analysis.`,
                });
            } else {
                toast({
                    title: "No Suggestions",
                    description: result.error || "Could not generate suggestions. Add more products first.",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "Error",
                description: "Failed to generate suggestions. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsGeneratingAll(false);
        }
    };

    const handleGenerateFromPrompt = async () => {
        if (!rulePrompt.trim()) {
            toast({
                title: "Enter a Description",
                description: "Please describe what bundle you'd like to create.",
                variant: "destructive",
            });
            return;
        }

        if (!orgId) {
            toast({
                title: "Organization Required",
                description: "Could not determine your organization.",
                variant: "destructive",
            });
            return;
        }

        setIsProcessing(true);
        setSuggestions([]);

        try {
            const result = await parseNaturalLanguageRule(orgId, rulePrompt, minMargin);

            if (result.success && result.suggestions && result.suggestions.length > 0) {
                setSuggestions(result.suggestions);

                // Fetch AI price recommendations for each suggestion
                setIsLoadingPrices(true);
                const recommendations: Record<string, any> = {};

                for (const suggestion of result.suggestions) {
                    const priceRec = await getBundlePriceSuggestion(
                        suggestion.products,
                        suggestion.products.reduce((sum, p) => sum + p.price, 0) * (1 - suggestion.savingsPercent / 100),
                        minMargin
                    );
                    if (priceRec.success) {
                        recommendations[suggestion.name] = priceRec;
                    }
                }

                setPriceRecommendations(recommendations);
                setIsLoadingPrices(false);

                toast({
                    title: "Bundles Generated",
                    description: `Found ${result.suggestions.length} bundle(s) matching your criteria.`,
                });
            } else {
                toast({
                    title: "No Matching Bundles",
                    description: result.error || "No products match your criteria. Try a different description.",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "Error",
                description: "Failed to process your request. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAcceptSuggestion = async (suggestion: SuggestedBundle) => {
        if (!orgId) return;

        setCreatingSuggestion(suggestion.name);

        try {
            // Check if user edited the price
            const customPrice = editingPrices[suggestion.name];

            // Prepare suggestion with custom price if provided
            const suggestionWithPrice = {
                ...suggestion,
                customPrice,
            };

            const result = await createBundleFromSuggestion(orgId, suggestionWithPrice as any);

            if (result.success && result.data) {
                toast({
                    title: "Bundle Created",
                    description: `"${suggestion.name}" has been added as a draft.`,
                });
                setLastCreatedBundle(result.data);
                setShowCreatedPreview(true);
                setSuggestions(prev => prev.filter(s => s.name !== suggestion.name));
            } else {
                toast({
                    title: "Failed to Create",
                    description: result.error || "Something went wrong.",
                    variant: "destructive",
                });
            }
        } finally {
            setCreatingSuggestion(null);
        }
    };

    const handleCreateManualBundle = async () => {
        if (!name.trim()) {
            toast({
                title: "Name Required",
                description: "Please enter a bundle name.",
                variant: "destructive"
            });
            return;
        }

        if (selectedProductIds.length === 0) {
            toast({
                title: "Products Required",
                description: "Please select at least one product.",
                variant: "destructive"
            });
            return;
        }

        if (!orgId) {
            toast({
                title: "Organization Required",
                description: "Could not determine your organization.",
                variant: "destructive"
            });
            return;
        }

        setIsProcessing(true);

        try {
            const savingsPercent = bundleType === 'percentage' ? discountPercent : 0;
            const bundlePrice = bundleType === 'fixed_price' ? fixedPrice : 0;

            const result = await createBundle({
                name,
                description,
                type: bundleType,
                status: 'draft',
                createdBy: 'dispensary',
                products: [],
                eligibleProductIds: selectedProductIds,
                savingsPercent,
                bundlePrice,
                originalTotal: 0,
                savingsAmount: 0,
                currentRedemptions: 0,
                featured: false,
                orgId,
            });

            if (result.success && result.data) {
                toast({
                    title: "Bundle Created!",
                    description: `${name} is now live on your menu.`,
                });

                onComplete?.(result.data);
            } else {
                throw new Error(result.error || 'Failed to create bundle');
            }
        } catch (error: any) {
            toast({
                title: "Creation Failed",
                description: error.message || "Failed to create bundle. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn('w-full my-2', className)}
        >
            <Card className="bg-card/50 backdrop-blur-sm border-white/10">
                <CardHeader className="border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                            <Package className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI Bundle Designer</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Create margin-protected promotional bundles with AI
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    {/* Auto-Generate All Section */}
                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="flex items-center justify-between py-4">
                            <div>
                                <h3 className="font-semibold text-sm">Auto-Generate Suggestions</h3>
                                <p className="text-xs text-muted-foreground">
                                    Let AI analyze inventory and margins for optimal bundles
                                </p>
                            </div>
                            <Button
                                size="sm"
                                onClick={handleGenerateAllSuggestions}
                                disabled={isGeneratingAll}
                                className="bg-gradient-to-r from-green-500 to-emerald-500"
                            >
                                {isGeneratingAll ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Generate All
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Margin Protection Banner */}
                    <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
                        <CardContent className="flex items-center gap-3 py-3">
                            <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                    Margin Protection Active
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400">
                                    All bundles maintain minimum {minMargin}% margin
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="margin-slider-inline" className="text-xs text-green-700 dark:text-green-300 whitespace-nowrap">
                                    Min: {minMargin}%
                                </Label>
                                <Slider
                                    id="margin-slider-inline"
                                    value={[minMargin]}
                                    onValueChange={([value]) => setMinMargin(value)}
                                    min={5}
                                    max={40}
                                    step={1}
                                    className="w-24"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Smart Presets */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                Smart Presets
                            </CardTitle>
                            <CardDescription>
                                Quick-start bundles based on your inventory
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingPresets ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : presets.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Add products to see smart bundle presets
                                </p>
                            ) : (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <TooltipProvider>
                                        {presets.map((preset, idx) => (
                                            <Tooltip key={idx}>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant={preset.available ? "outline" : "ghost"}
                                                        className={`justify-start h-auto py-3 px-4 ${!preset.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        onClick={() => preset.available && handlePresetClick(preset.prompt)}
                                                        disabled={!preset.available}
                                                    >
                                                        <span className="flex items-center gap-2 text-left">
                                                            {ICON_MAP[preset.icon] || <Layers className="h-4 w-4" />}
                                                            <span className="text-sm truncate">{preset.label}</span>
                                                        </span>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="max-w-xs">
                                                        {preset.available ? preset.prompt : preset.reason}
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        ))}
                                    </TooltipProvider>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Natural Language Input */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Describe Your Bundle Rule</CardTitle>
                            <CardDescription>
                                Use natural language to create custom bundles. AI will find matching products.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="Example: Create a bundle with products expiring in the next 30-45 days with a 20% discount"
                                value={rulePrompt}
                                onChange={(e) => setRulePrompt(e.target.value)}
                                className="min-h-[100px] resize-none bg-background/50 border-white/10"
                            />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Info className="h-3 w-3" />
                                    <span>AI will parse your rule and validate margins</span>
                                </div>
                                <Button
                                    onClick={handleGenerateFromPrompt}
                                    disabled={isProcessing || !rulePrompt.trim()}
                                    className="bg-gradient-to-r from-green-500 to-emerald-500"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="h-4 w-4 mr-2" />
                                            Generate Bundles
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Generated Suggestions */}
                    {suggestions.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-primary" />
                                    Bundle Suggestions
                                </CardTitle>
                                <CardDescription>
                                    Review and add these bundles to your menu
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {suggestions.map((suggestion, idx) => (
                                    <Card key={idx} className="p-4 bg-muted/30">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1">
                                                <h4 className="font-semibold">{suggestion.name}</h4>
                                                {suggestion.badgeText && (
                                                    <Badge variant="secondary" className="mt-1">
                                                        {suggestion.badgeText}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    {suggestion.savingsPercent}% OFF
                                                </Badge>
                                                {suggestion.marginImpact !== undefined && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Badge variant="outline" className="text-xs">
                                                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                                                    {suggestion.marginImpact}% margin
                                                                </Badge>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Estimated margin after discount</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            {suggestion.description}
                                        </p>
                                        <div className="text-xs text-muted-foreground mb-4">
                                            <strong>Products:</strong>{' '}
                                            {suggestion.products.map(p => p.name).join(', ')}
                                        </div>

                                        {/* AI Price Recommendation */}
                                        {priceRecommendations[suggestion.name] && (
                                            <Card className="mt-3 mb-4 border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20">
                                                <CardContent className="p-3">
                                                    <div className="flex items-start gap-2 mb-3">
                                                        <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                                        <div className="flex-1">
                                                            <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                                                                AI Recommended Price
                                                            </p>
                                                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mt-0.5">
                                                                ${priceRecommendations[suggestion.name].suggestedPrice?.toFixed(2) || 'N/A'}
                                                            </p>
                                                            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                                                                {priceRecommendations[suggestion.name].reasoning}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Price Slider */}
                                                    {priceRecommendations[suggestion.name].priceRange && (
                                                        <div className="space-y-2">
                                                            <Label className="flex items-center justify-between text-xs">
                                                                <span>Adjust Final Price</span>
                                                                <span className="font-semibold text-blue-900 dark:text-blue-100">
                                                                    ${(editingPrices[suggestion.name] ?? priceRecommendations[suggestion.name].suggestedPrice).toFixed(2)}
                                                                </span>
                                                            </Label>
                                                            <Slider
                                                                value={[editingPrices[suggestion.name] ?? priceRecommendations[suggestion.name].suggestedPrice]}
                                                                onValueChange={(v) => setEditingPrices({...editingPrices, [suggestion.name]: v[0]})}
                                                                min={priceRecommendations[suggestion.name].priceRange.min}
                                                                max={priceRecommendations[suggestion.name].priceRange.max}
                                                                step={0.50}
                                                                className="py-2"
                                                            />
                                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                                <span>Min: ${priceRecommendations[suggestion.name].priceRange.min.toFixed(2)}</span>
                                                                <span>Max: ${priceRecommendations[suggestion.name].priceRange.max.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        )}

                                        <div className="flex justify-end">
                                            <Button
                                                size="sm"
                                                onClick={() => handleAcceptSuggestion(suggestion)}
                                                disabled={creatingSuggestion === suggestion.name}
                                                className="bg-gradient-to-r from-green-500 to-emerald-500"
                                            >
                                                {creatingSuggestion === suggestion.name ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Adding...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check className="h-4 w-4 mr-2" />
                                                        Add to Menu
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Example Prompts Helper */}
                    <Card className="border-dashed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Example Rules</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="text-xs text-muted-foreground space-y-1">
                                <li>"Bundle products expiring in 30-45 days with 25% off"</li>
                                <li>"Create a BOGO deal for all edibles"</li>
                                <li>"Bundle high-stock items (50+ units) with 25% discount"</li>
                                <li>"Mix and match 3 flower products with 15% off"</li>
                                <li>"Create starter pack with one item from each category at 20% off"</li>
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Manual Builder (collapsed by default) */}
                    {showManualBuilder && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base">Manual Bundle Builder</CardTitle>
                                        <CardDescription>Customize every detail of your bundle</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setShowManualBuilder(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bundle-name" className="text-sm font-semibold">
                                        Bundle Name
                                    </Label>
                                    <Input
                                        id="bundle-name"
                                        placeholder="e.g., Weekend Warrior Pack"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="bg-background/50 border-white/10"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bundle-description" className="text-sm font-semibold">
                                        Description <span className="text-muted-foreground font-normal">(Optional)</span>
                                    </Label>
                                    <Input
                                        id="bundle-description"
                                        placeholder="e.g., Save big on your favorite products"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="bg-background/50 border-white/10"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bundle-type" className="text-sm font-semibold">
                                        Bundle Type
                                    </Label>
                                    <Select value={bundleType} onValueChange={(value) => setBundleType(value as BundleType)}>
                                        <SelectTrigger className="bg-background/50 border-white/10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mix_match">Mix & Match</SelectItem>
                                            <SelectItem value="bogo">Buy One Get One (BOGO)</SelectItem>
                                            <SelectItem value="percentage">Percentage Off</SelectItem>
                                            <SelectItem value="fixed_price">Fixed Price</SelectItem>
                                            <SelectItem value="tiered">Tiered Discount</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {bundleType === 'percentage' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="discount-percent" className="text-sm font-semibold flex items-center gap-2">
                                            <Percent className="h-4 w-4 text-green-400" />
                                            Discount Percentage
                                        </Label>
                                        <Input
                                            id="discount-percent"
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={discountPercent}
                                            onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
                                            className="bg-background/50 border-white/10 w-32"
                                        />
                                    </div>
                                )}

                                {bundleType === 'fixed_price' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="fixed-price" className="text-sm font-semibold flex items-center gap-2">
                                            <Tag className="h-4 w-4 text-green-400" />
                                            Bundle Price
                                        </Label>
                                        <Input
                                            id="fixed-price"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={fixedPrice}
                                            onChange={(e) => setFixedPrice(parseFloat(e.target.value) || 0)}
                                            className="bg-background/50 border-white/10 w-32"
                                        />
                                    </div>
                                )}

                                {orgId && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">
                                            Select Products
                                        </Label>
                                        <ProductPicker
                                            orgId={orgId}
                                            selectedProductIds={selectedProductIds}
                                            onSelectionChange={setSelectedProductIds}
                                        />
                                    </div>
                                )}

                                <div className="flex gap-2 pt-4 border-t border-white/5">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowManualBuilder(false)}
                                        disabled={isProcessing}
                                        className="border-white/10"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleCreateManualBundle}
                                        disabled={isProcessing || !name.trim() || selectedProductIds.length === 0}
                                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Package className="h-4 w-4 mr-2" />
                                                Create Bundle
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!showManualBuilder && (
                        <div className="flex justify-center">
                            <Button
                                variant="outline"
                                onClick={() => setShowManualBuilder(true)}
                                className="border-white/10"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Show Manual Builder
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Created Bundle Preview */}
            {showCreatedPreview && lastCreatedBundle && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <BundlePreview
                        bundle={lastCreatedBundle}
                        onEdit={() => {
                            // Hide preview when user wants to edit
                            setShowCreatedPreview(false);
                        }}
                        onCreateAnother={() => {
                            // Reset form and hide preview
                            setShowCreatedPreview(false);
                            setSuggestions([]);
                            setRulePrompt('');
                            setName('');
                            setDescription('');
                            setSelectedProductIds([]);
                        }}
                    />
                </motion.div>
            )}
        </motion.div>
    );
}
