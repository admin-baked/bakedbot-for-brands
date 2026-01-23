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
    createBundleFromSuggestion,
    type SuggestedBundle,
} from '@/app/actions/bundle-suggestions';
import { useToast } from '@/hooks/use-toast';
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
            const result = await createBundleFromSuggestion(orgId, suggestion);

            if (result.success) {
                toast({
                    title: "Bundle Created",
                    description: `"${suggestion.name}" has been added as a draft.`,
                });
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

    return (
        <div className="space-y-6">
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
        </div>
    );
}
