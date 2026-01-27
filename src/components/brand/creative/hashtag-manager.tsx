'use client';

import { useState, KeyboardEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Hash, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SocialPlatform } from '@/types/creative-content';

interface HashtagManagerProps {
    /** Current hashtags */
    hashtags: string[];

    /** Callback when hashtags change */
    onChange: (hashtags: string[]) => void;

    /** Platform for suggestions */
    platform?: SocialPlatform;

    /** Max hashtags allowed */
    maxHashtags?: number;

    /** Show trending suggestions */
    showSuggestions?: boolean;

    /** Read-only mode */
    readonly?: boolean;

    /** Custom class name */
    className?: string;
}

// Platform-specific recommended hashtags
const PLATFORM_SUGGESTIONS: Record<SocialPlatform, string[]> = {
    instagram: [
        '#cannabis',
        '#weedstagram',
        '#420',
        '#cannabiscommunity',
        '#stonernation',
        '#weed',
        '#marijuana',
        '#cannabisculture',
        '#thc',
        '#cbd',
        '#dispensary',
        '#medicalmarijuana',
    ],
    tiktok: [
        '#cannabis',
        '#cannatok',
        '#420tok',
        '#weedtok',
        '#cannabiscommunity',
        '#weed',
        '#marijuana',
        '#420',
        '#stoner',
        '#cannabisculture',
    ],
    linkedin: [
        '#cannabisindustry',
        '#cannabisbusiness',
        '#greenrush',
        '#cannabis',
        '#hemp',
        '#cbd',
        '#marijuana',
        '#cannabistech',
        '#cannabisentrepreneur',
    ],
    twitter: [
        '#cannabis',
        '#marijuana',
        '#weed',
        '#420',
        '#MedicalCannabis',
        '#Legalization',
        '#cannabiscommunity',
        '#cbd',
    ],
    facebook: [
        '#cannabis',
        '#LocalDispensary',
        '#ShopLocal',
        '#cannabiscommunity',
        '#weed',
        '#marijuana',
        '#420',
        '#cbd',
    ],
};

/**
 * Hashtag management component for creative content
 */
export function HashtagManager({
    hashtags = [],
    onChange,
    platform = 'instagram',
    maxHashtags = 30,
    showSuggestions = true,
    readonly = false,
    className,
}: HashtagManagerProps) {
    const [input, setInput] = useState('');
    const [showAllSuggestions, setShowAllSuggestions] = useState(false);

    // Normalize hashtag (add # prefix, lowercase, remove spaces)
    const normalizeHashtag = (tag: string): string => {
        let normalized = tag.trim().toLowerCase();
        if (!normalized.startsWith('#')) {
            normalized = '#' + normalized;
        }
        // Remove spaces and special characters except underscore
        normalized = normalized.replace(/[^\w#]/g, '');
        return normalized;
    };

    // Add hashtag
    const addHashtag = (tag: string) => {
        if (readonly) return;

        const normalized = normalizeHashtag(tag);

        // Validate
        if (!normalized || normalized === '#') return;
        if (hashtags.includes(normalized)) return;
        if (hashtags.length >= maxHashtags) return;

        onChange([...hashtags, normalized]);
        setInput('');
    };

    // Remove hashtag
    const removeHashtag = (tag: string) => {
        if (readonly) return;
        onChange(hashtags.filter((h) => h !== tag));
    };

    // Handle input key press
    const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addHashtag(input);
        } else if (e.key === 'Backspace' && input === '' && hashtags.length > 0) {
            // Remove last hashtag on backspace when input is empty
            removeHashtag(hashtags[hashtags.length - 1]);
        }
    };

    // Get available suggestions (not already added)
    const suggestions = PLATFORM_SUGGESTIONS[platform].filter(
        (tag) => !hashtags.includes(tag)
    );

    const displaySuggestions = showAllSuggestions ? suggestions : suggestions.slice(0, 6);
    const hasMoreSuggestions = suggestions.length > 6 && !showAllSuggestions;

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    Hashtag Manager
                </CardTitle>
                <CardDescription>
                    Add up to {maxHashtags} hashtags to increase reach ({hashtags.length}/{maxHashtags} used)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Current Hashtags */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Current Hashtags</label>
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-lg bg-slate-50 dark:bg-slate-950">
                        {hashtags.length === 0 ? (
                            <span className="text-sm text-muted-foreground">
                                No hashtags added yet
                            </span>
                        ) : (
                            hashtags.map((tag) => (
                                <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="gap-1 pr-1"
                                >
                                    {tag}
                                    {!readonly && (
                                        <button
                                            onClick={() => removeHashtag(tag)}
                                            className="ml-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-0.5 transition"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </Badge>
                            ))
                        )}
                    </div>
                </div>

                {/* Input */}
                {!readonly && (
                    <div className="flex gap-2">
                        <Input
                            placeholder="Add hashtag (e.g., cannabis)"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            disabled={hashtags.length >= maxHashtags}
                            className="flex-1"
                        />
                        <Button
                            size="sm"
                            onClick={() => addHashtag(input)}
                            disabled={!input || hashtags.length >= maxHashtags}
                            className="gap-1"
                        >
                            <Plus className="h-4 w-4" />
                            Add
                        </Button>
                    </div>
                )}

                {/* Platform-Specific Suggestions */}
                {showSuggestions && suggestions.length > 0 && !readonly && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span>Trending for {platform}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {displaySuggestions.map((tag) => (
                                <Badge
                                    key={tag}
                                    variant="outline"
                                    className="cursor-pointer hover:bg-green-50 hover:border-green-600 transition"
                                    onClick={() => addHashtag(tag)}
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    {tag}
                                </Badge>
                            ))}
                            {hasMoreSuggestions && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAllSuggestions(true)}
                                    className="h-6 text-xs"
                                >
                                    Show {suggestions.length - 6} more
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* AI Suggestion Button (placeholder for future feature) */}
                {!readonly && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        disabled
                    >
                        <Sparkles className="h-4 w-4" />
                        Generate AI Hashtags (Coming Soon)
                    </Button>
                )}

                {/* Character Count Warning */}
                {hashtags.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                        Total characters: {hashtags.join(' ').length}
                        {platform === 'instagram' && hashtags.join(' ').length > 2200 && (
                            <span className="text-red-600 ml-2">
                                ⚠️ Exceeds Instagram's 2,200 character limit
                            </span>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
