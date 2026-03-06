'use client';

import React from 'react';
import { Palette, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreativeContent } from '@/types/creative-content';

interface CreativeMediaPreviewProps {
    content: CreativeContent;
    className?: string;
}

export function CreativeMediaPreview({ content, className }: CreativeMediaPreviewProps) {
    const mediaUrl = content.thumbnailUrl || content.mediaUrls?.[0];
    const wrapperClassName = cn(
        'overflow-hidden rounded-lg bg-muted',
        content.mediaType === 'video' ? 'aspect-video' : 'aspect-square',
        className,
    );

    if (!mediaUrl) {
        return (
            <div className={cn(wrapperClassName, 'flex items-center justify-center')}>
                {content.mediaType === 'video' ? (
                    <Video className="h-8 w-8 text-muted-foreground/50" />
                ) : (
                    <Palette className="h-8 w-8 text-muted-foreground/50" />
                )}
            </div>
        );
    }

    if (content.mediaType === 'video') {
        return (
            <div className={wrapperClassName}>
                <video
                    src={mediaUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                >
                    Your browser does not support video playback.
                </video>
            </div>
        );
    }

    return (
        <div className={wrapperClassName}>
            <img
                src={mediaUrl}
                alt={content.caption || content.generationPrompt || 'Creative preview'}
                className="h-full w-full object-cover"
            />
        </div>
    );
}
