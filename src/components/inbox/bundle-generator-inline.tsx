'use client';

/**
 * Inline Bundle Generator
 *
 * AI-powered bundle creation tool that appears inline in the chat conversation.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Sparkles, Wand2, Plus, X, Loader2, Tag, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { ProductPicker } from '@/components/dashboard/carousels/product-picker';
import { createBundle } from '@/app/actions/bundles';
import { useToast } from '@/hooks/use-toast';
import type { BundleDeal, BundleType } from '@/types/bundles';

interface BundleGeneratorInlineProps {
    onComplete?: (bundleData: BundleDeal) => void;
    initialPrompt?: string;
    className?: string;
}

export function BundleGeneratorInline({
    onComplete,
    initialPrompt = '',
    className
}: BundleGeneratorInlineProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [bundleType, setBundleType] = useState<BundleType>('mix_match');
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [fixedPrice, setFixedPrice] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState(initialPrompt);
    const [showManualBuilder, setShowManualBuilder] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<{
        name: string;
        description: string;
        type: BundleType;
        discountPercent?: number;
        reasoning: string;
    } | null>(null);

    const { dispensaryId } = useDispensaryId();
    const { toast } = useToast();

    const generateWithAI = async () => {
        if (!aiPrompt.trim()) {
            toast({
                title: "Prompt Required",
                description: "Please describe the bundle you want to create.",
                variant: "destructive"
            });
            return;
        }

        setIsGenerating(true);

        try {
            // Call AI to generate bundle suggestions
            const response = await fetch('/api/ai/bundle-suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    orgId: dispensaryId,
                }),
            });

            if (!response.ok) throw new Error('Failed to generate suggestions');

            const data = await response.json();

            if (data.success && data.suggestion) {
                setAiSuggestion(data.suggestion);
                setName(data.suggestion.name);
                setDescription(data.suggestion.description);
                setBundleType(data.suggestion.type || 'mix_match');

                if (data.suggestion.discountPercent) {
                    setDiscountPercent(data.suggestion.discountPercent);
                }

                // If AI suggested products, pre-select them
                if (data.suggestion.productIds) {
                    setSelectedProductIds(data.suggestion.productIds);
                }

                setShowManualBuilder(true);

                toast({
                    title: "AI Suggestion Ready!",
                    description: "Review and customize your bundle below.",
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

    const handleCreateBundle = async () => {
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
            // Calculate bundle pricing
            const savingsPercent = bundleType === 'percentage' ? discountPercent : 0;
            const bundlePrice = bundleType === 'fixed_price' ? fixedPrice : 0;

            const result = await createBundle({
                name,
                description,
                type: bundleType,
                status: 'active',
                createdBy: 'dispensary',
                products: [], // Will be populated based on productIds
                eligibleProductIds: selectedProductIds,
                savingsPercent,
                bundlePrice,
                originalTotal: 0, // Calculate based on selected products
                savingsAmount: 0,
                currentRedemptions: 0,
                featured: false,
                orgId: dispensaryId,
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
            console.error('Error creating bundle:', error);
            toast({
                title: "Creation Failed",
                description: error.message || "Failed to create bundle. Please try again.",
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
                        <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                            <Package className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI Bundle Designer</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Create a promotional bundle with AI assistance
                            </p>
                        </div>
                        {aiSuggestion && (
                            <Badge variant="outline" className="gap-1 border-green-500/30 text-green-400">
                                <Sparkles className="h-3 w-3" />
                                AI Assisted
                            </Badge>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    {!showManualBuilder ? (
                        <>
                            {/* AI Prompt Input */}
                            <div className="space-y-2">
                                <Label htmlFor="ai-prompt" className="text-sm font-semibold flex items-center gap-2">
                                    <Wand2 className="h-4 w-4 text-green-400" />
                                    Describe Your Bundle
                                </Label>
                                <Textarea
                                    id="ai-prompt"
                                    placeholder="E.g., Create a BOGO deal for our top flower strains, or a mix & match bundle with 20% off when you buy 3 edibles"
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
                                    Describe the deal type (BOGO, Mix & Match, % Off), products, and discount
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <Button
                                    onClick={generateWithAI}
                                    disabled={isGenerating || !aiPrompt.trim()}
                                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
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
                                    className="p-4 rounded-lg bg-green-500/10 border border-green-500/20"
                                >
                                    <div className="flex items-start gap-3">
                                        <Sparkles className="h-5 w-5 text-green-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-green-400 mb-1">AI Suggestion</p>
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
                                                setName('');
                                                setDescription('');
                                                setSelectedProductIds([]);
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Bundle Details */}
                            <div className="space-y-4">
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

                                {/* Conditional fields based on bundle type */}
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
                                        <p className="text-xs text-muted-foreground">
                                            Discount applied to selected products
                                        </p>
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
                                        <p className="text-xs text-muted-foreground">
                                            Fixed price for the entire bundle
                                        </p>
                                    </div>
                                )}
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

                            {/* Create Button */}
                            <div className="flex gap-2 pt-4 border-t border-white/5">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowManualBuilder(false)}
                                    disabled={isGenerating}
                                    className="border-white/10"
                                >
                                    Back to AI
                                </Button>
                                <Button
                                    onClick={handleCreateBundle}
                                    disabled={isGenerating || !name.trim() || selectedProductIds.length === 0}
                                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                                >
                                    {isGenerating ? (
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
                        </>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
