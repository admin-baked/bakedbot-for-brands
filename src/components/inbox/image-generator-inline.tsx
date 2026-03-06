'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ImagePlus, Loader2, RefreshCw, Save, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ChatMediaPreview } from '@/components/chat/chat-media-preview';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { cn } from '@/lib/utils';
import { generateInboxImageDraft } from '@/server/actions/inbox-media';
import type { CreativeContent } from '@/types/creative-content';
import type { GenerateInboxImageDraftInput, InboxImageStyle } from '@/types/inbox-media';

interface ImageDraftCompletion {
    draft: CreativeContent;
    media: {
        type: 'image';
        url: string;
        prompt: string;
        model: string;
    };
}

interface ImageGeneratorInlineProps {
    orgId: string;
    onComplete?: (result: ImageDraftCompletion) => void | Promise<void>;
    initialPrompt?: string;
    className?: string;
}

const STYLE_LABELS: Record<InboxImageStyle, string> = {
    product_photo: 'Product Photo',
    lifestyle: 'Lifestyle',
    flat_lay: 'Flat Lay',
    menu_promo: 'Menu Promo',
};

export function ImageGeneratorInline({
    orgId,
    onComplete,
    initialPrompt = '',
    className,
}: ImageGeneratorInlineProps) {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [style, setStyle] = useState<InboxImageStyle>('product_photo');
    const [platform, setPlatform] = useState<GenerateInboxImageDraftInput['platform']>('instagram');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [result, setResult] = useState<ImageDraftCompletion | null>(null);
    const { toast } = useToast();
    const { user } = useUserRole();

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast({
                title: 'Prompt required',
                description: 'Describe the image you want to generate.',
                variant: 'destructive',
            });
            return;
        }

        if (!user?.uid) {
            toast({
                title: 'Unable to generate image',
                description: 'User session is missing.',
                variant: 'destructive',
            });
            return;
        }

        setIsGenerating(true);
        try {
            const response = await generateInboxImageDraft({
                tenantId: orgId,
                brandId: orgId,
                createdBy: user.uid,
                platform,
                prompt: prompt.trim(),
                style,
            });

            if (!response.success || !response.draft || !response.media) {
                throw new Error(response.error || 'Image generation failed.');
            }

            const nextResult: ImageDraftCompletion = {
                draft: response.draft,
                media: response.media,
            };

            setResult(nextResult);
            toast({
                title: 'Image generated',
                description: `${STYLE_LABELS[style]} draft is ready for review.`,
            });
        } catch (error) {
            toast({
                title: 'Generation failed',
                description: error instanceof Error ? error.message : 'Unable to generate image.',
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!result) return;

        const link = document.createElement('a');
        link.href = result.media.url;
        link.download = `bakedbot-image-${Date.now()}.png`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
    };

    const handleSaveDraft = async () => {
        if (!result || !onComplete) return;
        setIsSaving(true);
        try {
            await onComplete(result);
            toast({
                title: 'Draft saved',
                description: 'Image draft was added to this inbox thread.',
            });
        } catch (error) {
            toast({
                title: 'Save failed',
                description: error instanceof Error ? error.message : 'Unable to save image draft.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
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
                        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-blue-500/20">
                            <ImagePlus className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI Image Generator</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Create inline marketing imagery with the FLUX pipeline
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="image-prompt" className="text-sm font-semibold flex items-center gap-2">
                                <Wand2 className="h-4 w-4 text-emerald-400" />
                                What image do you need?
                            </Label>
                            <Textarea
                                id="image-prompt"
                                value={prompt}
                                onChange={(event) => setPrompt(event.target.value)}
                                className="bg-background/50 border-white/10 min-h-[110px]"
                                placeholder="E.g., Premium studio shot of our newest live resin cart with dramatic side lighting and clean packaging focus."
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                                        handleGenerate();
                                    }
                                }}
                            />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-emerald-400" />
                                    Style
                                </Label>
                                <Select value={style} onValueChange={(value) => setStyle(value as InboxImageStyle)}>
                                    <SelectTrigger className="bg-background/50 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="product_photo">Product Photo</SelectItem>
                                        <SelectItem value="lifestyle">Lifestyle</SelectItem>
                                        <SelectItem value="flat_lay">Flat Lay</SelectItem>
                                        <SelectItem value="menu_promo">Menu Promo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Format</Label>
                                <Select
                                    value={platform}
                                    onValueChange={(value) => setPlatform(value as GenerateInboxImageDraftInput['platform'])}
                                >
                                    <SelectTrigger className="bg-background/50 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="instagram">Instagram</SelectItem>
                                        <SelectItem value="tiktok">TikTok</SelectItem>
                                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                                        <SelectItem value="facebook">Facebook</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating || !prompt.trim()}
                                className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        {result ? 'Regenerate' : 'Generate Image'}
                                    </>
                                )}
                            </Button>

                            {result && (
                                <>
                                    <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Regenerate
                                    </Button>
                                    <Button variant="outline" onClick={handleDownload}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                    </Button>
                                    <Button onClick={handleSaveDraft} disabled={isSaving}>
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" />
                                                Save Draft
                                            </>
                                        )}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {result && (
                        <div className="space-y-3">
                            <ChatMediaPreview
                                type="image"
                                url={result.media.url}
                                prompt={result.media.prompt}
                                model={result.media.model}
                            />
                            <div className="rounded-lg border border-white/10 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                                {STYLE_LABELS[style]} for {platform}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
