'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, RefreshCw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreativeContent } from '@/types/creative-content';

interface ImageVariationsProps {
    /** Main content with variations */
    content: CreativeContent;

    /** Array of variation content objects */
    variations?: CreativeContent[];

    /** Callback when variation is selected */
    onSelectVariation?: (variationId: string) => void;

    /** Currently selected variation ID */
    selectedVariationId?: string;

    /** Whether generating new variations */
    isGenerating?: boolean;

    /** Callback to regenerate variations */
    onRegenerate?: () => void;

    /** Max number of variations to display */
    maxVariations?: number;
}

/**
 * Display and select from multiple AI-generated image variations
 */
export function ImageVariations({
    content,
    variations = [],
    onSelectVariation,
    selectedVariationId,
    isGenerating = false,
    onRegenerate,
    maxVariations = 4,
}: ImageVariationsProps) {
    const [selectedId, setSelectedId] = useState(selectedVariationId || content.id);

    // Combine main content with variations
    const allVariations = [content, ...variations].slice(0, maxVariations + 1);

    const handleSelect = (id: string) => {
        setSelectedId(id);
        onSelectVariation?.(id);
    };

    const handleDownload = async (imageUrl: string, variationIndex: number) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `${content.platform}-variation-${variationIndex + 1}.png`;
            link.click();

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download image:', error);
        }
    };

    if (!variations.length && !isGenerating) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Image Variations
                        {onRegenerate && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRegenerate}
                                className="gap-1"
                            >
                                <RefreshCw className="h-3 w-3" />
                                Generate
                            </Button>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Generate multiple variations and choose the best one for your campaign
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    Image Variations
                    {onRegenerate && !isGenerating && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRegenerate}
                            className="gap-1"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Regenerate
                        </Button>
                    )}
                </CardTitle>
                <CardDescription>
                    Select the variation that best fits your brand ({allVariations.length} options)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {allVariations.map((variant, index) => {
                        const isSelected = variant.id === selectedId;
                        const imageUrl = variant.thumbnailUrl || variant.mediaUrls[0];

                        return (
                            <div
                                key={variant.id}
                                className={cn(
                                    'relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all',
                                    isSelected
                                        ? 'border-green-600 ring-2 ring-green-600 ring-offset-2'
                                        : 'border-slate-200 hover:border-slate-400'
                                )}
                                onClick={() => handleSelect(variant.id)}
                            >
                                {/* Image */}
                                <div className="aspect-square bg-slate-100 relative">
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={`Variation ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
                                        </div>
                                    )}

                                    {/* Selected Badge */}
                                    {isSelected && (
                                        <div className="absolute top-2 right-2">
                                            <Badge className="bg-green-600 gap-1">
                                                <Check className="h-3 w-3" />
                                                Selected
                                            </Badge>
                                        </div>
                                    )}

                                    {/* Original Badge */}
                                    {index === 0 && (
                                        <div className="absolute top-2 left-2">
                                            <Badge variant="secondary">Original</Badge>
                                        </div>
                                    )}

                                    {/* Hover Actions */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownload(imageUrl, index);
                                            }}
                                            className="gap-1"
                                        >
                                            <Download className="h-3 w-3" />
                                            Download
                                        </Button>
                                    </div>
                                </div>

                                {/* Variation Number */}
                                <div className="p-2 text-center bg-white">
                                    <span className="text-xs font-medium text-slate-600">
                                        Variation {index + 1}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {/* Loading Placeholders */}
                    {isGenerating &&
                        Array.from({ length: maxVariations - allVariations.length + 1 }).map((_, i) => (
                            <div
                                key={`loading-${i}`}
                                className="relative rounded-lg overflow-hidden border-2 border-dashed border-slate-300"
                            >
                                <div className="aspect-square bg-slate-50 flex items-center justify-center">
                                    <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
                                </div>
                                <div className="p-2 text-center bg-white">
                                    <span className="text-xs text-slate-400">Generating...</span>
                                </div>
                            </div>
                        ))}
                </div>

                {/* Selected Variation Info */}
                {selectedId !== content.id && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm text-green-700 dark:text-green-300">
                            ✓ You've selected a variation. This will be used when publishing.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
