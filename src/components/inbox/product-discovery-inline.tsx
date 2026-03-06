'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Check,
    Copy,
    Loader2,
    Package,
    Search,
    Sparkles,
    Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { generateInboxProductDiscoveryInsight } from '@/server/actions/inbox-product-discovery';
import type {
    InboxProductDiscoveryActionKind,
    InboxProductDiscoveryInsight,
    InboxProductDiscoveryMode,
} from '@/types/inbox-product-discovery';

interface ProductDiscoveryInlineProps {
    orgId: string;
    initialPrompt?: string;
    className?: string;
    onOpenAction?: (
        kind: InboxProductDiscoveryActionKind,
        prompt: string,
        insight: InboxProductDiscoveryInsight,
    ) => void;
}

const MODE_OPTIONS: Array<{ value: InboxProductDiscoveryMode; label: string }> = [
    { value: 'recommend_products', label: 'Product Recommendations' },
    { value: 'bundle_ideas', label: 'Bundle Ideas' },
];

function inferModeFromPrompt(prompt: string): InboxProductDiscoveryMode {
    const lower = prompt.toLowerCase();
    const bundleTerms = [
        'bundle',
        'pairing',
        'pair products',
        'entourage',
        'sampler',
        'mix and match',
        'mix & match',
    ];
    return bundleTerms.some((term) => lower.includes(term)) ? 'bundle_ideas' : 'recommend_products';
}

function formatInsightForClipboard(insight: InboxProductDiscoveryInsight): string {
    const lines = [
        insight.title,
        insight.summary,
        '',
    ];

    if (insight.recommendedProducts?.length) {
        lines.push('Recommended Products');
        for (const product of insight.recommendedProducts) {
            lines.push(`- ${product.productName}: ${product.reasoning}`);
        }
        lines.push('');
    }

    if (insight.bundleIdeas?.length) {
        lines.push('Bundle Ideas');
        for (const idea of insight.bundleIdeas) {
            const productNames = idea.products.map((product) => product.name).join(', ');
            lines.push(`- ${idea.name}: ${idea.description}`);
            lines.push(`  Products: ${productNames}`);
            lines.push(`  Target savings: ${idea.savingsPercent}%`);
        }
        lines.push('');
    }

    if (insight.actions?.length) {
        lines.push('Next Actions');
        for (const action of insight.actions) {
            lines.push(`- ${action.label}: ${action.prompt}`);
        }
    }

    return lines.join('\n');
}

