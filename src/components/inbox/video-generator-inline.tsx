'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Clapperboard, Copy, Loader2, Save, Sparkles, Video, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ChatMediaPreview } from '@/components/chat/chat-media-preview';
import { useUserRole } from '@/hooks/use-user-role';
import { generateInboxVideoConcept, generateInboxVideoDraft } from '@/server/actions/inbox-media';
import type { CreativeContent } from '@/types/creative-content';
import type {
    GenerateInboxVideoDraftInput,
    InboxVideoConcept,
    InboxVideoPlatform,
    InboxVideoStyle,
} from '@/types/inbox-media';

interface VideoDraftCompletion {
    draft: CreativeContent;
    media: {
        type: 'video';
        url: string;
        prompt: string;
        duration: number;
        model: string;
    };
}

interface VideoGeneratorInlineProps {
    orgId: string;
    onComplete?: (result: VideoDraftCompletion) => void | Promise<void>;
    initialPrompt?: string;
    className?: string;
}

export function VideoGeneratorInline({
    orgId,
    onComplete,
    initialPrompt = '',
    className,
}: VideoGeneratorInlineProps) {
    const [aiPrompt, setAiPrompt] = useState(initialPrompt);
    const [style, setStyle] = useState<InboxVideoStyle>('educational');
    const [platform, setPlatform] = useState<InboxVideoPlatform>('instagram');
    const [duration, setDuration] = useState<GenerateInboxVideoDraftInput['duration']>('5');
    const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [videoConcept, setVideoConcept] = useState<InboxVideoConcept | null>(null);
    const [videoResult, setVideoResult] = useState<VideoDraftCompletion | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const { toast } = useToast();
    const { user } = useUserRole();

    const generateVideoConcept = async () => {
        if (!aiPrompt.trim()) {
            toast({
                title: 'Prompt required',
                description: 'Please describe what kind of video you want to create.',
                variant: 'destructive',
            });
            return;
        }

        if (!user?.uid) {
            toast({
                title: 'Unable to generate concept',
                description: 'User session is missing.',
                variant: 'destructive',
            });
            return;
        }

        setIsGeneratingConcept(true);

        try {
            const response = await generateInboxVideoConcept({
                tenantId: orgId,
                brandId: orgId,
                createdBy: user.uid,
                prompt: aiPrompt.trim(),
                style,
                platform,
            });

            if (!response.success || !response.concept) {
                throw new Error(response.error || 'Video concept generation failed.');
            }

            setVideoConcept(response.concept);
            setVideoResult(null);
            toast({
                title: 'Video concept ready',
                description: 'Review the script, hook, and shot plan before rendering.',
            });
        } catch (error) {
            toast({
                title: 'Generation failed',
                description: error instanceof Error ? error.message : 'Could not generate a video concept.',
                variant: 'destructive',
            });
        } finally {
            setIsGeneratingConcept(false);
        }
    };

    const generateVideo = async () => {
        if (!aiPrompt.trim()) {
            toast({
                title: 'Prompt required',
                description: 'Please describe what kind of video you want to create.',
                variant: 'destructive',
            });
            return;
        }

        if (!user?.uid) {
            toast({
                title: 'Unable to render video',
                description: 'User session is missing.',
                variant: 'destructive',
            });
            return;
        }

        setIsGeneratingVideo(true);
        try {
            const response = await generateInboxVideoDraft({
                tenantId: orgId,
                brandId: orgId,
                createdBy: user.uid,
                prompt: aiPrompt.trim(),
                style,
                platform,
                duration,
                concept: videoConcept || undefined,
            });

            if (!response.success || !response.draft || !response.media) {
                throw new Error(response.error || 'Video generation failed.');
            }

            setVideoResult({
                draft: response.draft,
                media: response.media,
            });

            toast({
                title: 'Video rendered',
                description: 'Your MP4 draft is ready for review.',
            });
        } catch (error) {
            toast({
                title: 'Render failed',
                description: error instanceof Error ? error.message : 'Could not render the video.',
                variant: 'destructive',
            });
        } finally {
            setIsGeneratingVideo(false);
        }
    };

    const copyToClipboard = async () => {
        if (!videoConcept) return;

        const contentToCopy = [
            `Title: ${videoConcept.title}`,
            `Hook: ${videoConcept.hook}`,
            `Visuals: ${videoConcept.visuals}`,
            `Audio: ${videoConcept.audio || 'Optional ambient or trending audio'}`,
            'Script:',
            videoConcept.script,
            'Caption & Hashtags:',
            `${videoConcept.caption || ''} ${(videoConcept.hashtags || []).join(' ')}`.trim(),
        ].join('\n\n');

        await navigator.clipboard.writeText(contentToCopy);
        setIsCopied(true);
        toast({
            title: 'Copied',
            description: 'Video concept copied to clipboard.',
        });
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleSaveDraft = async () => {
        if (!videoResult || !onComplete) return;

        setIsSaving(true);
        try {
            await onComplete(videoResult);
            toast({
                title: 'Draft saved',
                description: 'Video draft was added to this inbox thread.',
            });
        } catch (error) {
            toast({
                title: 'Save failed',
                description: error instanceof Error ? error.message : 'Unable to save the video draft.',
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
                        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-500/20">
                            <Video className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI Video Concept Planner</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Plan, render, and save short-form video drafts for Reels and TikTok
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="video-prompt" className="text-sm font-semibold flex items-center gap-2">
                                <Wand2 className="h-4 w-4 text-indigo-400" />
                                What's the video about?
                            </Label>
                            <Textarea
                                id="video-prompt"
                                placeholder="E.g., A quick educational video about the difference between live resin and distillate carts."
                                value={aiPrompt}
                                onChange={(event) => setAiPrompt(event.target.value)}
                                className="bg-background/50 border-white/10 min-h-[100px]"
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                                        generateVideoConcept();
                                    }
                                }}
                            />
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-indigo-400" />
                                    Style/Format
                                </Label>
                                <Select value={style} onValueChange={(value) => setStyle(value as InboxVideoStyle)}>
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

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Platform</Label>
                                <Select value={platform} onValueChange={(value) => setPlatform(value as InboxVideoPlatform)}>
                                    <SelectTrigger className="bg-background/50 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="instagram">Instagram Reels</SelectItem>
                                        <SelectItem value="tiktok">TikTok</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Duration</Label>
                                <Select value={duration} onValueChange={(value) => setDuration(value as '5' | '10')}>
                                    <SelectTrigger className="bg-background/50 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5 seconds</SelectItem>
                                        <SelectItem value="10">10 seconds</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={generateVideoConcept}
                                disabled={isGeneratingConcept || !aiPrompt.trim()}
                                className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600"
                            >
                                {isGeneratingConcept ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        {videoConcept ? 'Regenerate Concept' : 'Generate Concept'}
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={generateVideo}
                                disabled={isGeneratingVideo || !aiPrompt.trim()}
                            >
                                {isGeneratingVideo ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Rendering...
                                    </>
                                ) : (
                                    <>
                                        <Clapperboard className="h-4 w-4 mr-2" />
                                        Generate Video
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
                                            <Video className="h-5 w-5 text-indigo-400" />
                                            <CardTitle className="text-base text-indigo-400">{videoConcept.title}</CardTitle>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-8">
                                            {isCopied ? (
                                                <>
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Copied
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3 w-3 mr-1" />
                                                    Copy Script
                                                </>
                                            )}
                                        </Button>
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
                                        <p className="text-muted-foreground">{videoConcept.audio || 'Optional ambient or trending audio'}</p>
                                    </div>
                                    <div className="space-y-1 p-3 bg-background/50 rounded-md border border-white/10 font-mono text-xs whitespace-pre-wrap">
                                        {videoConcept.script}
                                    </div>
                                    <div className="space-y-1">
                                        <span className="font-semibold text-indigo-300">Caption & Hashtags:</span>
                                        <p className="text-muted-foreground text-xs italic">
                                            {videoConcept.caption} {(videoConcept.hashtags || []).join(' ')}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {videoResult && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4 border-t border-white/5 pt-4"
                        >
                            <ChatMediaPreview
                                type="video"
                                url={videoResult.media.url}
                                prompt={videoResult.media.prompt}
                                duration={videoResult.media.duration}
                                model={videoResult.media.model}
                            />
                            <div className="flex justify-end">
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
                            </div>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
