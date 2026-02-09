'use client';

/**
 * Vibe Preview Client Component
 *
 * Displays a shared vibe and encourages visitors to create their own.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Sparkles,
    ArrowRight,
    Copy,
    Check,
    Twitter,
    Linkedin,
    Share2,
    Palette,
    Type,
    Layout,
    Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { trackVibeShare, type PublicVibe } from '../../actions';

interface Props {
    vibe: PublicVibe;
}

export function VibePreviewClient({ vibe }: Props) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${vibe.previewUrl}`
        : vibe.previewUrl;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: 'Link copied!' });
        await trackVibeShare(vibe.id, 'copy');
    };

    const handleShare = async (platform: 'twitter' | 'linkedin') => {
        const shareText = `Check out this AI-generated dispensary menu design! Made with BakedBot Vibe Studio.`;

        if (platform === 'twitter') {
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
        } else if (platform === 'linkedin') {
            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
        }

        await trackVibeShare(vibe.id, platform);
    };

    const colors = vibe.config.theme?.colors;
    const typography = vibe.config.theme?.typography;
    const components = vibe.config.components;
    const animations = vibe.config.animations;

    return (
        <div className="container mx-auto px-4 py-12 max-w-5xl">
            {/* Header */}
            <div className="text-center mb-12">
                <Badge variant="secondary" className="mb-4 gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI-Generated Design
                </Badge>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                    {vibe.config.name || 'Custom Vibe'}
                </h1>
                <p className="text-muted-foreground max-w-xl mx-auto">
                    {vibe.config.description || vibe.prompt}
                </p>

                {/* Share buttons */}
                <div className="flex items-center justify-center gap-2 mt-6">
                    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? 'Copied!' : 'Copy Link'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleShare('twitter')} className="gap-2">
                        <Twitter className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleShare('linkedin')} className="gap-2">
                        <Linkedin className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Color Palette - Hero Display */}
            {colors && (
                <Card className="mb-8 overflow-hidden">
                    <div
                        className="h-32 flex items-end p-6"
                        style={{
                            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                        }}
                    >
                        <h2 className="text-white text-2xl font-bold drop-shadow-lg">
                            Color Palette
                        </h2>
                    </div>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                            {Object.entries(colors).slice(0, 6).map(([name, color]) => (
                                <div key={name} className="text-center">
                                    <div
                                        className="w-full aspect-square rounded-lg shadow-md border mb-2"
                                        style={{ backgroundColor: color }}
                                    />
                                    <p className="text-xs font-medium capitalize">{name}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{color}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Details Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
                {/* Typography */}
                {typography && (
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Type className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold">Typography</h3>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Headings</p>
                                    <p className="text-lg font-semibold">{typography.headingFont}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Body</p>
                                    <p className="text-lg">{typography.bodyFont}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Components */}
                {components && (
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Layout className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold">Components</h3>
                            </div>
                            <div className="space-y-2">
                                {Object.entries(components).slice(0, 4).map(([key, value]) => (
                                    <div key={key} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground capitalize">{key}</span>
                                        <Badge variant="outline" className="text-xs">{value}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Animations */}
                {animations && (
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Zap className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold">Effects</h3>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Transitions</span>
                                    <Badge variant="outline" className="text-xs">{animations.pageTransition}</Badge>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Hover</span>
                                    <Badge variant="outline" className="text-xs">{animations.hoverEffects}</Badge>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Scroll Effects</span>
                                    <Badge variant="outline" className="text-xs">{animations.scrollEffects ? 'Yes' : 'No'}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* AI Reasoning */}
            {vibe.reasoning && (
                <Card className="mb-12 bg-muted/50">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                            <div>
                                <h3 className="font-semibold mb-1">Why These Choices?</h3>
                                <p className="text-muted-foreground">{vibe.reasoning}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* CTA Section */}
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
                <CardContent className="p-8 md:p-12">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl md:text-3xl font-bold mb-3">
                                Create Your Own Vibe
                            </h2>
                            <p className="text-muted-foreground text-lg mb-6">
                                Design a stunning menu for your dispensary in 30 seconds.
                                No signup required.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                                <Button size="lg" asChild className="gap-2">
                                    <Link href="/vibe">
                                        <Palette className="h-5 w-5" />
                                        Create My Vibe
                                    </Link>
                                </Button>
                                <Button size="lg" variant="outline" asChild className="gap-2">
                                    <Link href="/signup">
                                        Start Free Trial
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                        <div className="hidden md:block">
                            <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <Sparkles className="h-20 w-20 text-primary/50" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="text-center mt-8 text-sm text-muted-foreground">
                <p>
                    This vibe has been viewed <span className="font-medium text-foreground">{vibe.views}</span> times
                    {vibe.shares > 0 && (
                        <> and shared <span className="font-medium text-foreground">{vibe.shares}</span> times</>
                    )}
                </p>
            </div>

            {/* Made with BakedBot badge */}
            <div className="text-center mt-12 pt-8 border-t">
                <Link href="/vibe" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <div className="w-5 h-5 rounded bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm">Made with BakedBot Vibe Studio</span>
                </Link>
            </div>
        </div>
    );
}
