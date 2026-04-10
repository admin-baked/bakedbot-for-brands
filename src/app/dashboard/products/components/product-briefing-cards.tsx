'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, ImageOff, Sparkles, TrendingDown } from 'lucide-react';
import { calculateProductScore } from '@/lib/scoring';
import type { Product } from '@/types/domain';

interface ProductBriefingCardsProps {
    products: Product[];
    onFilterTable?: (filter: string) => void;
}

interface BriefingCard {
    id: string;
    icon: React.ReactNode;
    title: string;
    count: number;
    total: number;
    description: string;
    actionLabel: string;
    color: string;
    bgColor: string;
    borderColor: string;
}

export function ProductBriefingCards({ products, onFilterTable }: ProductBriefingCardsProps) {
    const cards = useMemo(() => {
        if (products.length === 0) return [];

        const missingCogs = products.filter(p => p.cost === undefined || p.cost === null);
        const missingImages = products.filter(p => !p.imageUrl);
        const missingDescriptions = products.filter(p => !p.description || p.description.length < 20);

        // Score each product once, reuse for filtering + avg calculation
        const scores = products.map(p => ({ product: p, score: calculateProductScore(p).total }));
        const lowScoreEntries = scores.filter(s => s.score < 70);

        const result: BriefingCard[] = [];

        if (missingCogs.length > 0) {
            result.push({
                id: 'missing-cogs',
                icon: <DollarSign className="h-5 w-5" />,
                title: 'Margin Blind Spots',
                count: missingCogs.length,
                total: products.length,
                description: `${missingCogs.length} product${missingCogs.length === 1 ? '' : 's'} missing COGS — margins unknown. Risk of over-discounting.`,
                actionLabel: 'Set COGS',
                color: 'text-amber-700',
                bgColor: 'bg-amber-50',
                borderColor: 'border-amber-200',
            });
        }

        if (missingImages.length > 0) {
            result.push({
                id: 'missing-images',
                icon: <ImageOff className="h-5 w-5" />,
                title: 'Missing Photos',
                count: missingImages.length,
                total: products.length,
                description: `${missingImages.length} product${missingImages.length === 1 ? '' : 's'} without photos — hurts menu conversion and SEO.`,
                actionLabel: 'View Products',
                color: 'text-red-700',
                bgColor: 'bg-red-50',
                borderColor: 'border-red-200',
            });
        }

        if (missingDescriptions.length > 0) {
            result.push({
                id: 'missing-descriptions',
                icon: <Sparkles className="h-5 w-5" />,
                title: 'Needs Descriptions',
                count: missingDescriptions.length,
                total: products.length,
                description: `${missingDescriptions.length} product${missingDescriptions.length === 1 ? '' : 's'} with weak or missing descriptions. AI can write them.`,
                actionLabel: 'AI Describe',
                color: 'text-violet-700',
                bgColor: 'bg-violet-50',
                borderColor: 'border-violet-200',
            });
        }

        if (lowScoreEntries.length > 0) {
            const avgScore = Math.round(
                lowScoreEntries.reduce((sum, s) => sum + s.score, 0) / lowScoreEntries.length
            );
            result.push({
                id: 'low-scores',
                icon: <TrendingDown className="h-5 w-5" />,
                title: 'Low Product Scores',
                count: lowScoreEntries.length,
                total: products.length,
                description: `${lowScoreEntries.length} product${lowScoreEntries.length === 1 ? '' : 's'} scoring below 70 (avg ${avgScore}). Add images, descriptions, and terpenes.`,
                actionLabel: 'Boost Scores',
                color: 'text-orange-700',
                bgColor: 'bg-orange-50',
                borderColor: 'border-orange-200',
            });
        }

        return result;
    }, [products]);

    if (cards.length === 0) return null;

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
                <Card key={card.id} className={`${card.borderColor} ${card.bgColor}`}>
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className={`rounded-lg p-2 ${card.bgColor} ${card.color}`}>
                                {card.icon}
                            </div>
                            <span className={`text-2xl font-bold ${card.color}`}>
                                {card.count}
                            </span>
                        </div>
                        <h3 className={`mt-2 text-sm font-semibold ${card.color}`}>
                            {card.title}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {card.description}
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 w-full text-xs"
                            onClick={() => onFilterTable?.(card.id)}
                        >
                            {card.actionLabel}
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
