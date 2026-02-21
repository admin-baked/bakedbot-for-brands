'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
    Sparkles,
    Loader2,
    Clock,
    Package,
    Layers,
    Percent,
    Gift,
    AlertTriangle,
    Check,
    ShieldCheck,
    TrendingUp,
    Info,
} from 'lucide-react';
import {
    parseNaturalLanguageRule,
    getSmartPresets,
    generateAIBundleSuggestions,
    createBundleFromSuggestion,
    type SuggestedBundle,
} from '@/app/actions/bundle-suggestions';
import { getBundlePriceSuggestion } from '@/app/actions/dynamic-pricing';
import { useToast } from '@/hooks/use-toast';
import { BundlePreview } from './bundle-preview';
import type { BundleDeal } from '@/types/bundles';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface BundleRuleBuilderProps {
    orgId: string;
    onBundleCreated?: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
    clock: <Clock className="h-4 w-4" />,
    package: <Package className="h-4 w-4" />,
    layers: <Layers className="h-4 w-4" />,
    percent: <Percent className="h-4 w-4" />,
    gift: <Gift className="h-4 w-4" />,
    'alert-triangle': <AlertTriangle className="h-4 w-4" />,
};

export function BundleRuleBuilder({ orgId, onBundleCreated }: BundleRuleBuilderProps) {
    const { toast } = useToast();
    const [rulePrompt, setRulePrompt] = useState('');
    const [minMargin, setMinMargin] = useState(15);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [presets, setPresets] = useState<Array<{
        label: string;
        prompt: string;
        icon: string;
        available: boolean;
        reason?: string;
    }>>([]);
    const [loadingPresets, setLoadingPresets] = useState(true);
    const [suggestions, setSuggestions] = useState<SuggestedBundle[]>([]);
    const [creatingSuggestion, setCreatingSuggestion] = useState<string | null>(null);
    const [lastCreatedBundle, setLastCreatedBundle] = useState<BundleDeal | null>(null);
    const [showCreatedPreview, setShowCreatedPreview] = useState(false);
    const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
    const [priceRecommendations, setPriceRecommendations] = useState<Record<string, any>>({});
    const [isLoadingPrices, setIsLoadingPrices] = useState(false);

    // Manual bundle builder state
    const [manualName, setManualName] = useState('');
    const [manualDescription, setManualDescription] = useState('');
    const [manualProductIds, setManualProductIds] = useState<string[]>([]);
    const [manualPrice, setManualPrice] = useState<number | null>(null);
    const [manualPriceRec, setManualPriceRec] = useState<any>(null);
    const [isGettingPriceRec, setIsGettingPriceRec] = useState(false);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [showManualBuilder, setShowManualBuilder] = useState(false);

    // Load smart presets on mount
    useEffect(() => {
        async function loadPresets() {
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

    const handleGenerateBundles = async () => {
        if (!rulePrompt.trim()) {
            toast({
                title: "Enter a Rule",
                description: "Please describe how you'd like to create bundles.",
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
                    if (priceRec.success && priceRec.data) {
                        recommendations[suggestion.name] = priceRec.data;
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
                    description: result.error || "No products match your criteria. Try adjusting your rule.",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "Error",
                description: "Failed to process your rule. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAcceptSuggestion = async (suggestion: SuggestedBundle) => {
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
                onBundleCreated?.();
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

    const handleGenerateAllSuggestions = async () => {
        if (!orgId) return;

        setIsGeneratingAll(true);
        setSuggestions([]);

        try {
            const result = await generateAIBundleSuggestions(orgId);

            if (result.success && result.suggestions && result.suggestions.length > 0) {
                setSuggestions(result.suggestions);
                toast({
                    title: "Suggestions Ready",
                    description: `Generated ${result.suggestions.length} bundle suggestions based on inventory analysis and margins.`,
                });
            } else {
                toast({
                    title: "No Suggestions",
                    description: result.error || "Could not generate suggestions. Add more products to your catalog first.",
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

    const handleGetManualPriceRecommendation = async () => {
        if (manualProductIds.length < 2) {
            toast({
                title: "Select Products",
                description: "Please select at least 2 products.",
                variant: "destructive",
            });
            return;
        }

        setIsGettingPriceRec(true);
        try {
            // Get original total price from selected products
            const selectedProdsData = availableProducts.filter(p => manualProductIds.includes(p.id));
            const originalTotal = selectedProdsData.reduce((sum, p) => sum + (p.price || 0), 0);

            const priceRec = await getBundlePriceSuggestion(selectedProdsData, originalTotal, minMargin);

            if (priceRec.success && priceRec.data) {
                setManualPriceRec(priceRec.data);
                setManualPrice(priceRec.data.suggestedPrice);
                toast({
                    title: "Price Recommendation",
                    description: "AI has suggested an optimal bundle price.",
                });
            } else {
                toast({
                    title: "Price Recommendation Failed",
                    description: "Could not generate price recommendation. Set price manually.",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "Error",
                description: "Failed to get price recommendation.",
                variant: "destructive",
            });
        } finally {
            setIsGettingPriceRec(false);
        }
    };

    const handleCreateManualBundle = async () => {
        if (!manualName.trim() || !manualDescription.trim() || manualProductIds.length < 2 || manualPrice === null) {
            toast({
                title: "Incomplete Bundle",
                description: "Please fill in all fields and select at least 2 products.",
                variant: "destructive",
            });
            return;
        }

        setCreatingSuggestion('manual');
        try {
            const result = await createBundleFromSuggestion(orgId, {
                name: manualName,
                description: manualDescription,
                products: availableProducts.filter(p => manualProductIds.includes(p.id)),
                savingsPercent: 0,
                badgeText: 'CUSTOM',
                marginImpact: 0,
                customPrice: manualPrice,
            } as any);

            if (result.success && result.data) {
                toast({
                    title: "Bundle Created",
                    description: `"${manualName}" has been added as a draft.`,
                });
                setLastCreatedBundle(result.data);
                setShowCreatedPreview(true);
                setShowManualBuilder(false);

                // Reset form
                setManualName('');
                setManualDescription('');
                setManualProductIds([]);
                setManualPrice(null);
                setManualPriceRec(null);

                onBundleCreated?.();
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

    return (
        <div className="space-y-6">
            {/* Auto-Generate All Bundles Section */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center justify-between py-4">
                    <div>
                        <h3 className="font-semibold">Auto-Generate Bundle Suggestions</h3>
                        <p className="text-sm text-muted-foreground">
                            Let AI analyze your inventory and margins to suggest optimal bundles
                        </p>
                    </div>
                    <Button onClick={handleGenerateAllSuggestions} disabled={isGeneratingAll}>
                        {isGeneratingAll ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate All Suggestions
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
                            All bundles maintain minimum {minMargin}% margin. Your 15% improvement goal is protected.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="margin-slider" className="text-xs text-green-700 dark:text-green-300 whitespace-nowrap">
                            Min: {minMargin}%
                        </Label>
                        <Slider
                            id="margin-slider"
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
                        Quick-start bundles based on your actual inventory data
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
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            <TooltipProvider>
                                {presets.map((preset, idx) => (
                                    <Tooltip key={idx}>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant={preset.available ? "outline" : "ghost"}
                                                className={`justify-start h-auto py-3 px-4 ${!preset.available ? 'opacity-50 cursor-not-allowed' : ''
                                                    }`}
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
                        Use natural language to create custom bundle rules. Our AI will find matching products and ensure margins are protected.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="Example: Create a bundle with products expiring in the next 30-45 days with a 20% discount"
                        value={rulePrompt}
                        onChange={(e) => setRulePrompt(e.target.value)}
                        className="min-h-[100px] resize-none"
                    />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Info className="h-3 w-3" />
                            <span>AI will parse your rule and validate margins</span>
                        </div>
                        <Button
                            onClick={handleGenerateBundles}
                            disabled={isProcessing || !rulePrompt.trim()}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2" />
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
                            Generated Bundle Suggestions
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

                                <div className="flex justify-between items-center">
                                    <div className="text-sm">
                                        <span className="text-muted-foreground">Total Value: </span>
                                        <span className="font-medium">
                                            ${suggestion.products.reduce((sum, p) => sum + p.price, 0).toFixed(2)}
                                        </span>
                                        <span className="text-muted-foreground"> → </span>
                                        <span className="font-semibold text-green-600 dark:text-green-400">
                                            ${(suggestion.products.reduce((sum, p) => sum + p.price, 0) * (1 - suggestion.savingsPercent / 100)).toFixed(2)}
                                        </span>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleAcceptSuggestion(suggestion)}
                                        disabled={creatingSuggestion === suggestion.name}
                                    >
                                        {creatingSuggestion === suggestion.name ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Adding...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4 mr-2" />
                                                Add as Draft
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Manual Bundle Builder */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">Manual Builder</CardTitle>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowManualBuilder(!showManualBuilder)}
                        >
                            {showManualBuilder ? 'Hide' : 'Show'}
                        </Button>
                    </div>
                    <CardDescription>
                        Quickly create custom bundles with AI price recommendations
                    </CardDescription>
                </CardHeader>

                {showManualBuilder && (
                    <CardContent className="space-y-4">
                        {/* Bundle Name */}
                        <div className="space-y-2">
                            <Label htmlFor="manual-name">Bundle Name</Label>
                            <input
                                id="manual-name"
                                placeholder="e.g., Sunset Collection, Party Pack"
                                value={manualName}
                                onChange={(e) => setManualName(e.target.value)}
                                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                            />
                        </div>

                        {/* Bundle Description */}
                        <div className="space-y-2">
                            <Label htmlFor="manual-desc">Description</Label>
                            <textarea
                                id="manual-desc"
                                placeholder="Describe the bundle for customers..."
                                value={manualDescription}
                                onChange={(e) => setManualDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm resize-none"
                                rows={2}
                            />
                        </div>

                        {/* Product Selection Note */}
                        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                            <p>💡 Tip: Select products from your catalog below, then click "Get Price Recommendation"</p>
                        </div>

                        {/* AI Price Recommendation Button */}
                        {manualProductIds.length >= 2 && (
                            <Button
                                variant="outline"
                                onClick={handleGetManualPriceRecommendation}
                                disabled={isGettingPriceRec}
                                className="w-full"
                            >
                                {isGettingPriceRec ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Getting Recommendation...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Get AI Price Recommendation
                                    </>
                                )}
                            </Button>
                        )}

                        {/* Price Recommendation Card */}
                        {manualPriceRec && (
                            <Card className="border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20">
                                <CardContent className="p-3">
                                    <div className="flex items-start gap-2 mb-3">
                                        <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                                                AI Recommended Price
                                            </p>
                                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mt-0.5">
                                                ${manualPriceRec.suggestedPrice?.toFixed(2) || 'N/A'}
                                            </p>
                                            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                                                {manualPriceRec.reasoning}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Price Slider */}
                                    {manualPriceRec.priceRange && (
                                        <div className="space-y-2">
                                            <Label className="flex items-center justify-between text-xs">
                                                <span>Adjust Final Price</span>
                                                <span className="font-semibold text-blue-900 dark:text-blue-100">
                                                    ${(manualPrice || manualPriceRec.suggestedPrice).toFixed(2)}
                                                </span>
                                            </Label>
                                            <Slider
                                                value={[manualPrice || manualPriceRec.suggestedPrice]}
                                                onValueChange={(v) => setManualPrice(v[0])}
                                                min={manualPriceRec.priceRange.min}
                                                max={manualPriceRec.priceRange.max}
                                                step={0.50}
                                                className="py-2"
                                            />
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Min: ${manualPriceRec.priceRange.min.toFixed(2)}</span>
                                                <span>Max: ${manualPriceRec.priceRange.max.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Manual Price Input (if no recommendation) */}
                        {!manualPriceRec && (
                            <div className="space-y-2">
                                <Label htmlFor="manual-price">Bundle Price</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <input
                                        id="manual-price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={manualPrice !== null ? manualPrice : ''}
                                        onChange={(e) => setManualPrice(e.target.value ? parseFloat(e.target.value) : null)}
                                        className="w-full pl-7 px-3 py-2 border border-input rounded-md bg-background text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Create Button */}
                        {manualProductIds.length >= 2 && manualName && manualDescription && manualPrice !== null && (
                            <Button
                                onClick={handleCreateManualBundle}
                                disabled={creatingSuggestion === 'manual'}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                            >
                                {creatingSuggestion === 'manual' ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4 mr-2" />
                                        Create Bundle
                                    </>
                                )}
                            </Button>
                        )}

                        {/* Instructions */}
                        {manualProductIds.length < 2 && (
                            <div className="text-xs text-muted-foreground bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded border border-amber-200/50 dark:border-amber-900/30">
                                ℹ️ You need to select at least 2 products. Products can be selected from your Smart Presets above.
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* Example Rules Helper */}
            <Card className="border-dashed">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Example Rules</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-xs text-muted-foreground space-y-1">
                        <li>"Bundle products expiring in 30-45 days with 25% off"</li>
                        <li>"Create a BOGO deal for all edibles"</li>
                        <li>"Bundle high-THC products (over 25%) with 15% discount"</li>
                        <li>"Mix and match any 3 flower products for 20% off"</li>
                        <li>"Clear overstock items (50+ units) with maximum safe discount"</li>
                    </ul>
                </CardContent>
            </Card>

            {/* Created Bundle Preview */}
            {showCreatedPreview && lastCreatedBundle && (
                <BundlePreview
                    bundle={lastCreatedBundle}
                    onEdit={() => {
                        // Open editor with bundle pre-loaded
                        // For now, just hide preview and user can manually find bundle
                        setShowCreatedPreview(false);
                    }}
                    onCreateAnother={() => {
                        setShowCreatedPreview(false);
                        setSuggestions([]);
                        setRulePrompt('');
                    }}
                />
            )}
        </div>
    );
}
