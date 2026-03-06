'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3,
    Cake,
    Check,
    Copy,
    Gift,
    Loader2,
    Megaphone,
    MessageSquare,
    RefreshCw,
    ShieldAlert,
    Sparkles,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    generateInboxCrmInsight,
} from '@/server/actions/inbox-crm';
import type {
    InboxCrmActionKind,
    InboxCrmInsight,
    InboxCrmWorkflow,
} from '@/types/inbox-crm';

interface CrmCampaignInlineProps {
    orgId: string;
    initialPrompt?: string;
    className?: string;
    customerId?: string;
    customerEmail?: string;
    onOpenAction?: (kind: InboxCrmActionKind, prompt: string, insight: InboxCrmInsight) => void;
}

const WORKFLOW_OPTIONS: Array<{
    value: InboxCrmWorkflow;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}> = [
    { value: 'winback', label: 'Win-Back', icon: ShieldAlert },
    { value: 'birthday', label: 'Birthday', icon: Cake },
    { value: 'vip', label: 'VIP', icon: Gift },
    { value: 'segment_analysis', label: 'Segments', icon: Users },
    { value: 'restock', label: 'Restock', icon: RefreshCw },
    { value: 'comms_review', label: 'Comms Review', icon: BarChart3 },
];

function inferWorkflowFromPrompt(prompt: string): InboxCrmWorkflow {
    const lower = prompt.toLowerCase();
    if (lower.includes('birthday')) return 'birthday';
    if (lower.includes('vip')) return 'vip';
    if (lower.includes('segment')) return 'segment_analysis';
    if (lower.includes('restock')) return 'restock';
    if (lower.includes('comms') || lower.includes('communication') || lower.includes('open rate') || lower.includes('click rate')) {
        return 'comms_review';
    }
    return 'winback';
}

function formatInsightForClipboard(insight: InboxCrmInsight): string {
    const metrics = insight.metrics.map((metric) => `${metric.label}: ${metric.value}`).join('\n');
    const actions = insight.actions.map((action) => `${action.label}: ${action.prompt}`).join('\n\n');

    return [
        insight.title,
        insight.summary,
        '',
        metrics,
        '',
        'Recommended Actions',
        actions,
    ].join('\n');
}

