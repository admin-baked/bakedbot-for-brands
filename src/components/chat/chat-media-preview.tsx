'use client';

/**
 * ChatMediaPreview - Renders inline media (images/videos) in Agent Chat
 * 
 * Used to display generated content from creative.generateImage and creative.generateVideo tools.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Image as ImageIcon, Video, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MediaPreviewProps {
    type: 'image' | 'video';
    url: string;
    prompt?: string;
    duration?: number;
    model?: string;
    isLoading?: boolean;
    className?: string;
}

export function ChatMediaPreview({
    type,
    url,
    prompt,
    duration,
    model,
    isLoading = false,
    className
}: MediaPreviewProps) {
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

    if (isLoading) {
        return (
            <Card className={cn("overflow-hidden", className)} data-testid="media-preview-loading">
                <CardContent className="p-4 flex flex-col items-center justify-center min-h-[200px] bg-muted/30">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">
                        Generating {type}...
                    </p>
                    {prompt && (
                        <p className="text-xs text-muted-foreground mt-2 max-w-xs text-center line-clamp-2">
                            "{prompt}"
                        </p>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("overflow-hidden group", className)} data-testid="media-preview">
            <CardContent className="p-0">
                {/* Media Display */}
                <div className="relative bg-black/5">
                    {type === 'video' ? (
                        <video
                            src={url}
                            controls
                            playsInline
                            loop
                            preload="metadata"
                            crossOrigin="anonymous"
                            className="w-full max-h-[400px] object-contain"
                            data-testid="video-player"
                        >
                            Your browser does not support video playback.
                        </video>
                    ) : (
                        <img
                            src={url}
                            alt={prompt || 'Generated image'}
                            className="w-full max-h-[400px] object-contain"
                            data-testid="image-preview"
                        />
                    )}

                    {/* Overlay Actions */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                            size="icon" 
                            variant="secondary" 
                            className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
                            onClick={handleDownload}
                            data-testid="download-button"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                            size="icon" 
                            variant="secondary" 
                            className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
                            onClick={() => window.open(url, '_blank')}
                            data-testid="open-button"
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
