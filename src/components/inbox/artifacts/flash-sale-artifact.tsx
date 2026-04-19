'use client';

import React, { useState } from 'react';
import { Tag, Package, TrendingDown, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { approveAndPublishArtifact } from '@/server/actions/inbox';
import type { InboxArtifact } from '@/types/inbox';

interface SlowMoverProduct {
    productId?: string;
    name: string;
    category: string;
    price: number;
    stockLevel: number;
    daysInInventory: number;
    valueAtRisk: number;
    costBasis?: number | null;
}

interface FlashSaleData {
    topProducts?: SlowMoverProduct[];
    products?: SlowMoverProduct[];
    totalValueAtRisk?: number;
    totalSkus?: number;
}

interface Props {
    artifact: InboxArtifact;
    className?: string;
}

function recommendedDiscount(daysInInventory: number): number {
    if (daysInInventory >= 90) return 30;
    if (daysInInventory >= 60) return 20;
    if (daysInInventory >= 30) return 15;
    return 10;
}

export function FlashSaleArtifact({ artifact, className }: Props) {
    const data = artifact.data as FlashSaleData;
    const products = (data.topProducts ?? data.products ?? []) as SlowMoverProduct[];
    const totalValue = data.totalValueAtRisk ?? products.reduce((s, p) => s + (p.valueAtRisk ?? 0), 0);
    const [isApproving, setIsApproving] = useState(false);
    const [approved, setApproved] = useState(false);

    const handleApprove = async () => {
        setIsApproving(true);
        try {
            await approveAndPublishArtifact(artifact.id);
            setApproved(true);
        } finally {
            setIsApproving(false);
        }
    };

    if (approved) {
        return (
            <div className={cn('flex flex-col items-center justify-center gap-3 py-8 text-center', className)}>
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <p className="font-semibold text-foreground">Flash Sale Approved</p>
                <p className="text-sm text-muted-foreground">Discounts queued for POS. Elroy will confirm in Slack.</p>
            </div>
        );
    }

    return (
        <div className={cn('space-y-4', className)}>
            {/* Summary */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20 p-3">
                <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        ${Math.round(totalValue).toLocaleString()} retail value at risk
                    </span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                    {data.totalSkus ?? products.length} slow-moving SKUs. Recommended discounts below — approve to apply in POS.
                </p>
            </div>

            {/* Product list */}
            <div className="space-y-2">
                {products.map((p, i) => {
                    const discount = recommendedDiscount(p.daysInInventory);
                    const discountedPrice = p.price * (1 - discount / 100);
                    return (
                        <div key={p.productId ?? i} className="rounded-lg border bg-card p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{p.name}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">{p.category}</Badge>
                                        <span className="text-[11px] text-muted-foreground">{p.daysInInventory}d stale · {p.stockLevel} units</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="flex items-center gap-1 justify-end">
                                        <span className="text-xs text-muted-foreground line-through">${p.price.toFixed(2)}</span>
                                        <span className="text-sm font-bold text-emerald-600">${discountedPrice.toFixed(2)}</span>
                                    </div>
                                    <Badge className="text-[10px] h-4 px-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200">
                                        -{discount}%
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
                <Button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="sm"
                >
                    <Tag className="h-3.5 w-3.5 mr-1.5" />
                    {isApproving ? 'Approving…' : 'Approve Flash Sale'}
                </Button>
                <Button variant="outline" size="sm" className="text-muted-foreground">
                    <X className="h-3.5 w-3.5 mr-1" />
                    Dismiss
                </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
                Approving sends discounts to Alleaves POS and notifies via Slack.
            </p>
        </div>
    );
}