export function CrmCampaignInline({
    orgId,
    initialPrompt = '',
    className,
    customerId,
    customerEmail,
    onOpenAction,
}: CrmCampaignInlineProps) {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [workflow, setWorkflow] = useState<InboxCrmWorkflow>(() => inferWorkflowFromPrompt(initialPrompt));
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [insight, setInsight] = useState<InboxCrmInsight | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (initialPrompt) {
            setPrompt(initialPrompt);
            setWorkflow(inferWorkflowFromPrompt(initialPrompt));
        }
    }, [initialPrompt]);

    const handleLoadInsight = async () => {
        setIsLoading(true);
        try {
            const response = await generateInboxCrmInsight({
                orgId,
                workflow,
                prompt: prompt.trim() || undefined,
                customerId,
                customerEmail,
            });

            if (!response.success || !response.insight) {
                throw new Error(response.error || 'CRM insight generation failed.');
            }

            setInsight(response.insight);
            setIsCopied(false);
            toast({
                title: 'CRM insight ready',
                description: 'Review the grounded customer data and open the next workflow when ready.',
            });
        } catch (error) {
            toast({
                title: 'Unable to load CRM insight',
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
            title: 'CRM brief copied',
            description: 'The CRM insight summary is on your clipboard.',
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
                        <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                            <Users className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI CRM Coordinator</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Pull real customer and campaign signals, then jump into the right follow-up workflow
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-cyan-400" />
                                Workflow
                            </Label>
                            <Select value={workflow} onValueChange={(value) => setWorkflow(value as InboxCrmWorkflow)}>
                                <SelectTrigger className="bg-background/50 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {WORKFLOW_OPTIONS.map((option) => {
                                        const Icon = option.icon;
                                        return (
                                            <SelectItem key={option.value} value={option.value}>
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-4 w-4" />
                                                    <span>{option.label}</span>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="crm-prompt" className="text-sm font-semibold flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-cyan-400" />
                                Context or goal
                            </Label>
                            <Textarea
                                id="crm-prompt"
                                value={prompt}
                                onChange={(event) => setPrompt(event.target.value)}
                                className="bg-background/50 border-white/10 min-h-[110px]"
                                placeholder="E.g., Focus on our highest-value at-risk customers and keep the incentive premium, not discount-heavy."
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                                        handleLoadInsight();
                                    }
                                }}
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={handleLoadInsight}
                                disabled={isLoading}
                                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        {insight ? 'Refresh Insight' : 'Load CRM Insight'}
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
                            <Card className="border-cyan-500/20 bg-cyan-500/5">
                                <CardContent className="space-y-4 pt-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h4 className="text-lg font-semibold text-cyan-300">{insight.title}</h4>
                                            <p className="text-sm text-muted-foreground mt-1">{insight.summary}</p>
                                        </div>
                                        <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">
                                            {WORKFLOW_OPTIONS.find((option) => option.value === insight.workflow)?.label || 'CRM'}
                                        </Badge>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-3">
                                        {insight.metrics.map((metric) => (
                                            <div key={metric.label} className="rounded-lg bg-background/40 p-3">
                                                <div className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</div>
                                                <div className={cn(
                                                    'mt-1 text-sm font-medium',
                                                    metric.tone === 'good' && 'text-emerald-300',
                                                    metric.tone === 'warning' && 'text-amber-300',
                                                )}>
                                                    {metric.value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {insight.customers && insight.customers.length > 0 && (
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">Top Customers</div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {insight.customers.slice(0, 6).map((customer) => (
                                            <Card key={`${customer.id}-${customer.email || customer.name}`} className="border-white/10 bg-background/30">
                                                <CardContent className="space-y-2 pt-4">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="font-medium text-sm">{customer.name}</div>
                                                        {customer.segment && (
                                                            <Badge variant="secondary" className="capitalize">
                                                                {customer.segment.replace(/_/g, ' ')}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground space-y-1">
                                                        {customer.email && <div>{customer.email}</div>}
                                                        {typeof customer.totalSpent === 'number' && (
                                                            <div>LTV: ${Math.round(customer.totalSpent).toLocaleString()}</div>
                                                        )}
                                                        {typeof customer.daysSinceLastOrder === 'number' && (
                                                            <div>{customer.daysSinceLastOrder} days since last order</div>
                                                        )}
                                                        {typeof customer.daysAway === 'number' && customer.birthday && (
                                                            <div>{customer.birthday} ({customer.daysAway}d away)</div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {insight.campaigns && insight.campaigns.length > 0 && (
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">Recent Campaigns</div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {insight.campaigns.slice(0, 6).map((campaign) => (
                                            <Card key={campaign.id} className="border-white/10 bg-background/30">
                                                <CardContent className="space-y-2 pt-4">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="font-medium text-sm">{campaign.name}</div>
                                                        {campaign.status && (
                                                            <Badge variant="secondary" className="capitalize">
                                                                {campaign.status.replace(/_/g, ' ')}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground space-y-1">
                                                        {campaign.channels && campaign.channels.length > 0 && (
                                                            <div>Channels: {campaign.channels.join(', ')}</div>
                                                        )}
                                                        {typeof campaign.openRate === 'number' && (
                                                            <div>Open rate: {campaign.openRate.toFixed(1)}%</div>
                                                        )}
                                                        {typeof campaign.clickRate === 'number' && (
                                                            <div>Click rate: {campaign.clickRate.toFixed(1)}%</div>
                                                        )}
                                                        {typeof campaign.revenue === 'number' && (
                                                            <div>Revenue: ${Math.round(campaign.revenue).toLocaleString()}</div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="text-sm font-semibold">Recommended Actions</div>
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {insight.actions.map((action) => {
                                        const Icon = action.kind === 'campaign'
                                            ? Megaphone
                                            : action.kind === 'performance'
                                                ? BarChart3
                                                : MessageSquare;

                                        return (
                                            <Card key={`${action.kind}-${action.label}`} className="border-white/10 bg-background/30">
                                                <CardContent className="space-y-3 pt-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="rounded-md bg-primary/10 p-2">
                                                            <Icon className="h-4 w-4 text-primary" />
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
