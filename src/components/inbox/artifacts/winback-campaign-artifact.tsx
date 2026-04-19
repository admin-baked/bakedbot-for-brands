'use client';

import React, { useState } from 'react';
import { Users, MessageSquare, CheckCircle2, X, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { approveAndPublishArtifact } from '@/server/actions/inbox';
import type { InboxArtifact } from '@/types/inbox';

interface AtRiskCustomer {
    customerId?: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    ltv: number;
    daysSinceOrder: number;
    totalOrders?: number;
    preferredCategory?: string | null;
}

interface WinbackCampaignData {
    topCustomers?: AtRiskCustomer[];
    customers?: AtRiskCustomer[];
    totalLtvAtRisk?: number;
    totalAtRisk?: number;
    suggestedOffer?: string | null;
}

interface Props {
    artifact: InboxArtifact;
    className?: string;
}

function urgencyLabel(days: number): { label: string; color: string } {
    if (days >= 90) return { label: 'High Risk', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200' };
    if (days >= 60) return { label: 'At Risk', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200' };
    return { label: 'Cooling', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200' };
}

export function WinbackCampaignArtifact({ artifact, className }: Props) {
    const data = artifact.data as WinbackCampaignData;
    const customers = (data.topCustomers ?? data.customers ?? []) as AtRiskCustomer[];
    const totalLtv = data.totalLtvAtRisk ?? customers.reduce((s, c) => s + (c.ltv ?? 0), 0);
    const count = data.totalAtRisk ?? customers.length;
    const [isApproving, setIsApproving] = useState(false);
    const [approved, setApproved] = useState(false);

    const handleApprove = async () => {
        setIsApproving(true);
        try {
            await approveAndPublishArtifact(artifact.id, artifact.threadId);
            setApproved(true);
        } finally {
            setIsApproving(false);
        }
    };

    if (approved) {
        return (
            <div className={cn('flex flex-col items-center justify-center gap-3 py-8 text-center', className)}>
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <p className="font-semibold text-foreground">Win-Back Campaign Approved</p>
                <p className="text-sm text-muted-foreground">SMS queued for at-risk customers. Elroy will confirm in Slack.</p>
            </div>
        );
    }

    return (
        <div className={cn('space-y-4', className)}>
            {/* Summary */}
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-950/20 p-3">
                <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-semibold text-red-800 dark:text-red-300">
                        ${Math.round(totalLtv).toLocaleString()} LTV at risk
                    </span>
                </div>
                <p className="text-xs text-red-700 dark:text-red-400">
                    {count} customer{count !== 1 ? 's' : ''} haven&apos;t ordered in 60+ days.
                    {data.suggestedOffer ? ` Suggested offer: ${data.suggestedOffer}.` : ''} Approve to send win-back SMS.
                </p>
            </div>

            {/* Customer list */}
            <div className="space-y-2">
                {customers.map((c, i) => {
                    const { label, color } = urgencyLabel(c.daysSinceOrder);
                    return (
                        <div key={c.customerId ?? i} className="rounded-lg border bg-card p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{c.name}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        {c.preferredCategory && (
                                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">{c.preferredCategory}</Badge>
                                        )}
                                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                            <Clock className="h-2.5 w-2.5" />
                                            {c.daysSinceOrder}d since last order
                                        </span>
                                        {c.totalOrders != null && (
                                            <span className="text-[11px] text-muted-foreground">{c.totalOrders} orders total</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right shrink-0 space-y-1">
                                    <p className="text-sm font-bold text-foreground">${c.ltv.toFixed(0)} LTV</p>
                                    <Badge className={cn('text-[10px] h-4 px-1.5', color)}>
                                        {label}
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
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    {isApproving ? 'Approving…' : 'Approve Win-Back SMS'}
                </Button>
                <Button variant="outline" size="sm" className="text-muted-foreground">
                    <X className="h-3.5 w-3.5 mr-1" />
                    Dismiss
                </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
                Approving sends win-back SMS via Blackleaf and notifies via Slack.
            </p>
        </div>
    );
}
