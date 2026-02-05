'use client';

/**
 * Inline Social Media Post Generator
 *
 * AI-powered multi-platform post creation tool for Instagram, TikTok, and LinkedIn.
 * Generates platform-optimized content simultaneously with customization options.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Instagram, Music, Linkedin, Sparkles, Wand2, RefreshCw, Copy, Check, Loader2, Hash, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { useToast } from '@/hooks/use-toast';

interface SocialPostGeneratorInlineProps {
    onComplete?: (posts: SocialMediaPosts) => void;
    initialPrompt?: string;
    className?: string;
}

interface PlatformPost {
    content: string;
    hashtags: string[];
    characterCount: number;
    platform: 'instagram' | 'tiktok' | 'linkedin';
}

interface SocialMediaPosts {
    instagram: PlatformPost;
    tiktok: PlatformPost;
    linkedin: PlatformPost;
    prompt: string;
    tone: string;
}

const PLATFORM_LIMITS = {
    instagram: 2200,
    tiktok: 2200,
    linkedin: 3000,
};

const PLATFORM_CONFIG = {
    instagram: {
        name: 'Instagram',
        icon: Instagram,
        color: 'from-pink-500 to-purple-500',
        bgColor: 'bg-pink-500/10',
        borderColor: 'border-pink-500/20',
        textColor: 'text-pink-400',
    },
    tiktok: {
        name: 'TikTok',
        icon: Music,
        color: 'from-cyan-500 to-blue-500',
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/20',
        textColor: 'text-cyan-400',
    },
    linkedin: {
        name: 'LinkedIn',
        icon: Linkedin,
        color: 'from-blue-600 to-blue-700',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        textColor: 'text-blue-400',
    },
};

export function SocialPostGeneratorInline({
    onComplete,
    initialPrompt = '',
    className
}: SocialPostGeneratorInlineProps) {
    const [aiPrompt, setAiPrompt] = useState(initialPrompt);
    const [tone, setTone] = useState<string>('casual');
    const [isGenerating, setIsGenerating] = useState(false);
    const [posts, setPosts] = useState<SocialMediaPosts | null>(null);
    const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

    const { dispensaryId } = useDispensaryId();
    const { toast } = useToast();

    const generatePosts = async () => {
        if (!aiPrompt.trim()) {
            toast({
                title: "Prompt Required",
                description: "Please describe what you want to post about.",
                variant: "destructive"
            });
            return;
        }

        setIsGenerating(true);

        try {
            const response = await fetch('/api/ai/social-suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    tone,
                    orgId: dispensaryId,
                }),
            });

            if (!response.ok) throw new Error('Failed to generate posts');

            const data = await response.json();

            if (data.success && data.posts) {
                setPosts(data.posts);
                toast({
                    title: "Posts Generated!",
                    description: "Review and customize your social media posts below.",
                });
            }
        } catch (error) {
            console.error('Error generating posts:', error);
            toast({
                title: "Generation Failed",
                description: "Couldn't generate posts. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const regeneratePost = async (platform: 'instagram' | 'tiktok' | 'linkedin') => {
        if (!posts || !aiPrompt.trim()) return;

        setIsGenerating(true);

        try {
            const response = await fetch('/api/ai/social-suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    tone,
                    platform, // Regenerate only this platform
                    orgId: dispensaryId,
                }),
            });

            if (!response.ok) throw new Error('Failed to regenerate post');

            const data = await response.json();

            if (data.success && data.posts) {
                setPosts({
                    ...posts,
                    [platform]: data.posts[platform],
                });
                toast({
                    title: "Post Regenerated!",
                    description: `New ${PLATFORM_CONFIG[platform].name} post created.`,
                });
            }
        } catch (error) {
            console.error('Error regenerating post:', error);
            toast({
                title: "Regeneration Failed",
                description: "Couldn't regenerate post. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const updatePostContent = (platform: 'instagram' | 'tiktok' | 'linkedin', content: string) => {
        if (!posts) return;

        const characterCount = content.length;
        const hashtags = content.match(/#\w+/g) || [];

        setPosts({
            ...posts,
            [platform]: {
                ...posts[platform],
                content,
                characterCount,
                hashtags,
            },
        });
    };

    const copyToClipboard = async (platform: 'instagram' | 'tiktok' | 'linkedin') => {
        if (!posts) return;

        const post = posts[platform];
        await navigator.clipboard.writeText(post.content);

        setCopiedPlatform(platform);
        toast({
            title: "Copied!",
            description: `${PLATFORM_CONFIG[platform].name} post copied to clipboard.`,
        });

        setTimeout(() => setCopiedPlatform(null), 2000);
    };

    const handleComplete = () => {
        if (!posts) return;
        onComplete?.(posts);
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
                            <Sparkles className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI Social Media Post Generator</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Create optimized posts for Instagram, TikTok, and LinkedIn
                            </p>
                        </div>
                        {posts && (
                            <Badge variant="outline" className="gap-1 border-blue-500/30 text-blue-400">
                                <Sparkles className="h-3 w-3" />
                                3 Posts Generated
                            </Badge>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    {/* AI Prompt & Tone Selection */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="ai-prompt" className="text-sm font-semibold flex items-center gap-2">
                                <Wand2 className="h-4 w-4 text-blue-400" />
                                What do you want to post about?
                            </Label>
                            <Textarea
                                id="ai-prompt"
                                placeholder="E.g., Announcing our new indica strain 'Purple Dream' - perfect for relaxation and sleep. On sale this weekend!"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="bg-background/50 border-white/10 min-h-[100px]"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                        generatePosts();
                                    }
                                }}
                            />
                        </div>

                        <div className="flex gap-3 items-end">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="tone" className="text-sm font-semibold flex items-center gap-2">
                                    <Type className="h-4 w-4 text-blue-400" />
                                    Tone
                                </Label>
                                <Select value={tone} onValueChange={setTone}>
                                    <SelectTrigger className="bg-background/50 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="casual">Casual & Friendly</SelectItem>
                                        <SelectItem value="professional">Professional</SelectItem>
                                        <SelectItem value="hype">Hype & Exciting</SelectItem>
                                        <SelectItem value="educational">Educational</SelectItem>
                                        <SelectItem value="storytelling">Storytelling</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={generatePosts}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        {posts ? 'Regenerate All' : 'Generate Posts'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Generated Posts - 3 Platform Cards */}
                    {posts && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-1 gap-4">
                                {(['instagram', 'tiktok', 'linkedin'] as const).map((platform) => {
                                    const config = PLATFORM_CONFIG[platform];
                                    const post = posts[platform];
                                    const Icon = config.icon;
                                    const isOverLimit = post.characterCount > PLATFORM_LIMITS[platform];
                                    const isCopied = copiedPlatform === platform;

                                    return (
                                        <Card
                                            key={platform}
                                            className={cn(
                                                'border transition-all',
                                                config.borderColor,
                                                config.bgColor
                                            )}
                                        >
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Icon className={cn('h-5 w-5', config.textColor)} />
                                                        <CardTitle className="text-base">{config.name}</CardTitle>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => regeneratePost(platform)}
                                                            disabled={isGenerating}
                                                            className="h-8"
                                                        >
                                                            <RefreshCw className="h-3 w-3 mr-1" />
                                                            Regenerate
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => copyToClipboard(platform)}
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
                                                                    Copy
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div className="space-y-2">
                                                    <Textarea
                                                        value={post.content}
                                                        onChange={(e) => updatePostContent(platform, e.target.value)}
                                                        className={cn(
                                                            'bg-background/50 border-white/10 min-h-[150px] font-sans',
                                                            isOverLimit && 'border-red-500/50'
                                                        )}
                                                        placeholder={`Your ${config.name} post...`}
                                                    />
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <Hash className="h-3 w-3 text-muted-foreground" />
                                                            <span className="text-muted-foreground">
                                                                {post.hashtags.length} hashtags
                                                            </span>
                                                        </div>
                                                        <span className={cn(
                                                            'font-mono',
                                                            isOverLimit ? 'text-red-500' : 'text-muted-foreground'
                                                        )}>
                                                            {post.characterCount} / {PLATFORM_LIMITS[platform]}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Hashtags Preview */}
                                                {post.hashtags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {post.hashtags.slice(0, 10).map((tag, i) => (
                                                            <Badge
                                                                key={i}
                                                                variant="secondary"
                                                                className="text-xs px-2 py-0.5"
                                                            >
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                        {post.hashtags.length > 10 && (
                                                            <Badge variant="outline" className="text-xs">
                                                                +{post.hashtags.length - 10} more
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* Complete Button */}
                            <div className="flex justify-end pt-4 border-t border-white/5">
                                <Button
                                    onClick={handleComplete}
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                                >
                                    <Check className="h-4 w-4 mr-2" />
                                    Finish & Save Posts
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
