'use client';

/**
 * Inline Dynamic Pricing Generator
 *
 * AI-powered pricing optimization tool that creates intelligent pricing rules
 * based on competitor data, inventory age, traffic patterns, and customer segments.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Sparkles, Wand2, Plus, DollarSign, Percent, Clock, Users, Package, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { useToast } from '@/hooks/use-toast';
import { createPricingRule } from '@/app/actions/dynamic-pricing';
import type { DynamicPricingRule, PricingStrategy } from '@/types/dynamic-pricing';

interface DynamicPricingGeneratorInlineProps {
    onComplete?: (rule: DynamicPricingRule) => void;
    initialPrompt?: string;
    className?: string;
}

export function DynamicPricingGeneratorInline({
    onComplete,
    initialPrompt = '',
    className
}: DynamicPricingGeneratorInlineProps) {
    const [aiPrompt, setAiPrompt] = useState(initialPrompt);
    const [strategy, setStrategy] = useState<PricingStrategy>('dynamic');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Rule configuration
    const [ruleName, setRuleName] = useState('');
    const [discountPercent, setDiscountPercent] = useState(15);
    const [minPrice, setMinPrice] = useState(0);
    const [maxDiscount, setMaxDiscount] = useState(40);
    const [priority, setPriority] = useState(50);

    // Conditions
    const [useInventoryAge, setUseInventoryAge] = useState(false);
    const [inventoryAgeMin, setInventoryAgeMin] = useState(30);
    const [useCompetitorPricing, setUseCompetitorPricing] = useState(false);
    const [useTimeBasedPricing, setUseTimeBasedPricing] = useState(false);
    const [useCustomerTiers, setUseCustomerTiers] = useState(false);

    // AI Suggestion
    const [aiSuggestion, setAiSuggestion] = useState<any>(null);

    const { dispensaryId } = useDispensaryId();
    const { toast } = useToast();

    const generateWithAI = async () => {
        if (!aiPrompt.trim()) {
            toast({
                title: "Prompt Required",
                description: "Please describe your pricing strategy.",
                variant: "destructive"
            });
            return;
        }

        setIsGenerating(true);

        try {
            const response = await fetch('/api/ai/pricing-suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    strategy,
                    orgId: dispensaryId,
                }),
            });

            if (!response.ok) throw new Error('Failed to generate pricing strategy');

            const data = await response.json();

            if (data.success && data.suggestion) {
                setAiSuggestion(data.suggestion);
                setRuleName(data.suggestion.ruleName || '');
                setDiscountPercent(data.suggestion.discountPercent || 15);
                setStrategy(data.suggestion.strategy || 'dynamic');

                if (data.suggestion.useInventoryAge) {
                    setUseInventoryAge(true);
                    setInventoryAgeMin(data.suggestion.inventoryAgeMin || 30);
                }

                toast({
                    title: "AI Suggestion Ready!",
                    description: "Review and customize your pricing rule below.",
                });
            }
        } catch (error) {
            console.error('Error generating pricing strategy:', error);
            toast({
                title: "Generation Failed",
                description: "Couldn't generate strategy. Try manual configuration.",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCreateRule = async () => {
        if (!ruleName.trim()) {
            toast({
                title: "Name Required",
                description: "Please enter a rule name.",
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

        const rule: Partial<DynamicPricingRule> = {
            name: ruleName,
            description: aiSuggestion?.reasoning || `${strategy} pricing strategy`,
            strategy,
            priority,
            active: true,
            conditions: {
                ...(useInventoryAge && {
                    inventoryAge: { min: inventoryAgeMin }
                }),
            },
            priceAdjustment: {
                type: 'percentage',
                value: discountPercent / 100,
                minPrice: minPrice > 0 ? minPrice : undefined,
            },
            orgId: dispensaryId,
        };

        const result = await createPricingRule(rule);

        if (result.success && result.data) {
            toast({
                title: "Pricing Rule Created!",
                description: `"${ruleName}" is now active and optimizing your prices.`,
            });
            onComplete?.(result.data);
        } else {
            toast({
                title: "Creation Failed",
                description: result.error || "Failed to save pricing rule.",
                variant: "destructive",
            });
        }
    };

    const STRATEGY_CONFIG = {
        competitive: {
            name: 'Competitive',
            description: 'Match or beat competitor prices',
            icon: TrendingUp,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
        },
        clearance: {
            name: 'Clearance',
            description: 'Move old inventory quickly',
            icon: Package,
            color: 'text-red-500',
            bgColor: 'bg-red-500/10',
        },
        premium: {
            name: 'Premium',
            description: 'Maintain high margins',
            icon: DollarSign,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
        },
        value: {
            name: 'Value',
            description: 'Attract price-sensitive customers',
            icon: Percent,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10',
        },
        dynamic: {
            name: 'Dynamic',
            description: 'AI-optimized based on all factors',
            icon: Zap,
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-500/10',
        },
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
                        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                            <TrendingUp className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI Dynamic Pricing Engine</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Intelligent price optimization powered by competitor data, inventory age, and demand
                            </p>
                        </div>
                        {aiSuggestion && (
                            <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-400">
                                <Sparkles className="h-3 w-3" />
                                AI Optimized
                            </Badge>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    {/* AI Prompt & Strategy Selection */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="ai-prompt" className="text-sm font-semibold flex items-center gap-2">
                                <Wand2 className="h-4 w-4 text-emerald-400" />
                                Describe Your Pricing Goal
                            </Label>
                            <Textarea
                                id="ai-prompt"
                                placeholder="E.g., Clear out inventory older than 30 days with competitive pricing, or Match competitor prices while maintaining 20% margin"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="bg-background/50 border-white/10 min-h-[100px]"
                            />
                        </div>

                        {/* Strategy Selection */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Pricing Strategy</Label>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                {(Object.keys(STRATEGY_CONFIG) as PricingStrategy[]).map((key) => {
                                    const config = STRATEGY_CONFIG[key];
                                    const Icon = config.icon;
                                    const isSelected = strategy === key;

                                    return (
                                        <Button
                                            key={key}
                                            variant={isSelected ? "default" : "outline"}
                                            className={cn(
                                                'h-auto py-3 px-3 flex flex-col items-center gap-2',
                                                !isSelected && 'border-white/10'
                                            )}
                                            onClick={() => setStrategy(key)}
                                        >
                                            <Icon className={cn('h-5 w-5', isSelected ? 'text-primary-foreground' : config.color)} />
                                            <div className="text-center">
                                                <div className="text-xs font-semibold">{config.name}</div>
                                                <div className="text-[10px] opacity-70">{config.description}</div>
                                            </div>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>

                        <Button
                            onClick={generateWithAI}
                            disabled={isGenerating || !aiPrompt.trim()}
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                        >
                            {isGenerating ? (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Generate Pricing Strategy
                                </>
                            )}
                        </Button>
                    </div>

                    {/* AI Suggestion Display */}
                    {aiSuggestion && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                        >
                            <div className="flex items-start gap-3">
                                <Sparkles className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-emerald-400 mb-1">AI Recommendation</p>
                                    <p className="text-sm text-muted-foreground">
                                        {aiSuggestion.reasoning}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Rule Configuration */}
                    {aiSuggestion && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="rule-name" className="text-sm font-semibold">
                                    Rule Name
                                </Label>
                                <Input
                                    id="rule-name"
                                    placeholder="e.g., Weekend Flash Sale"
                                    value={ruleName}
                                    onChange={(e) => setRuleName(e.target.value)}
                                    className="bg-background/50 border-white/10"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Percent className="h-4 w-4 text-emerald-400" />
                                        Discount Percentage
                                    </span>
                                    <span className="text-emerald-400">{discountPercent}%</span>
                                </Label>
                                <Slider
                                    value={[discountPercent]}
                                    onValueChange={(v) => setDiscountPercent(v[0])}
                                    min={0}
                                    max={maxDiscount}
                                    step={5}
                                    className="py-4"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Products matching this rule will be discounted by {discountPercent}%
                                </p>
                            </div>

                            {/* Advanced Options */}
                            <div className="space-y-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="w-full justify-between"
                                >
                                    <span>Advanced Conditions</span>
                                    <Plus className={cn('h-4 w-4 transition-transform', showAdvanced && 'rotate-45')} />
                                </Button>

                                {showAdvanced && (
                                    <div className="space-y-3 pt-2 border-t border-white/5">
                                        {/* Inventory Age Condition */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <Label className="text-sm">Inventory Age Trigger</Label>
                                            </div>
                                            <Switch
                                                checked={useInventoryAge}
                                                onCheckedChange={setUseInventoryAge}
                                            />
                                        </div>
                                        {useInventoryAge && (
                                            <div className="ml-6 space-y-2">
                                                <Label className="text-xs text-muted-foreground">
                                                    Apply when inventory is older than (days)
                                                </Label>
                                                <Input
                                                    type="number"
                                                    value={inventoryAgeMin}
                                                    onChange={(e) => setInventoryAgeMin(parseInt(e.target.value) || 30)}
                                                    className="bg-background/50 border-white/10 w-24"
                                                />
                                            </div>
                                        )}

                                        {/* Competitor Pricing */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                                <Label className="text-sm">Competitor Price Monitoring</Label>
                                            </div>
                                            <Switch
                                                checked={useCompetitorPricing}
                                                onCheckedChange={setUseCompetitorPricing}
                                            />
                                        </div>

                                        {/* Time-Based Pricing */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <Label className="text-sm">Time-Based Discounts</Label>
                                            </div>
                                            <Switch
                                                checked={useTimeBasedPricing}
                                                onCheckedChange={setUseTimeBasedPricing}
                                            />
                                        </div>

                                        {/* Customer Tiers */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                <Label className="text-sm">Customer Tier Pricing</Label>
                                            </div>
                                            <Switch
                                                checked={useCustomerTiers}
                                                onCheckedChange={setUseCustomerTiers}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Warning */}
                            <div className="flex gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-amber-500/90">
                                    Dynamic pricing will be applied automatically. Monitor performance in your dashboard.
                                </p>
                            </div>

                            {/* Create Button */}
                            <Button
                                onClick={handleCreateRule}
                                disabled={!ruleName.trim()}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                            >
                                <TrendingUp className="h-4 w-4 mr-2" />
                                Activate Pricing Rule
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
