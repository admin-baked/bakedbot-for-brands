'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Boxes,
    Check,
    Copy,
    Loader2,
    PackageSearch,
    Send,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { generateInboxWholesaleInventoryInsight } from '@/server/actions/inbox-wholesale';
import type {
    InboxWholesaleActionKind,
    InboxWholesaleInventoryInsight,
} from '@/types/inbox-wholesale';

interface WholesaleInventoryInlineProps {
    orgId: string;
    initialPrompt?: string;
    className?: string;
    onOpenAction?: (
        kind: InboxWholesaleActionKind,
        prompt: string,
        insight: InboxWholesaleInventoryInsight,
    ) => void;
}

function formatInsightForClipboard(insight: InboxWholesaleInventoryInsight): string {
    return [
        insight.title,
        insight.summary,
        '',
        `Total SKUs: ${insight.totalSkus}`,
        `Total Units: ${insight.totalUnits}`,
        `Low Stock Count: ${insight.lowStockCount}`,
        `Strong Availability Count: ${insight.strongAvailabilityCount}`,
        '',
        'Products',
        ...insight.products.map((product) => `- ${product.name}${product.sku ? ` (${product.sku})` : ''}: ${product.inventory} units`),
        '',
        'Next Actions',
        ...insight.actions.map((action) => `- ${action.label}: ${action.prompt}`),
    ].join('\n');
}

export function WholesaleInventoryInline({
    orgId,
    initialPrompt = '',
    className,
    onOpenAction,
}: WholesaleInventoryInlineProps) {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [insight, setInsight] = useState<InboxWholesaleInventoryInsight | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (initialPrompt) {
            setPrompt(initialPrompt);
        }
    }, [initialPrompt]);

    const handleLoadInventory = async () => {
        setIsLoading(true);
        try {
            const response = await generateInboxWholesaleInventoryInsight({
                orgId,
                prompt: prompt.trim() || undefined,
            });

            if (!response.success || !response.insight) {
                throw new Error(response.error || 'Wholesale inventory insight failed.');
            }

            setInsight(response.insight);
            setIsCopied(false);
            toast({
                title: 'Wholesale snapshot ready',
                description: 'Live LeafLink inventory is loaded for review.',
            });
        } catch (error) {
            toast({
                title: 'Unable to load wholesale inventory',
                description: error instanceof Error ? error.message : 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyBrief = async () => {
        if (!insight) return;
        await navigator.clipboard.writeText(formatInsightForClipboard(insight));
        setIsCopied(true);
        toast({
            title: 'Availability brief copied',
            description: 'The wholesale inventory snapshot is on your clipboard.',
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn('w-full my-2', className)}
        >
            <Card className="bg-card/50 backdrop-blur-sm border-white/10">
                <CardHeader className="border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500/20 to-cyan-500/20">
                            <PackageSearch className="h-5 w-5 text-sky-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI Wholesale Inventory</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Pull live LeafLink inventory, summarize availability, and prep buyer outreach
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="wholesale-prompt" className="text-sm font-semibold flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-sky-400" />
                                Buyer angle or notes
                            </Label>
                            <Textarea
                                id="wholesale-prompt"
                                value={prompt}
                                onChange={(event) => setPrompt(event.target.value)}
                                className="bg-background/50 border-white/10 min-h-[100px]"
                                placeholder="Optional: Focus on premium flower for retail buyers in Manhattan, or highlight fast-moving SKUs first."
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                                        handleLoadInventory();
                                    }
                                }}
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={handleLoadInventory}
                                disabled={isLoading}
                                className="bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <Boxes className="h-4 w-4 mr-2" />
                                        {insight ? 'Refresh Snapshot' : 'Load Inventory Snapshot'}
                                    </>
                                )}
                            </Button>

                            {insight && (
                                <Button variant="outline" onClick={handleCopyBrief}>
                                    {isCopied ? (
                                        <>
                                            <Check className="h-4 w-4 mr-2" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy Brief
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>

                    {insight && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                            <Card className="border-sky-500/20 bg-sky-500/5">
                                <CardContent className="space-y-4 pt-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h4 className="text-lg font-semibold text-sky-300">{insight.title}</h4>
                                            <p className="text-sm text-muted-foreground mt-1">{insight.summary}</p>
                                        </div>
                                        <Badge variant="outline" className="border-sky-500/30 text-sky-300">
                                            Live LeafLink
                                        </Badge>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-4">
                                        <div className="rounded-lg bg-background/40 p-3">
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">SKUs</div>
                                            <div className="mt-1 text-sm">{insight.totalSkus}</div>
                                        </div>
                                        <div className="rounded-lg bg-background/40 p-3">
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Units</div>
                                            <div className="mt-1 text-sm">{insight.totalUnits}</div>
                                        </div>
                                        <div className="rounded-lg bg-background/40 p-3">
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Low Stock</div>
                                            <div className="mt-1 text-sm">{insight.lowStockCount}</div>
                                        </div>
                                        <div className="rounded-lg bg-background/40 p-3">
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Deep Stock</div>
                                            <div className="mt-1 text-sm">{insight.strongAvailabilityCount}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-3">
                                <div className="text-sm font-semibold">Available SKUs</div>
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {insight.products.slice(0, 12).map((product) => (
                                        <Card key={product.id} className="border-white/10 bg-background/30">
                                            <CardContent className="space-y-3 pt-4">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="font-medium text-sm">{product.name}</div>
                                                        {product.brand && (
                                                            <div className="text-xs text-muted-foreground">{product.brand}</div>
                                                        )}
                                                    </div>
                                                    <Badge
                                                        variant="secondary"
                                                        className={cn(
                                                            product.stockStatus === 'strong' && 'bg-emerald-500/15 text-emerald-300',
                                                            product.stockStatus === 'low' && 'bg-amber-500/15 text-amber-300',
                                                        )}
                                                    >
                                                        {product.stockStatus}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-muted-foreground space-y-1">
                                                    {product.sku && <div>SKU: {product.sku}</div>}
                                                    <div>{product.inventory} units available</div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="text-sm font-semibold">Next Step</div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    {insight.actions.map((action) => (
                                        <Card key={action.label} className="border-white/10 bg-background/30">
                                            <CardContent className="space-y-3 pt-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="rounded-md bg-primary/10 p-2">
                                                        <Send className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="font-medium text-sm">{action.label}</div>
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-5">{action.prompt}</p>
                                                <Button
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={() => onOpenAction?.(action.kind, action.prompt, insight)}
                                                >
                                                    Open Workflow
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
