'use client';

/**
 * Video Embed Component
 *
 * YouTube/Vimeo URL input that extracts embed ID and stores video metadata.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Video, X, Plus } from 'lucide-react';
import type { BlogVideoEmbed } from '@/types/blog';

interface VideoEmbedProps {
    embed: BlogVideoEmbed | null;
    onEmbedChange: (embed: BlogVideoEmbed | null) => void;
}

function parseVideoUrl(url: string): BlogVideoEmbed | null {
    // YouTube patterns
    const ytMatch = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch) {
        return { platform: 'youtube', videoId: ytMatch[1], url };
    }

    // Vimeo patterns
    const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
    if (vimeoMatch) {
        return { platform: 'vimeo', videoId: vimeoMatch[1], url };
    }

    return null;
}

export function VideoEmbed({ embed, onEmbedChange }: VideoEmbedProps) {
    const [showInput, setShowInput] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [error, setError] = useState('');

    const handleAdd = () => {
        if (!urlInput.trim()) return;

        const parsed = parseVideoUrl(urlInput.trim());
        if (!parsed) {
            setError('Invalid YouTube or Vimeo URL');
            return;
        }

        onEmbedChange(parsed);
        setUrlInput('');
        setShowInput(false);
        setError('');
    };

    const handleRemove = () => {
        onEmbedChange(null);
    };

    if (embed) {
        return (
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium flex items-center gap-1">
                            <Video className="w-4 h-4" />
                            {embed.platform === 'youtube' ? 'YouTube' : 'Vimeo'} Video
                        </Label>
                        <Button variant="ghost" size="sm" onClick={handleRemove} className="h-6 w-6 p-0">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                        {embed.platform === 'youtube' && (
                            <iframe
                                src={`https://www.youtube.com/embed/${embed.videoId}`}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title="Video preview"
                            />
                        )}
                        {embed.platform === 'vimeo' && (
                            <iframe
                                src={`https://player.vimeo.com/video/${embed.videoId}`}
                                className="w-full h-full"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                                title="Video preview"
                            />
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!showInput) {
        return (
            <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowInput(true)}
            >
                <Plus className="w-4 h-4 mr-1" />
                Add Video
            </Button>
        );
    }

    return (
        <Card>
            <CardContent className="p-4">
                <Label className="text-sm font-medium flex items-center gap-1 mb-2">
                    <Video className="w-4 h-4" />
                    Embed Video
                </Label>
                <div className="flex gap-2">
                    <Input
                        value={urlInput}
                        onChange={(e) => { setUrlInput(e.target.value); setError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        placeholder="Paste YouTube or Vimeo URL..."
                        className="h-8 text-sm"
                    />
                    <Button size="sm" onClick={handleAdd} className="h-8">
                        Add
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowInput(false); setError(''); }} className="h-8">
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                    Supports YouTube and Vimeo URLs
                </p>
            </CardContent>
        </Card>
    );
}
