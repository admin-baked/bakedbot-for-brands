'use client';

/**
 * Inline Hero Generator
 *
 * AI-powered hero banner creation tool matching the Carousel Builder pattern.
 * Includes auto-generation, smart presets, natural language input, and manual builder.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Sparkles,
    Wand2,
    Plus,
    X,
    Loader2,
    Image as ImageIcon,
    Palette,
    Info,
    Check,
    Star,
    Layers,
    Crown,
    Target,
    Sun,
    Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { createHero } from '@/app/actions/heroes';
import {
    generateAIHeroSuggestions,
    getHeroPresets,
    parseNaturalLanguageHero,
    createHeroFromSuggestion,
    type HeroSuggestion,
} from '@/app/actions/hero-suggestions';
import { useToast } from '@/hooks/use-toast';
import { HeroPreview } from '@/components/dashboard/heroes/hero-preview';
import type { Hero, HeroStyle, HeroPurchaseModel, HeroCtaAction } from '@/types/heroes';

const ICON_MAP: Record<string, React.ReactNode> = {
    star: <Star className="h-4 w-4" />,
    sparkles: <Sparkles className="h-4 w-4" />,
    layers: <Layers className="h-4 w-4" />,
    crown: <Crown className="h-4 w-4" />,
    target: <Target className="h-4 w-4" />,
    sun: <Sun className="h-4 w-4" />,
};

interface HeroGeneratorInlineProps {
    onComplete?: (heroData: Hero) => void;
    initialPrompt?: string;
    className?: string;
}

export function HeroGeneratorInline({
    onComplete,
    initialPrompt = '',
    className
}: HeroGeneratorInlineProps) {
    const { dispensaryId } = useDispensaryId();
    const { toast } = useToast();

    // Manual builder state
    const [brandName, setBrandName] = useState('');
    const [brandLogo, setBrandLogo] = useState('');
    const [tagline, setTagline] = useState('Premium Cannabis Products');
    const [description, setDescription] = useState('');
    const [heroImage, setHeroImage] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#16a34a');
    const [style, setStyle] = useState<HeroStyle>('default');
    const [purchaseModel, setPurchaseModel] = useState<HeroPurchaseModel>('local_pickup');
    const [primaryCtaLabel, setPrimaryCtaLabel] = useState('Find Near Me');
    const [primaryCtaAction, setPrimaryCtaAction] = useState<HeroCtaAction>('find_near_me');
    const [verified, setVerified] = useState(true);
    const [displayOrder, setDisplayOrder] = useState(0);

    // UI state
    const [isProcessing, setIsProcessing] = useState(false);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [rulePrompt, setRulePrompt] = useState(initialPrompt);
    const [showManualBuilder, setShowManualBuilder] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Suggestions state
    const [suggestions, setSuggestions] = useState<HeroSuggestion[]>([]);
    const [creatingSuggestion, setCreatingSuggestion] = useState<string | null>(null);
    const [presets, setPresets] = useState<Array<{
        label: string;
        prompt: string;
        icon: string;
        available: boolean;
        source: 'brand_guide' | 'ai';
        reason?: string;
    }>>([]);
    const [loadingPresets, setLoadingPresets] = useState(true);

    // Load smart presets on mount
    useEffect(() => {
        async function loadPresets() {
            if (!dispensaryId) return;
            setLoadingPresets(true);
            const result = await getHeroPresets(dispensaryId);
            if (result.success && result.presets) {
                setPresets(result.presets);
            }
            setLoadingPresets(false);
        }
        loadPresets();
    }, [dispensaryId]);

    const handlePresetClick = (prompt: string) => {
        setRulePrompt(prompt);
    };

    const handleGenerateFromPrompt = async () => {
        if (!rulePrompt.trim()) {
            toast({
                title: "Enter a Description",
                description: "Please describe what hero banner you'd like to create.",
                variant: "destructive",
            });
            return;
        }

        if (!dispensaryId) {
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
            const result = await parseNaturalLanguageHero(dispensaryId, rulePrompt);

            if (result.success && result.suggestion) {
                setSuggestions([result.suggestion]);
                toast({
                    title: "Hero Banner Generated",
                    description: "Review your AI-generated hero below.",
                });
            } else {
                toast({
                    title: "Generation Failed",
                    description: result.error || "Couldn't generate hero. Try a different description.",
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

    const handleGenerateAllSuggestions = async () => {
        if (!dispensaryId) {
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
            const result = await generateAIHeroSuggestions(dispensaryId);

            if (result.success && result.suggestions && result.suggestions.length > 0) {
                setSuggestions(result.suggestions);
                toast({
                    title: "Suggestions Ready",
                    description: `Generated ${result.suggestions.length} hero banner suggestions based on your brand guide.`,
                });
            } else {
                toast({
                    title: "No Suggestions",
                    description: result.error || "Could not generate suggestions. Set up your brand guide first.",
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

    const handleAcceptSuggestion = async (suggestion: HeroSuggestion) => {
        if (!dispensaryId) return;

        setCreatingSuggestion(suggestion.brandName);

        try {
            const result = await createHeroFromSuggestion(dispensaryId, suggestion);

            if (result.success && result.data) {
                toast({
                    title: "Hero Created",
                    description: `"${suggestion.tagline}" has been added to your heroes.`,
                });
                setSuggestions(prev => prev.filter(s => s.brandName !== suggestion.brandName));
                onComplete?.(result.data);
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

    const getPriorityBadge = (priority: HeroSuggestion['priority']) => {
        switch (priority) {
            case 'high':
                return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">High Impact</Badge>;
            case 'medium':
                return <Badge variant="secondary">Medium</Badge>;
            case 'low':
                return <Badge variant="outline">Low</Badge>;
        }
    };

    const getSourceBadge = (source: HeroSuggestion['source']) => {
        switch (source) {
            case 'brand_guide':
                return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><Sparkles className="h-3 w-3 mr-1" />Brand Guide</Badge>;
            case 'ai':
                return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"><Wand2 className="h-3 w-3 mr-1" />AI Generated</Badge>;
        }
    };

    const handleCreateHero = async () => {
        if (!brandName.trim()) {
            toast({
                title: "Brand Name Required",
                description: "Please enter a brand name.",
                variant: "destructive"
            });
            return;
        }

        if (!dispensaryId) {
            toast({
                title: "Organization Required",
                description: "Could not determine your organization.",
                variant: "destructive"
            });
            return;
        }

        setIsProcessing(true);

        try {
            const result = await createHero({
                orgId: dispensaryId,
                brandName,
                brandLogo: brandLogo || undefined,
                tagline,
                description: description || undefined,
                heroImage: heroImage || undefined,
                primaryColor,
                style,
                purchaseModel,
                verified,
                displayOrder,
                primaryCta: {
                    label: primaryCtaLabel,
                    action: primaryCtaAction,
                },
                active: false, // Created as draft
            });

            if (result.success && result.data) {
                toast({
                    title: "Hero Banner Created!",
                    description: `${brandName} hero is ready. You can activate it from the Heroes dashboard.`,
                });

                onComplete?.(result.data);
            } else {
                throw new Error(result.error || 'Failed to create hero');
            }
        } catch (error: any) {
            logger.error('Error creating hero:', error);
            toast({
                title: "Creation Failed",
                description: error.message || "Failed to create hero. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Auto-Generate Section */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center justify-between py-4">
                    <div>
                        <h3 className="font-semibold">Auto-Generate Hero Banners</h3>
                        <p className="text-sm text-muted-foreground">
                            Let AI analyze your brand guide to suggest hero banner variations
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

            {/* Smart Presets */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Smart Presets
                    </CardTitle>
                    <CardDescription>
                        Quick-start hero banners based on your brand guide and business model
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingPresets ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : presets.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Set up your brand guide to see smart hero presets
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
                                                    } ${preset.source === 'brand_guide' ? 'border-blue-200 dark:border-blue-800' : ''}`}
                                                onClick={() => preset.available && handlePresetClick(preset.prompt)}
                                                disabled={!preset.available}
                                            >
                                                <span className="flex items-center gap-2 text-left">
                                                    {ICON_MAP[preset.icon] || <Layers className="h-4 w-4" />}
                                                    <span className="flex-1">
                                                        <span className="text-sm truncate block">{preset.label}</span>
                                                        {preset.source === 'brand_guide' && (
                                                            <span className="text-xs text-blue-600 dark:text-blue-400">Brand Guide</span>
                                                        )}
                                                    </span>
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
                    <CardTitle className="text-base">Describe Your Hero Banner</CardTitle>
                    <CardDescription>
                        Use natural language to create custom hero banners. AI will design based on your description.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="Example: Create a bold hero for my premium flower brand with green colors and local pickup"
                        value={rulePrompt}
                        onChange={(e) => setRulePrompt(e.target.value)}
                        className="min-h-[100px] resize-none"
                    />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Info className="h-3 w-3" />
                            <span>AI will design a hero banner based on your description</span>
                        </div>
                        <Button
                            onClick={handleGenerateFromPrompt}
                            disabled={isProcessing || !rulePrompt.trim()}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="h-4 w-4 mr-2" />
                                    Create Hero Banner
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
                            <Eye className="h-4 w-4 text-primary" />
                            Hero Banner Suggestions
                        </CardTitle>
                        <CardDescription>
                            Review and add these heroes to your menu
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {suggestions.map((suggestion, idx) => (
                            <Card key={idx} className="p-4 bg-muted/30">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <h4 className="font-semibold">{suggestion.brandName}</h4>
                                        <p className="text-sm text-muted-foreground">{suggestion.tagline}</p>
                                    </div>
                                    <div className="flex gap-2 items-center flex-shrink-0 ml-4">
                                        {getPriorityBadge(suggestion.priority)}
                                        {getSourceBadge(suggestion.source)}
                                    </div>
                                </div>

                                <div className="text-xs text-muted-foreground mb-3 p-2 bg-background rounded border">
                                    <strong>Rationale:</strong> {suggestion.rationale}
                                </div>

                                <div className="text-sm mb-4 space-y-1">
                                    <div><strong>Description:</strong> <span className="text-muted-foreground">{suggestion.description}</span></div>
                                    <div><strong>Style:</strong> <span className="text-muted-foreground capitalize">{suggestion.style}</span></div>
                                    <div><strong>Purchase Model:</strong> <span className="text-muted-foreground capitalize">{suggestion.purchaseModel.replace('_', ' ')}</span></div>
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        size="sm"
                                        onClick={() => handleAcceptSuggestion(suggestion)}
                                        disabled={creatingSuggestion === suggestion.brandName}
                                    >
                                        {creatingSuggestion === suggestion.brandName ? (
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
                    <CardTitle className="text-sm text-muted-foreground">Example Prompts</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-xs text-muted-foreground space-y-1">
                        <li>"Create a professional hero for medical dispensary"</li>
                        <li>"Make a bold hero for premium flower brand"</li>
                        <li>"Design a minimal hero with green colors for local pickup"</li>
                        <li>"Create a luxury hero for high-end cannabis products"</li>
                    </ul>
                </CardContent>
            </Card>

            {/* Manual Builder (collapsed by default, can be shown on demand) */}
            {showManualBuilder && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Manual Hero Builder</CardTitle>
                                <CardDescription>Customize every detail of your hero banner</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setShowManualBuilder(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">(
                        {/* Live Preview */}
                        {showPreview && (
                            <HeroPreview hero={{
                                brandName,
                                brandLogo: brandLogo || undefined,
                                tagline,
                                description: description || undefined,
                                heroImage: heroImage || undefined,
                                primaryColor,
                                style,
                                purchaseModel,
                                verified,
                            }} />
                        )}

                        {/* Manual Builder Fields */}
                        <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="hero-brandName" className="text-sm font-semibold">
                                        Brand Name *
                                    </Label>
                                    <Input
                                        id="hero-brandName"
                                        placeholder="e.g., Premium Flower Co"
                                        value={brandName}
                                        onChange={(e) => setBrandName(e.target.value)}
                                        className="bg-background/50 border-white/10"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="hero-tagline" className="text-sm font-semibold">
                                        Tagline *
                                    </Label>
                                    <Input
                                        id="hero-tagline"
                                        placeholder="e.g., Premium Cannabis Products"
                                        value={tagline}
                                        onChange={(e) => setTagline(e.target.value)}
                                        className="bg-background/50 border-white/10"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="hero-description" className="text-sm font-semibold">
                                        Description <span className="text-muted-foreground font-normal">(Optional)</span>
                                    </Label>
                                    <Textarea
                                        id="hero-description"
                                        placeholder="A brief description..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="bg-background/50 border-white/10"
                                        rows={2}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="hero-primaryColor" className="text-sm font-semibold flex items-center gap-2">
                                            <Palette className="h-4 w-4" />
                                            Primary Color
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="hero-primaryColor"
                                                type="color"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                className="w-16 h-10 cursor-pointer"
                                            />
                                            <Input
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                className="flex-1 bg-background/50 border-white/10"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="hero-style" className="text-sm font-semibold">
                                            Style
                                        </Label>
                                        <Select value={style} onValueChange={(v) => setStyle(v as HeroStyle)}>
                                            <SelectTrigger id="hero-style" className="bg-background/50 border-white/10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="default">Default</SelectItem>
                                                <SelectItem value="minimal">Minimal</SelectItem>
                                                <SelectItem value="bold">Bold</SelectItem>
                                                <SelectItem value="professional">Professional</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="hero-purchaseModel" className="text-sm font-semibold">
                                        Purchase Model
                                    </Label>
                                    <Select value={purchaseModel} onValueChange={(v) => setPurchaseModel(v as HeroPurchaseModel)}>
                                        <SelectTrigger id="hero-purchaseModel" className="bg-background/50 border-white/10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="local_pickup">Local Pickup</SelectItem>
                                            <SelectItem value="online_only">Online Only</SelectItem>
                                            <SelectItem value="hybrid">Hybrid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="hero-verified"
                                        checked={verified}
                                        onCheckedChange={setVerified}
                                    />
                                    <Label htmlFor="hero-verified">Show Verified Badge</Label>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowPreview(!showPreview)}
                                    className="w-full"
                                >
                                    {showPreview ? 'Hide' : 'Show'} Preview
                                </Button>

                                <Button
                                    onClick={handleCreateHero}
                                    disabled={isProcessing || !brandName.trim()}
                                    className="w-full"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <ImageIcon className="h-4 w-4 mr-2" />
                                            Create Hero Banner
                                        </>
                                    )}
                                </Button>
                            </div>
                    </CardContent>
                </Card>
            )}

            {!showManualBuilder && (
                <div className="flex justify-center">
                    <Button variant="outline" onClick={() => setShowManualBuilder(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Show Manual Builder
                    </Button>
                </div>
            )}
        </div>
    );
}
