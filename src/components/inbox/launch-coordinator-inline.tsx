'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Check,
    Copy,
    ImagePlus,
    Images,
    Loader2,
    Megaphone,
    Package,
    Rocket,
    Sparkles,
    Video,
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
import { useUserRole } from '@/hooks/use-user-role';
import { generateInboxLaunchPlan } from '@/server/actions/inbox-launch';
import type {
    GenerateInboxLaunchPlanInput,
    InboxLaunchAssetType,
    InboxLaunchAudience,
    InboxLaunchPlan,
    InboxLaunchType,
} from '@/types/inbox-launch';

interface LaunchCoordinatorInlineProps {
    orgId: string;
    initialPrompt?: string;
    className?: string;
    onOpenAsset?: (asset: InboxLaunchAssetType, prompt: string, plan: InboxLaunchPlan) => void;
}

const ASSET_META: Record<InboxLaunchAssetType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    carousel: { label: 'Carousel', icon: Images },
    bundle: { label: 'Bundle', icon: Package },
    image: { label: 'Image', icon: ImagePlus },
    video: { label: 'Video', icon: Video },
    campaign: { label: 'Campaign', icon: Megaphone },
};

const LAUNCH_TYPE_OPTIONS: Array<{ value: InboxLaunchType; label: string }> = [
    { value: 'new_drop', label: 'New Drop' },
    { value: 'seasonal_promo', label: 'Seasonal Promo' },
    { value: 'restock_push', label: 'Restock Push' },
    { value: 'event_tie_in', label: 'Event Tie-In' },
];

const AUDIENCE_OPTIONS: Array<{ value: InboxLaunchAudience; label: string }> = [
    { value: 'all_customers', label: 'All Customers' },
    { value: 'vip_loyalty', label: 'VIP / Loyalty' },
    { value: 'new_shoppers', label: 'New Shoppers' },
    { value: 'repeat_buyers', label: 'Repeat Buyers' },
    { value: 'budtenders', label: 'Budtenders' },
];

function formatBriefForClipboard(plan: InboxLaunchPlan): string {
    const assetSection = (Object.entries(plan.assetPrompts) as Array<[InboxLaunchAssetType, string]>)
        .map(([asset, prompt]) => `${ASSET_META[asset].label}: ${prompt}`)
        .join('\n\n');

    return [
        plan.title,
        plan.summary,
        `Launch Type: ${plan.launchTypeLabel}`,
        `Audience: ${plan.audienceLabel}`,
        `Launch Window: ${plan.launchWindow}`,
        `Offer: ${plan.offer}`,
        `Hero Message: ${plan.heroMessage}`,
        `Channels: ${plan.recommendedChannels.join(', ')}`,
        'Timeline:',
        ...plan.timeline.map((step) => `- ${step}`),
        'Compliance Notes:',
        ...plan.complianceNotes.map((note) => `- ${note}`),
        'Asset Prompts:',
        assetSection,
    ].join('\n');
}

