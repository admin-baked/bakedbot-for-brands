'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Sparkles,
    Loader2,
    Star,
    Layers,
    TrendingUp,
    Target,
    AlertTriangle,
    Moon,
    Sun,
    Check,
    Crown,
    Info,
    Wand2,
    Eye,
} from 'lucide-react';
import {
    parseNaturalLanguageCarousel,
    getCarouselPresets,
    generateAICarouselSuggestions,
    createCarouselFromSuggestion,
    type SuggestedCarousel,
} from '@/app/actions/carousel-suggestions';
import { useToast } from '@/hooks/use-toast';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface CarouselRuleBuilderProps {
    orgId: string;
    onCarouselCreated?: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
    star: <Star className="h-4 w-4" />,
    sparkles: <Sparkles className="h-4 w-4" />,
    layers: <Layers className="h-4 w-4" />,
    crown: <Crown className="h-4 w-4" />,
    target: <Target className="h-4 w-4" />,
    'trending-up': <TrendingUp className="h-4 w-4" />,
    'alert-triangle': <AlertTriangle className="h-4 w-4" />,
    moon: <Moon className="h-4 w-4" />,
    sun: <Sun className="h-4 w-4" />,
};

export function CarouselRuleBuilder({ orgId, onCarouselCreated }: CarouselRuleBuilderProps) {
    const { toast } = useToast();
    const [rulePrompt, setRulePrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [presets, setPresets] = useState<Array<{
        label: string;
        prompt: string;
        icon: string;
        available: boolean;
        source: 'inventory' | 'competitive';
        reason?: string;
    }>>([]);
    const [loadingPresets, setLoadingPresets] = useState(true);
    const [suggestions, setSuggestions] = useState<SuggestedCarousel[]>([]);
    const [creatingSuggestion, setCreatingSuggestion] = useState<string | null>(null);

    // Load smart presets on mount
    useEffect(() => {
        async function loadPresets() {
            setLoadingPresets(true);
            const result = await getCarouselPresets(orgId);
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

    const handleGenerateFromPrompt = async () => {
        if (!rulePrompt.trim()) {
            toast({
                title: "Enter a Description",
                description: "Please describe what carousel you'd like to create.",
                variant: "destructive",
            });
            return;
        }

        setIsProcessing(true);
        setSuggestions([]);

        try {
            const result = await parseNaturalLanguageCarousel(orgId, rulePrompt);

            if (result.success && result.suggestion) {
                setSuggestions([result.suggestion]);
                toast({
                    title: "Carousel Generated",
                    description: `Found ${result.suggestion.products.length} products matching your criteria.`,
                });
            } else {
                toast({
                    title: "No Matching Products",
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

    const handleGenerateAllSuggestions = async () => {
        setIsGeneratingAll(true);
        setSuggestions([]);

        try {
            const result = await generateAICarouselSuggestions(orgId);

            if (result.success && result.suggestions && result.suggestions.length > 0) {
                setSuggestions(result.suggestions);
                toast({
                    title: "Suggestions Ready",
                    description: `Generated ${result.suggestions.length} carousel suggestions based on your inventory and market data.`,
                });
            } else {
                toast({
                    title: "No Suggestions",
                    description: result.error || "Could not generate suggestions. Add more products to your catalog.",
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

    const handleAcceptSuggestion = async (suggestion: SuggestedCarousel) => {
        setCreatingSuggestion(suggestion.title);

        try {
            const result = await createCarouselFromSuggestion(orgId, suggestion);

            if (result.success) {
                toast({
                    title: "Carousel Created",
                    description: `"${suggestion.title}" has been added to your menu.`,
                });
                setSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
                onCarouselCreated?.();
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

    const getPriorityBadge = (priority: SuggestedCarousel['priority']) => {
        switch (priority) {
            case 'high':
                return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">High Impact</Badge>;
            case 'medium':
                return <Badge variant="secondary">Medium</Badge>;
            case 'low':
                return <Badge variant="outline">Low</Badge>;
        }
    };

    const getSourceBadge = (source: SuggestedCarousel['source']) => {
        switch (source) {
            case 'competitive':
                return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"><Target className="h-3 w-3 mr-1" />Ezal Intel</Badge>;
            case 'ai':
                return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><Wand2 className="h-3 w-3 mr-1" />AI Generated</Badge>;
            default:
                return <Badge variant="outline">Inventory</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Quick Generate Button */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center justify-between py-4">
                    <div>
                        <h3 className="font-semibold">Auto-Generate Carousels</h3>
                        <p className="text-sm text-muted-foreground">
                            Let AI analyze your inventory and competitive data to suggest optimal carousels
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
                        Quick-start carousels based on your inventory and competitive intelligence
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingPresets ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : presets.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Add products to see smart carousel presets
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
                                                    } ${preset.source === 'competitive' ? 'border-purple-200 dark:border-purple-800' : ''}`}
                                                onClick={() => preset.available && handlePresetClick(preset.prompt)}
                                                disabled={!preset.available}
                                            >
                                                <span className="flex items-center gap-2 text-left">
                                                    {ICON_MAP[preset.icon] || <Layers className="h-4 w-4" />}
                                                    <span className="flex-1">
                                                        <span className="text-sm truncate block">{preset.label}</span>
                                                        {preset.source === 'competitive' && (
                                                            <span className="text-xs text-purple-600 dark:text-purple-400">Ezal Intel</span>
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
                    <CardTitle className="text-base">Describe Your Carousel</CardTitle>
                    <CardDescription>
                        Use natural language to create custom carousels. AI will find matching products.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="Example: Create a carousel of high-THC indica strains for relaxation"
                        value={rulePrompt}
                        onChange={(e) => setRulePrompt(e.target.value)}
                        className="min-h-[100px] resize-none"
                    />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Info className="h-3 w-3" />
                            <span>AI will parse your request and select matching products</span>
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
                                    Create Carousel
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
                            Carousel Suggestions
                        </CardTitle>
                        <CardDescription>
                            Review and add these carousels to your menu
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {suggestions.map((suggestion, idx) => (
                            <Card key={idx} className="p-4 bg-muted/30">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <h4 className="font-semibold">{suggestion.title}</h4>
                                        <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                                    </div>
                                    <div className="flex gap-2 items-center flex-shrink-0 ml-4">
                                        {getPriorityBadge(suggestion.priority)}
                                        {getSourceBadge(suggestion.source)}
                                    </div>
                                </div>

                                <div className="text-xs text-muted-foreground mb-3 p-2 bg-background rounded border">
                                    <strong>Rationale:</strong> {suggestion.rationale}
                                </div>

                                <div className="text-sm mb-4">
                                    <strong>{suggestion.products.length} Products:</strong>{' '}
                                    <span className="text-muted-foreground">
                                        {suggestion.products.slice(0, 5).map(p => p.name).join(', ')}
                                        {suggestion.products.length > 5 && ` +${suggestion.products.length - 5} more`}
                                    </span>
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        size="sm"
                                        onClick={() => handleAcceptSuggestion(suggestion)}
                                        disabled={creatingSuggestion === suggestion.title}
                                    >
                                        {creatingSuggestion === suggestion.title ? (
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
                        <li>"Show our best-selling flower strains"</li>
                        <li>"Create a carousel of products under $30"</li>
                        <li>"Feature high-THC strains for experienced users"</li>
                        <li>"Highlight edibles for first-time customers"</li>
                        <li>"Show sativa strains with energizing effects"</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