export function ProductDiscoveryInline({
    orgId,
    initialPrompt = '',
    className,
    onOpenAction,
}: ProductDiscoveryInlineProps) {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [mode, setMode] = useState<InboxProductDiscoveryMode>(() => inferModeFromPrompt(initialPrompt));
    const [customerHistory, setCustomerHistory] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [insight, setInsight] = useState<InboxProductDiscoveryInsight | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (initialPrompt) {
            setPrompt(initialPrompt);
            setMode(inferModeFromPrompt(initialPrompt));
        }
    }, [initialPrompt]);

    const handleGenerate = async () => {
        if (mode === 'recommend_products' && !prompt.trim()) {
            toast({
                title: 'Prompt required',
                description: 'Describe what kind of product you want to find.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await generateInboxProductDiscoveryInsight({
                orgId,
                mode,
                prompt: prompt.trim() || undefined,
                customerHistory: customerHistory.trim() || undefined,
            });

            if (!response.success || !response.insight) {
                throw new Error(response.error || 'Product discovery insight failed.');
            }

            setInsight(response.insight);
            setIsCopied(false);
            toast({
                title: mode === 'recommend_products' ? 'Recommendations ready' : 'Bundle ideas ready',
                description: mode === 'recommend_products'
                    ? 'Review the grounded product matches below.'
                    : 'Review the grounded bundle concepts or open the bundle builder.',
            });
        } catch (error) {
            toast({
                title: 'Unable to load product discovery insight',
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
            title: 'Brief copied',
            description: 'The product discovery brief is on your clipboard.',
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
                        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-lime-500/20">
                            <Search className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI Product Discovery</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Find grounded product matches or turn current catalog signals into bundle ideas
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-emerald-400" />
                                Mode
                            </Label>
                            <Select value={mode} onValueChange={(value) => setMode(value as InboxProductDiscoveryMode)}>
                                <SelectTrigger className="bg-background/50 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MODE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="product-discovery-prompt" className="text-sm font-semibold flex items-center gap-2">
                                <Wand2 className="h-4 w-4 text-emerald-400" />
                                {mode === 'recommend_products' ? 'What are you looking for?' : 'Bundle goal or merchandising angle'}
                            </Label>
                            <Textarea
                                id="product-discovery-prompt"
                                value={prompt}
                                onChange={(event) => setPrompt(event.target.value)}
                                className="bg-background/50 border-white/10 min-h-[110px]"
                                placeholder={mode === 'recommend_products'
                                    ? 'E.g., I want a mellow evening edible that feels relaxing without being too heavy.'
                                    : 'E.g., Suggest bundle concepts around citrus-forward vapes and daytime flower for weekend shoppers.'}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                                        handleGenerate();
                                    }
                                }}
                            />
                        </div>

                        {mode === 'recommend_products' && (
                            <div className="space-y-2">
                                <Label htmlFor="customer-history" className="text-sm font-semibold">
                                    Customer history or preferences
                                </Label>
                                <Textarea
                                    id="customer-history"
                                    value={customerHistory}
                                    onChange={(event) => setCustomerHistory(event.target.value)}
                                    className="bg-background/50 border-white/10 min-h-[90px]"
                                    placeholder="Optional: Usually buys hybrids under $45, prefers fruity terpene profiles, avoids high-dose products."
                                />
                            </div>
                        )}

                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-600 hover:to-lime-600"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        {mode === 'recommend_products'
                                            ? (insight ? 'Refresh Recommendations' : 'Find Matches')
                                            : (insight ? 'Refresh Bundle Ideas' : 'Load Bundle Ideas')}
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
                            <Card className="border-emerald-500/20 bg-emerald-500/5">
                                <CardContent className="space-y-4 pt-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h4 className="text-lg font-semibold text-emerald-300">{insight.title}</h4>
                                            <p className="text-sm text-muted-foreground mt-1">{insight.summary}</p>
                                        </div>
                                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
                                            {mode === 'recommend_products' ? 'Recommendations' : 'Bundle Ideas'}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            {insight.recommendedProducts && insight.recommendedProducts.length > 0 && (
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">Best Matches</div>
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {insight.recommendedProducts.map((product, index) => (
                                            <Card key={`${product.productId}-${index}`} className="border-white/10 bg-background/30">
                                                <CardContent className="space-y-3 pt-4">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="font-medium text-sm">{product.productName}</div>
                                                        <Badge variant="secondary">#{index + 1}</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{product.reasoning}</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {insight.bundleIdeas && insight.bundleIdeas.length > 0 && (
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">Grounded Bundle Concepts</div>
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {insight.bundleIdeas.map((idea) => (
                                            <Card key={idea.name} className="border-white/10 bg-background/30">
                                                <CardContent className="space-y-3 pt-4">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="font-medium text-sm">{idea.name}</div>
                                                        {idea.badgeText && (
                                                            <Badge variant="secondary">{idea.badgeText}</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{idea.description}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Badge variant="outline">{idea.savingsPercent}% savings</Badge>
                                                        {typeof idea.marginImpact === 'number' && (
                                                            <Badge variant="outline">{idea.marginImpact}% margin</Badge>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                                            Products
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {idea.products.map((product) => (
                                                                <Badge key={product.id} variant="secondary" className="max-w-full">
                                                                    {product.name}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {insight.actions && insight.actions.length > 0 && (
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">Next Step</div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {insight.actions.map((action) => (
                                            <Card key={action.label} className="border-white/10 bg-background/30">
                                                <CardContent className="space-y-3 pt-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="rounded-md bg-primary/10 p-2">
                                                            <Package className="h-4 w-4 text-primary" />
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
                            )}
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
