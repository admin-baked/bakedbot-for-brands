'use client';

/**
 * ChatMediaPreview - Renders inline media (images/videos) in Agent Chat
 * 
 * Used to display generated content from creative.generateImage and creative.generateVideo tools.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Image as ImageIcon, Video, ExternalLink, Loader2, Share2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Friday movie quotes for entertainment during loading
const FRIDAY_QUOTES = [
    "We ain't got no sugar.",
    "You got knocked the f*** out!",
    "Friday is the day you get paid.",
    "I know you don't smoke weed, I know this...",
    "Every time I come in the kitchen, you in the kitchen.",
    "Bye Felicia.",
    "Daaaaamn!",
    "It's Friday, you ain't got no job, and you ain't got sh*t to do.",
    "Don't nobody go in the bathroom for about 35, 45 minutes.",
    "You win some, you lose some, but you live to fight another day."
];

export interface MediaPreviewProps {
    type: 'image' | 'video';
    url: string;
    prompt?: string;
    duration?: number;
    model?: string;
    isLoading?: boolean;
    progress?: number; // 0-100 progress percentage for loading state
    className?: string;
}

export function ChatMediaPreview({
    type,
    url,
    prompt,
    duration,
    model,
    isLoading = false,
    progress,
    className
}: MediaPreviewProps) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);
    const [quote, setQuote] = useState('');

    // Select random quote on mount for loading state
    useEffect(() => {
        setQuote(FRIDAY_QUOTES[Math.floor(Math.random() * FRIDAY_QUOTES.length)]);
    }, []);

    // Cycle through quotes during loading
    useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setQuote(FRIDAY_QUOTES[Math.floor(Math.random() * FRIDAY_QUOTES.length)]);
            }, 4000);
            return () => clearInterval(interval);
        }
    }, [isLoading]);

    const handleDownload = async () => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `baked-${type}-${Date.now()}.${type === 'video' ? 'mp4' : 'png'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback: open in new tab
            window.open(url, '_blank');
        }
    };

    const handleShare = async () => {
        // Try native share API first (mobile)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'BakedBot Generated Media',
                    text: prompt || 'Check out this generated content!',
                    url: url,
                });
                return;
            } catch (err) {
                // User cancelled or share failed, fall back to copy
            }
        }

        // Fallback: Copy URL to clipboard
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast({
                title: 'Link copied!',
                description: 'Video URL copied to clipboard',
            });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    if (isLoading) {
        return (
            <Card className={cn("overflow-hidden", className)} data-testid="media-preview-loading">
                <CardContent className="p-0">
                    {/* Square aspect ratio container for loading */}
                    <div className="aspect-square max-w-[400px] bg-gradient-to-br from-violet-50 to-purple-100 flex flex-col items-center justify-center p-6">
                        {/* Progress Ring */}
                        <div className="relative mb-4">
                            <div className="w-20 h-20 rounded-full border-4 border-muted flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                            {progress !== undefined && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg font-bold text-primary" data-testid="progress-percentage">
                                        {progress}%
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Progress Bar */}
                        {progress !== undefined && (
                            <div className="w-full max-w-[200px] mb-3" data-testid="progress-bar">
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <p className="text-sm font-medium text-primary mb-1">
                            Generating {type}...
                        </p>

                        {/* Friday Quote */}
                        <p className="text-xs text-muted-foreground text-center max-w-[280px] italic" data-testid="friday-quote">
                            "{quote}"
                        </p>

                        {prompt && (
                            <p className="text-xs text-muted-foreground mt-3 max-w-xs text-center line-clamp-2 opacity-70">
                                {prompt}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("overflow-hidden group", className)} data-testid="media-preview">
            <CardContent className="p-0">
                {/* Square Media Display */}
                <div className="relative bg-black aspect-square max-w-[400px]">
                    {type === 'video' ? (
                        <video
                            src={url}
                            controls
                            playsInline
                            loop
                            preload="metadata"
                            crossOrigin="anonymous"
                            className="w-full h-full object-contain"
                            data-testid="video-player"
                        >
                            Your browser does not support video playback.
                        </video>
                    ) : (
                        <img
                            src={url}
                            alt={prompt || 'Generated image'}
                            className="w-full h-full object-contain"
                            data-testid="image-preview"
                        />
                    )}

                    {/* Overlay Actions */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                            size="icon" 
                            variant="secondary" 
                            className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
                            onClick={handleShare}
                            data-testid="share-button"
                            title="Share"
                        >
                            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />}
                        </Button>
                        <Button 
                            size="icon" 
                            variant="secondary" 
                            className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
                            onClick={handleDownload}
                            data-testid="download-button"
                            title="Download"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                            size="icon" 
                            variant="secondary" 
                            className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
                            onClick={() => window.open(url, '_blank')}
                            data-testid="open-button"
                            title="Open in new tab"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Type Badge */}
                    <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary" className="bg-white/90 gap-1">
                            {type === 'video' ? (
                                <>
                                    <Video className="h-3 w-3" />
                                    {duration && `${duration}s`}
                                </>
                            ) : (
                                <>
                                    <ImageIcon className="h-3 w-3" />
                                    Image
                                </>
                            )}
                        </Badge>
                    </div>

                    {/* Watermark */}
                    <img 
                        src="/images/watermark.png" 
                        alt="Watermark" 
                        className="absolute bottom-2 right-2 w-12 h-auto opacity-90 pointer-events-none drop-shadow-md"
                        data-testid="watermark"
                    />
                </div>

                {/* Caption / Prompt */}
                {(prompt || model) && (
                    <div className="p-3 border-t bg-muted/20">
                        {prompt && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                                {prompt}
                            </p>
                        )}
                        {model && (
                            <p className="text-[10px] text-muted-foreground/70 mt-1">
                                Generated with {model}
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Utility to detect if a tool response contains generated media
 */
export function extractMediaFromToolResponse(data: any): MediaPreviewProps | null {
    if (!data) return null;

    // Video response
    if (data.videoUrl) {
        return {
            type: 'video',
            url: data.videoUrl,
            prompt: data.prompt,
            duration: data.duration,
            model: data.model
        };
    }

    // Image response
    if (data.imageUrl) {
        return {
            type: 'image',
            url: data.imageUrl,
            prompt: data.prompt,
            model: data.model
        };
    }

    return null;
}
