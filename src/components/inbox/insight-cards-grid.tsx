'use client';

/**
 * InsightCardsGrid Component
 *
 * Displays a responsive grid of insight cards above the inbox greeting.
 * Supports loading states, error handling, and lazy loading.
 */

import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { InsightCard } from './insight-card';
import { useInsights } from '@/hooks/use-insights';
import { useInboxStore } from '@/lib/store/inbox-store';
import { createInboxThread } from '@/server/actions/inbox';
import { useToast } from '@/hooks/use-toast';
import type { InsightCard as InsightCardType } from '@/types/insight-cards';
import type { InboxThreadType, InboxAgentPersona } from '@/types/inbox';

// ============ Loading Skeleton ============

function InsightCardSkeleton() {
    return (
        <div className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-3 w-24" />
        </div>
    );
}

function InsightCardsGridSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(i => (
                <InsightCardSkeleton key={i} />
            ))}
        </div>
    );
}

// ============ Error State ============

function InsightCardsError({ error, onRetry }: { error: string; onRetry: () => void }) {
    return (
        <div className="flex items-center justify-center gap-3 py-4 px-6 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
            <Button variant="ghost" size="sm" onClick={onRetry}>
                Retry
            </Button>
        </div>
    );
}

// ============ Empty State ============

function InsightCardsEmpty() {
    return null; // Don't show anything if no insights - cleaner UX
}

// ============ Main Component ============

interface InsightCardsGridProps {
    className?: string;
    maxCards?: number;
}

export function InsightCardsGrid({ className, maxCards = 5 }: InsightCardsGridProps) {
    const { toast } = useToast();
    const {
        createThread,
        markThreadPending,
        markThreadPersisted,
        deleteThread,
        currentOrgId,
    } = useInboxStore();

    const {
        isLoading,
        isRefreshing,
        error,
        refresh,
        getAllInsights,
        lastUpdated,
    } = useInsights({ refreshInterval: 60000 });

    // Get prioritized insights (critical first, then warnings, limit to maxCards)
    const prioritizedInsights = React.useMemo(() => {
        const all = getAllInsights();
        // Sort by severity priority
        const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
        return all
            .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
            .slice(0, maxCards);
    }, [getAllInsights, maxCards]);

    // Handle insight card click - create thread
    const handleInsightAction = async (insight: InsightCardType) => {
        if (!insight.threadType) return;

        let localThread = null;
        try {
            // Agent ID is already in the correct format (underscore-separated)
            const agentPersona = insight.agentId as InboxAgentPersona;

            // Create thread locally first
            localThread = createThread(insight.threadType as InboxThreadType, {
                title: insight.title,
                primaryAgent: agentPersona,
            });

            markThreadPending(localThread.id);

            // Persist to Firestore
            const result = await createInboxThread({
                id: localThread.id,
                type: insight.threadType as InboxThreadType,
                title: insight.title,
                primaryAgent: agentPersona,
                brandId: currentOrgId || undefined,
                dispensaryId: currentOrgId || undefined,
            });

            if (!result.success) {
                deleteThread(localThread.id);
                toast({
                    title: 'Failed to create conversation',
                    description: result.error || 'Please try again',
                    variant: 'destructive',
                });
                return;
            }

            markThreadPersisted(localThread.id);

            // Show success toast with thread prompt hint
            toast({
                title: `Chat with ${insight.agentName}`,
                description: insight.threadPrompt
                    ? `Try asking: "${insight.threadPrompt.slice(0, 50)}..."`
                    : 'Thread created successfully',
            });
        } catch (err) {
            if (localThread) deleteThread(localThread.id);
            toast({
                title: 'Error',
                description: 'Failed to start conversation',
                variant: 'destructive',
            });
        }
    };

    // Time ago helper
    const timeAgo = (date: Date | null) => {
        if (!date) return '';
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    };

    // Loading state
    if (isLoading) {
        return (
            <div className={cn('space-y-3', className)}>
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                </div>
                <InsightCardsGridSkeleton />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={className}>
                <InsightCardsError error={error} onRetry={refresh} />
            </div>
        );
    }

    // Empty state - don't render anything
    if (prioritizedInsights.length === 0) {
        return <InsightCardsEmpty />;
    }

    // Dynamic header: day name + date + urgency summary
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const criticalCount = prioritizedInsights.filter(i => i.severity === 'critical').length;
    const warningCount = prioritizedInsights.filter(i => i.severity === 'warning').length;
    const attentionCount = criticalCount + warningCount;
    const summaryLine =
        criticalCount > 0
            ? `${criticalCount} critical item${criticalCount > 1 ? 's' : ''} need${criticalCount === 1 ? 's' : ''} immediate attention`
            : attentionCount > 0
              ? `${attentionCount} item${attentionCount > 1 ? 's' : ''} need${attentionCount === 1 ? 's' : ''} your attention`
              : 'All systems healthy — great day ahead';
    const summaryColor =
        criticalCount > 0
            ? 'text-red-600 dark:text-red-400'
            : attentionCount > 0
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400';

    return (
        <div className={cn('space-y-3', className)}>
            {/* Header with refresh */}
            <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold text-foreground">
                        {dayName}&apos;s Briefing
                        <span className="text-muted-foreground font-normal ml-1.5">· {dateStr}</span>
                    </h3>
                    <p className={cn('text-xs font-medium', summaryColor)}>
                        {summaryLine}
                    </p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                        {timeAgo(lastUpdated)}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={refresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
                    </Button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {prioritizedInsights.map(insight => (
                    <InsightCard
                        key={insight.id}
                        insight={insight}
                        onAction={handleInsightAction}
                        compact
                    />
                ))}
            </div>
        </div>
    );
}

export default InsightCardsGrid;
