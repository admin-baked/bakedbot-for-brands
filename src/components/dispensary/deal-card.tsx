'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { BundleDeal } from '@/types/bundles';
import { ArrowRight, Sparkles } from 'lucide-react';

interface DealCardProps {
    deal: BundleDeal;
    onViewDeal: (deal: BundleDeal) => void;
}

export function DealCard({ deal, onViewDeal }: DealCardProps) {
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-all group border-primary/20">
            <div className="aspect-[2/1] relative bg-muted">
                {deal.imageUrl ? (
                    <Image
                        src={deal.imageUrl}
                        alt={deal.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <Sparkles className="h-12 w-12 text-primary/40" />
                    </div>
                )}

                {deal.badgeText && (
                    <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground font-bold px-3 py-1 text-sm shadow-md animate-in fade-in zoom-in duration-300">
                        {deal.badgeText}
                    </Badge>
                )}
            </div>

            <CardHeader className="space-y-1">
                <h3 className="font-bold text-2xl tracking-tight leading-none text-primary">
                    {deal.name}
                </h3>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {deal.type.replace('_', ' ')} Bundle
                </p>
            </CardHeader>

            <CardContent>
                <p className="text-muted-foreground line-clamp-2 min-h-[40px]">
                    {deal.description}
                </p>

                <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-foreground">
                        ${deal.bundlePrice.toFixed(2)}
                    </span>
                    {deal.originalTotal > deal.bundlePrice && (
                        <span className="text-sm text-muted-foreground line-through decoration-destructive/50">
                            ${deal.originalTotal.toFixed(2)}
                        </span>
                    )}
                </div>
            </CardContent>

            <CardFooter>
                <Button
                    className="w-full font-bold group"
                    size="lg"
                    onClick={() => onViewDeal(deal)}
                >
                    Unlock Deal
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </CardFooter>
        </Card>
    );
}
