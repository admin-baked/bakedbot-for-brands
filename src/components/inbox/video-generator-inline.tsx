'use client';

/**
 * Inline Video Content Generator
 *
 * AI-powered video concept and script creation tool.
 * Provides structured video ideas for TikTok, Reels, and Shorts.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Sparkles, Wand2, RefreshCw, Copy, Check, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface VideoGeneratorInlineProps {
    onComplete?: (videoConcept: any) => void;
    initialPrompt?: string;
    className?: string;
}

export function VideoGeneratorInline({
    onComplete,
    initialPrompt = '',
    className
}: VideoGeneratorInlineProps) {
    const [aiPrompt, setAiPrompt] = useState(initialPrompt);
    const [tone, setTone] = useState<string>('educational');
    const [isGenerating, setIsGenerating] = useState(false);
    const [videoConcept, setVideoConcept] = useState<any | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const { toast } = useToast();

    const generateVideoConcept = async () => {
        if (!aiPrompt.trim()) {
            toast({
                title: "Prompt Required",
                description: "Please describe what kind of video you want to create.",
                variant: "destructive"
            });
            return;
        }

        setIsGenerating(true);

        try {
            // For now, we simulate generation (until a dedicated API route is ready)
            // or we can call runInboxAgentChat under the hood if needed.
            await new Promise(resolve => setTimeout(resolve, 2000));

            setVideoConcept({
                title: "Behind the Scenes: " + aiPrompt.slice(0, 20) + "...",
                hook: "Ever wonder how your favorite products are made? 👀",
                visuals: "Fast-paced montage of product staging, budtenders helping customers, and close-ups of fresh drops.",
                audio: "Trending upbeat lo-fi hip hop / 'Aesthetic' TikTok audio.",
                script: "1. [0:00-0:03] Hook: 'Stop scrolling! Are you missing out on the best flower in town?'\n2. [0:03-0:08] Show close-up of product trichomes.\n3. [0:08-0:12] Budtender explaining the terpene profile.\n4. [0:12-0:15] Call to Action: 'Visit us this weekend or order ahead online.'",
                captions: "Stop scrolling! 🔥 Discover why everyone is talking about our latest drop. #dispensarylife #cannabiscommunity #freshdrop",
            });

            toast({
                title: "Video Concept Ready!",
                description: "Review your AI-generated video script and shot list.",
            });
        } catch (error) {
            console.error('Error generating video concept:', error);
            toast({
                title: "Generation Failed",
                description: "Couldn't generate video concept. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = async () => {
        if (!videoConcept) return;

        const contentToCopy = `Title: ${videoConcept.title}\n\nHook: ${videoConcept.hook}\n\nVisuals: ${videoConcept.visuals}\n\nAudio: ${videoConcept.audio}\n\nScript:\n${videoConcept.script}\n\nCaption/Hashtags:\n${videoConcept.captions}`;

        await navigator.clipboard.writeText(contentToCopy);
        setIsCopied(true);
        toast({
            title: "Copied!",
            description: "Video concept copied to clipboard.",
        });
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleComplete = () => {
        if (!videoConcept) return;
        onComplete?.(videoConcept);
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
                        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                            <Video className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI Video Concept Planner</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Plan scripts, shot lists, and captions for Reels and TikTok
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="ai-prompt" className="text-sm font-semibold flex items-center gap-2">
                                <Wand2 className="h-4 w-4 text-indigo-400" />
                                What's the video about?
                            </Label>
                            <Textarea
                                id="ai-prompt"
                                placeholder="E.g., A quick educational video about the difference between live resin and distillate carts."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="bg-background/50 border-white/10 min-h-[100px]"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                        generateVideoConcept();
                                    }
                                }}
                            />
                        </div>

                        <div className="flex gap-3 items-end">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="tone" className="text-sm font-semibold flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-indigo-400" />
                                    Style/Format
                                </Label>
                                <Select value={tone} onValueChange={setTone}>
                                    <SelectTrigger className="bg-background/50 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="educational">Educational / How-To</SelectItem>
                                        <SelectItem value="trending">Trending Audio Sync</SelectItem>
                                        <SelectItem value="behind_the_scenes">Behind the Scenes</SelectItem>
                                        <SelectItem value="product_showcase">Product Showcase</SelectItem>
                                        <SelectItem value="comedy">Comedy / Skit</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={generateVideoConcept}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        {videoConcept ? 'Regenerate' : 'Generate Concept'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {videoConcept && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <Card className="border-indigo-500/20 bg-indigo-500/5">
                                <CardHeader className="pb-3 border-b border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Play className="h-5 w-5 text-indigo-400" />
                                            <CardTitle className="text-base text-indigo-400">{videoConcept.title}</CardTitle>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={copyToClipboard}
                                                className="h-8"
                                            >
                                                {isCopied ? (
                                                    <>
                                                        <Check className="h-3 w-3 mr-1" />
                                                        Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3 w-3 mr-1" />
                                                        Copy Script
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4 text-sm">
                                    <div className="space-y-1">
                                        <span className="font-semibold text-indigo-300">Hook:</span>
                                        <p className="text-muted-foreground">{videoConcept.hook}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="font-semibold text-indigo-300">Visuals:</span>
                                        <p className="text-muted-foreground">{videoConcept.visuals}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="font-semibold text-indigo-300">Audio Suggestion:</span>
                                        <p className="text-muted-foreground">{videoConcept.audio}</p>
                                    </div>
                                    <div className="space-y-1 p-3 bg-background/50 rounded-md border border-white/10 font-mono text-xs whitespace-pre-wrap">
                                        {videoConcept.script}
                                    </div>
                                    <div className="space-y-1">
                                        <span className="font-semibold text-indigo-300">Caption & Hashtags:</span>
                                        <p className="text-muted-foreground text-xs italic">{videoConcept.captions}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex justify-end pt-4 border-t border-white/5">
                                <Button
                                    onClick={handleComplete}
                                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                                >
                                    <Check className="h-4 w-4 mr-2" />
                                    Looks Good
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