export function LaunchCoordinatorInline({
    orgId,
    initialPrompt = '',
    className,
    onOpenAsset,
}: LaunchCoordinatorInlineProps) {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [launchType, setLaunchType] = useState<InboxLaunchType>('new_drop');
    const [audience, setAudience] = useState<InboxLaunchAudience>('all_customers');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [plan, setPlan] = useState<InboxLaunchPlan | null>(null);
    const { toast } = useToast();
    const { user } = useUserRole();

    useEffect(() => {
        if (initialPrompt) {
            setPrompt(initialPrompt);
        }
    }, [initialPrompt]);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast({
                title: 'Prompt required',
                description: 'Describe the product launch you want to coordinate.',
                variant: 'destructive',
            });
            return;
        }

        if (!user?.uid) {
            toast({
                title: 'Unable to build launch plan',
                description: 'User session is missing.',
                variant: 'destructive',
            });
            return;
        }

        setIsGenerating(true);
        try {
            const response = await generateInboxLaunchPlan({
                tenantId: orgId,
                brandId: orgId,
                createdBy: user.uid,
                prompt: prompt.trim(),
                launchType,
                audience,
            } satisfies GenerateInboxLaunchPlanInput);

            if (!response.success || !response.plan) {
                throw new Error(response.error || 'Launch plan generation failed.');
            }

            setPlan(response.plan);
            setIsCopied(false);
            toast({
                title: 'Launch plan ready',
                description: 'Open the asset tools below to start producing launch materials.',
            });
        } catch (error) {
            toast({
                title: 'Generation failed',
                description: error instanceof Error ? error.message : 'Unable to generate launch plan.',
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyBrief = async () => {
        if (!plan) return;
        await navigator.clipboard.writeText(formatBriefForClipboard(plan));
        setIsCopied(true);
        toast({
            title: 'Launch brief copied',
            description: 'The coordinated launch brief is on your clipboard.',
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
                        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                            <Rocket className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI Launch Coordinator</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Build one launch brief, then open the asset tools with coordinated prompts
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="launch-prompt" className="text-sm font-semibold flex items-center gap-2">
                                <Wand2 className="h-4 w-4 text-amber-400" />
                                What are you launching?
                            </Label>
                            <Textarea
                                id="launch-prompt"
                                value={prompt}
                                onChange={(event) => setPrompt(event.target.value)}
                                className="bg-background/50 border-white/10 min-h-[110px]"
                                placeholder="E.g., Launch our new solventless gummies with a weekend VIP-first drop, premium product education, and a strong menu + social push."
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                                        handleGenerate();
                                    }
                                }}
                            />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-amber-400" />
                                    Launch Type
                                </Label>
                                <Select value={launchType} onValueChange={(value) => setLaunchType(value as InboxLaunchType)}>
                                    <SelectTrigger className="bg-background/50 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LAUNCH_TYPE_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Primary Audience</Label>
                                <Select value={audience} onValueChange={(value) => setAudience(value as InboxLaunchAudience)}>
                                    <SelectTrigger className="bg-background/50 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AUDIENCE_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating || !prompt.trim()}
                                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Planning...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        {plan ? 'Regenerate Launch Plan' : 'Generate Launch Plan'}
                                    </>
                                )}
                            </Button>

                            {plan && (
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

                    {plan && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                            <Card className="border-amber-500/20 bg-amber-500/5">
                                <CardContent className="space-y-4 pt-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h4 className="text-lg font-semibold text-amber-300">{plan.title}</h4>
                                            <p className="text-sm text-muted-foreground mt-1">{plan.summary}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant="outline" className="border-amber-500/30 text-amber-300">
                                                {plan.launchTypeLabel}
                                            </Badge>
                                            <Badge variant="outline" className="border-amber-500/30 text-amber-300">
                                                {plan.audienceLabel}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div className="rounded-lg bg-background/40 p-3">
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Launch Window</div>
                                            <div className="mt-1 text-sm">{plan.launchWindow}</div>
                                        </div>
                                        <div className="rounded-lg bg-background/40 p-3">
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Offer / CTA</div>
                                            <div className="mt-1 text-sm">{plan.offer}</div>
                                        </div>
                                        <div className="rounded-lg bg-background/40 p-3">
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Hero Message</div>
                                            <div className="mt-1 text-sm">{plan.heroMessage}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Recommended Channels</div>
                                        <div className="flex flex-wrap gap-2">
                                            {plan.recommendedChannels.map((channel) => (
                                                <Badge key={channel} variant="secondary">
                                                    {channel}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <Card className="bg-background/30 border-white/10">
                                    <CardContent className="space-y-3 pt-4">
                                        <div className="text-sm font-semibold">Launch Timeline</div>
                                        <div className="space-y-2">
                                            {plan.timeline.map((step) => (
                                                <div key={step} className="rounded-lg border border-white/5 bg-background/40 px-3 py-2 text-sm">
                                                    {step}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-background/30 border-white/10">
                                    <CardContent className="space-y-3 pt-4">
                                        <div className="text-sm font-semibold">Compliance Notes</div>
                                        <div className="space-y-2">
                                            {plan.complianceNotes.map((note) => (
                                                <div key={note} className="rounded-lg border border-white/5 bg-background/40 px-3 py-2 text-sm">
                                                    {note}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-3">
                                <div className="text-sm font-semibold">Build Launch Assets</div>
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {(Object.entries(plan.assetPrompts) as Array<[InboxLaunchAssetType, string]>).map(([asset, assetPrompt]) => {
                                        const meta = ASSET_META[asset];
                                        const Icon = meta.icon;
                                        return (
                                            <Card key={asset} className="border-white/10 bg-background/30">
                                                <CardContent className="space-y-3 pt-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="rounded-md bg-primary/10 p-2">
                                                            <Icon className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div className="font-medium">{meta.label}</div>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground line-clamp-5">{assetPrompt}</p>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full"
                                                        onClick={() => onOpenAsset?.(asset, assetPrompt, plan)}
                                                    >
                                                        Open {meta.label}
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
