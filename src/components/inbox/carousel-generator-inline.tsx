'use client';

/**
 * Inline Carousel Generator
 *
 * AI-powered carousel creation tool that appears inline in the chat conversation.
 * Includes live preview and Brand Guide integration for colors and voice.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Images, Sparkles, Wand2, Plus, X, Loader2, Eye, EyeOff, BookOpenCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { ProductPicker } from '@/components/dashboard/carousels/product-picker';
import { CarouselPreview } from '@/components/dashboard/carousels/carousel-preview';
import { createCarousel } from '@/app/actions/carousels';
import { getBrandGuide } from '@/server/actions/brand-guide';
import { useToast } from '@/hooks/use-toast';
import type { Carousel } from '@/types/carousels';
import type { BrandGuide } from '@/types/brand-guide';

interface CarouselGeneratorInlineProps {
    onComplete?: (carouselData: Carousel) => void;
    initialPrompt?: string;
    className?: string;
}

export function CarouselGeneratorInline({
    onComplete,
    initialPrompt = '',
    className
}: CarouselGeneratorInlineProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [displayOrder, setDisplayOrder] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState(initialPrompt);
    const [showManualBuilder, setShowManualBuilder] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [brandGuide, setBrandGuide] = useState<BrandGuide | null>(null);
    const [brandGuideLoading, setBrandGuideLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<{
        title: string;
        description: string;
        reasoning: string;
    } | null>(null);

    const { dispensaryId } = useDispensaryId();
    const { toast } = useToast();

    // Load brand guide on mount for brand context
    useEffect(() => {
        async function loadBrandGuide() {
            if (!dispensaryId) return;
            setBrandGuideLoading(true);
            try {
                const result = await getBrandGuide(dispensaryId);
                if (result.success && result.brandGuide) {
                    setBrandGuide(result.brandGuide);
                }
            } catch {
                // Brand guide is optional - continue without it
            } finally {
                setBrandGuideLoading(false);
            }
        }
        loadBrandGuide();
    }, [dispensaryId]);

    const generateWithAI = async () => {
        if (!aiPrompt.trim()) {
            toast({
                title: "Prompt Required",
                description: "Please describe the carousel you want to create.",
                variant: "destructive"
            });
            return;
        }

        setIsGenerating(true);

        try {
            // Call AI to generate carousel suggestions, include brand guide context
            const response = await fetch('/api/ai/carousel-suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    orgId: dispensaryId,
                    brandGuide: brandGuide ? {
                        brandName: brandGuide.brandName,
                        primaryColor: brandGuide.visualIdentity?.colors?.primary,
                        voice: brandGuide.voice?.tone,
                    } : undefined,
                }),
            });

            if (!response.ok) throw new Error('Failed to generate suggestions');

            const data = await response.json();

            if (data.success && data.suggestion) {
                setAiSuggestion(data.suggestion);
                setTitle(data.suggestion.title);
                setDescription(data.suggestion.description);

                // If AI suggested products, pre-select them
                if (data.suggestion.productIds) {
                    setSelectedProductIds(data.suggestion.productIds);
                }

                setShowManualBuilder(true);
                setShowPreview(true);

                toast({
                    title: "AI Suggestion Ready!",
                    description: "Review and customize your carousel below.",
                });
            }
        } catch (error) {
            console.error('Error generating AI suggestion:', error);
            toast({
                title: "Generation Failed",
                description: "Couldn't generate suggestions. Try manual mode instead.",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCreateCarousel = async () => {
        if (!title.trim()) {
            toast({
                title: "Title Required",
                description: "Please enter a carousel title.",
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

        if (!dispensaryId) {
            toast({
                title: "Organization Required",
                description: "Could not determine your organization.",
                variant: "destructive"
            });
            return;
        }

        setIsGenerating(true);

        try {
            const result = await createCarousel({
                title,
                description,
                productIds: selectedProductIds,
                displayOrder,
                active: true,
                orgId: dispensaryId,
            });

            if (result.success && result.data) {
                toast({
                    title: "Carousel Created!",
                    description: `${title} is now live on your menu.`,
                });

                onComplete?.(result.data);
            } else {
                throw new Error(result.error || 'Failed to create carousel');
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to create carousel. Please try again.';
            console.error('Error creating carousel:', error);
            toast({
                title: "Creation Failed",
                description: message,
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
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
                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                            <Images className="h-5 w-5 text-purple-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI Carousel Designer</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Create a product carousel with AI assistance
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {brandGuide && (
                                <Badge variant="outline" className="gap-1 border-green-500/30 text-green-400">
                                    <BookOpenCheck className="h-3 w-3" />
                                    Brand Guide
                                </Badge>
                            )}
                            {aiSuggestion && (
                                <Badge variant="outline" className="gap-1 border-purple-500/30 text-purple-400">
                                    <Sparkles className="h-3 w-3" />
                                    AI Assisted
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    {!showManualBuilder ? (
                        <>
                            {/* AI Prompt Input */}
                            <div className="space-y-2">
                                <Label htmlFor="ai-prompt" className="text-sm font-semibold flex items-center gap-2">
                                    <Wand2 className="h-4 w-4 text-purple-400" />
                                    Describe Your Carousel
                                </Label>
                                <Textarea
                                    id="ai-prompt"
                                    placeholder="E.g., Create a carousel for our top-selling flower products under $40"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    className="bg-background/50 border-white/10 min-h-[100px]"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                            generateWithAI();
                                        }
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Describe the products, theme, or criteria you want for your carousel
                                    {brandGuide && ' (Brand Guide colors and voice will be applied automatically)'}
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <Button
                                    onClick={generateWithAI}
                                    disabled={isGenerating || !aiPrompt.trim()}
                                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Generate with AI
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowManualBuilder(true)}
                                    className="border-white/10"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Manual
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* AI Suggestion Summary */}
                            {aiSuggestion && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20"
                                >
                                    <div className="flex items-start gap-3">
                                        <Sparkles className="h-5 w-5 text-purple-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-purple-400 mb-1">AI Suggestion</p>
                                            <p className="text-sm text-muted-foreground">
                                                {aiSuggestion.reasoning}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => {
                                                setAiSuggestion(null);
                                                setShowManualBuilder(false);
                                                setTitle('');
                                                setDescription('');
                                                setSelectedProductIds([]);
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Live Preview */}
                            {showPreview && dispensaryId && (
                                <CarouselPreview
                                    title={title}
                                    description={description}
                                    selectedProductIds={selectedProductIds}
                                    orgId={dispensaryId}
                                />
                            )}

                            {/* Carousel Details */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="carousel-title" className="text-sm font-semibold">
                                        Carousel Title
                                    </Label>
                                    <Input
                                        id="carousel-title"
                                        placeholder="e.g., Best Sellers"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="bg-background/50 border-white/10"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="carousel-description" className="text-sm font-semibold">
                                        Description <span className="text-muted-foreground font-normal">(Optional)</span>
                                    </Label>
                                    <Input
                                        id="carousel-description"
                                        placeholder="e.g., Our most popular products"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="bg-background/50 border-white/10"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="display-order" className="text-sm font-semibold">
                                        Display Order
                                    </Label>
                                    <Input
                                        id="display-order"
                                        type="number"
                                        min="0"
                                        value={displayOrder}
                                        onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                                        className="bg-background/50 border-white/10 w-32"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Lower numbers appear first on the menu
                                    </p>
                                </div>
                            </div>

                            {/* Product Picker */}
                            {dispensaryId && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">
                                        Select Products
                                    </Label>
                                    <ProductPicker
                                        orgId={dispensaryId}
                                        selectedProductIds={selectedProductIds}
                                        onSelectionChange={setSelectedProductIds}
                                    />
                                </div>
                            )}

                            {/* Preview Toggle + Create Button */}
                            <div className="space-y-3 pt-4 border-t border-white/5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowPreview(!showPreview)}
                                    className="w-full border-white/10"
                                >
                                    {showPreview ? (
                                        <><EyeOff className="h-4 w-4 mr-2" /> Hide Preview</>
                                    ) : (
                                        <><Eye className="h-4 w-4 mr-2" /> Show Preview</>
                                    )}
                                </Button>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowManualBuilder(false)}
                                        disabled={isGenerating}
                                        className="border-white/10"
                                    >
                                        Back to AI
                                    </Button>
                                    <Button
                                        onClick={handleCreateCarousel}
                                        disabled={isGenerating || !title.trim() || selectedProductIds.length === 0}
                                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Images className="h-4 w-4 mr-2" />
                                                Create Carousel
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
