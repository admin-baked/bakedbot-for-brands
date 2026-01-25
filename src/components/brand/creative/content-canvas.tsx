'use client';

/**
 * Content Canvas
 *
 * Main content creation and preview area for the Creative Center.
 * Includes prompt input, generation controls, and live preview.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sparkles,
    Wand2,
    RefreshCw,
    MoreHorizontal,
    Loader2,
    ImageIcon,
    Type,
    Maximize2,
    Copy,
    Download,
    Instagram,
    Video,
    Linkedin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { SocialPlatform, MediaType } from '@/types/creative-content';

interface ContentCanvasProps {
    onGenerate?: (prompt: string, options: GenerateOptions) => void;
    isGenerating?: boolean;
    generatedImageUrl?: string;
    generatedCaption?: string;
    className?: string;
}

interface GenerateOptions {
    platform: SocialPlatform;
    style: 'professional' | 'playful' | 'educational' | 'hype';
    mediaType: MediaType;
}

const PLATFORM_ICONS: Record<SocialPlatform, typeof Instagram> = {
    instagram: Instagram,
    tiktok: Video,
    linkedin: Linkedin,
    twitter: Type,
    facebook: Type,
};

export function ContentCanvas({
    onGenerate,
    isGenerating = false,
    generatedImageUrl,
    generatedCaption,
    className,
}: ContentCanvasProps) {
    const [prompt, setPrompt] = useState('');
    const [platform, setPlatform] = useState<SocialPlatform>('instagram');
    const [style, setStyle] = useState<'professional' | 'playful' | 'educational' | 'hype'>(
        'professional'
    );

    const handleGenerate = () => {
        if (!prompt.trim() || isGenerating) return;
        onGenerate?.(prompt, { platform, style, mediaType: 'image' });
    };

    const PlatformIcon = PLATFORM_ICONS[platform];
    const hasContent = generatedImageUrl || generatedCaption;

    return (
        <Card className={cn('glass-card glass-card-hover', className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-purple-400" />
                    Content Canvas
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Badge
                        variant="outline"
                        className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30"
                    >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Craig + Nano Banana
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Generation Controls */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Platform Select */}
                    <Select value={platform} onValueChange={(v) => setPlatform(v as SocialPlatform)}>
                        <SelectTrigger className="w-full sm:w-[140px] bg-card/50">
                            <div className="flex items-center gap-2">
                                <PlatformIcon className="h-4 w-4" />
                                <SelectValue placeholder="Platform" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="tiktok">TikTok</SelectItem>
                            <SelectItem value="linkedin">LinkedIn</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Style Select */}
                    <Select value={style} onValueChange={(v) => setStyle(v as typeof style)}>
                        <SelectTrigger className="w-full sm:w-[140px] bg-card/50">
                            <SelectValue placeholder="Tone" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="playful">Playful</SelectItem>
                            <SelectItem value="educational">Educational</SelectItem>
                            <SelectItem value="hype">Hype</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Regenerate Button (visible when content exists) */}
                    {hasContent && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="gap-2"
                        >
                            <RefreshCw className={cn('h-4 w-4', isGenerating && 'animate-spin')} />
                            Regenerate
                        </Button>
                    )}
                </div>

                {/* Prompt Input */}
                <div className="relative">
                    <Textarea
                        placeholder="Describe the content you want to create... E.g., 'Promote our new Delta-8 gummies with a weekend vibe' or 'Educational post about CBD benefits for sleep'"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[100px] bg-card/50 border-border/50 resize-none pr-24"
                    />
                    <Button
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isGenerating}
                        className="absolute bottom-3 right-3 gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        size="sm"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                Generate
                            </>
                        )}
                    </Button>
                </div>

                {/* Content Preview */}
                <AnimatePresence mode="wait">
                    {isGenerating && !hasContent && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="aspect-square bg-card/30 rounded-lg border border-border/30 flex flex-col items-center justify-center gap-4"
                        >
                            <motion.div
                                animate={{
                                    scale: [1, 1.1, 1],
                                    opacity: [0.5, 1, 0.5],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                            >
                                <Sparkles className="h-12 w-12 text-purple-400" />
                            </motion.div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-foreground">
                                    Craig & Nano Banana are creating...
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Generating image and caption
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {hasContent && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            {/* Generated Image */}
                            {generatedImageUrl && (
                                <div className="relative group aspect-square rounded-lg overflow-hidden bg-card/30 border border-border/30">
                                    <img
                                        src={generatedImageUrl}
                                        alt="Generated content"
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Overlay Actions */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="gap-1"
                                        >
                                            <Maximize2 className="h-4 w-4" />
                                            View
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="gap-1"
                                        >
                                            <Download className="h-4 w-4" />
                                            Download
                                        </Button>
                                    </div>
                                    {/* Platform Badge */}
                                    <Badge
                                        className="absolute top-3 left-3 bg-black/60 text-white border-0"
                                    >
                                        <PlatformIcon className="h-3 w-3 mr-1" />
                                        {platform}
                                    </Badge>
                                </div>
                            )}

                            {/* Generated Caption */}
                            {generatedCaption && (
                                <div className="p-4 rounded-lg bg-card/50 border border-border/30">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Type className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    Generated Caption
                                                </span>
                                            </div>
                                            <p className="text-sm text-foreground whitespace-pre-wrap">
                                                {generatedCaption}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {!isGenerating && !hasContent && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="aspect-square bg-card/30 rounded-lg border border-dashed border-border/50 flex flex-col items-center justify-center gap-3"
                        >
                            <div className="h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="text-center px-4">
                                <p className="text-sm font-medium text-foreground">
                                    No content yet
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Describe what you want to create and click Generate
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}

export default ContentCanvas;
