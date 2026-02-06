'use client';

/**
 * Inline Hero Generator
 *
 * AI-powered hero banner creation tool that appears inline in the chat conversation.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Wand2, Plus, X, Loader2, Image as ImageIcon, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { createHero } from '@/app/actions/heroes';
import { useToast } from '@/hooks/use-toast';
import { HeroPreview } from '@/components/dashboard/heroes/hero-preview';
import type { Hero, HeroAISuggestion, HeroStyle, HeroPurchaseModel, HeroCtaAction } from '@/types/heroes';

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
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState(initialPrompt);
    const [showManualBuilder, setShowManualBuilder] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<HeroAISuggestion | null>(null);

    const { dispensaryId } = useDispensaryId();
    const { toast } = useToast();

    const generateWithAI = async () => {
        if (!aiPrompt.trim()) {
            toast({
                title: "Prompt Required",
                description: "Please describe the hero banner you want to create.",
                variant: "destructive"
            });
            return;
        }

        setIsGenerating(true);

        try {
            const response = await fetch('/api/ai/hero-suggest', {
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
                setBrandName(data.suggestion.brandName);
                setTagline(data.suggestion.tagline);
                setDescription(data.suggestion.description || '');
                setPrimaryColor(data.suggestion.primaryColor);
                setStyle(data.suggestion.style);
                setPurchaseModel(data.suggestion.purchaseModel);
                setPrimaryCtaLabel(data.suggestion.primaryCta.label);
                setPrimaryCtaAction(data.suggestion.primaryCta.action);

                setShowManualBuilder(true);
                setShowPreview(true);

                toast({
                    title: "AI Suggestion Ready!",
                    description: "Review and customize your hero banner below.",
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

        setIsGenerating(true);

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
            console.error('Error creating hero:', error);
            toast({
                title: "Creation Failed",
                description: error.message || "Failed to create hero. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // Build preview data
    const previewHero: Partial<Hero> = {
        brandName,
        brandLogo: brandLogo || undefined,
        tagline,
        description: description || undefined,
        heroImage: heroImage || undefined,
        primaryColor,
        style,
        purchaseModel,
        verified,
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
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                            <ImageIcon className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI Hero Banner Designer</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Create a stunning hero banner with AI assistance
                            </p>
                        </div>
                        {aiSuggestion && (
                            <Badge variant="outline" className="gap-1 border-blue-500/30 text-blue-400">
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
                                    <Wand2 className="h-4 w-4 text-blue-400" />
                                    Describe Your Hero Banner
                                </Label>
                                <Textarea
                                    id="ai-prompt"
                                    placeholder="E.g., Create a hero for my premium flower brand with green colors and a local pickup option"
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
                                    Describe your brand, style preferences, and target audience
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <Button
                                    onClick={generateWithAI}
                                    disabled={isGenerating || !aiPrompt.trim()}
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
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
                                    className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20"
                                >
                                    <div className="flex items-start gap-3">
                                        <Sparkles className="h-5 w-5 text-blue-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-blue-400 mb-1">AI Suggestion</p>
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
                                                setBrandName('');
                                                setTagline('Premium Cannabis Products');
                                                setDescription('');
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Live Preview */}
                            {showPreview && (
                                <HeroPreview hero={previewHero} />
                            )}

                            {/* Hero Builder */}
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
                            </div>

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
                                    onClick={handleCreateHero}
                                    disabled={isGenerating || !brandName.trim()}
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                                >
                                    {isGenerating ? (
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
                        </>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
