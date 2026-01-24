'use client';

/**
 * Inbox Sidebar
 *
 * Left sidebar with quick actions, thread filters, and thread list.
 */

import React, { useMemo } from 'react';
import {
    Plus,
    Search,
    Images,
    PackagePlus,
    Palette,
    Megaphone,
    HelpCircle,
    Calendar,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    Filter,
    Archive,
    Inbox as InboxIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useInboxStore } from '@/lib/store/inbox-store';
import type {
    InboxThread,
    InboxThreadType,
    InboxQuickAction,
} from '@/types/inbox';
import { getThreadTypeIcon, getThreadTypeLabel } from '@/types/inbox';
import { formatDistanceToNow } from 'date-fns';

// ============ Icon Mapping ============

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    Images,
    PackagePlus,
    Palette,
    Megaphone,
    HelpCircle,
    Calendar,
    Search,
    MessageSquare,
};

function getIcon(iconName: string) {
    return ICON_MAP[iconName] || MessageSquare;
}

// ============ Props ============

interface InboxSidebarProps {
    collapsed?: boolean;
    className?: string;
}

// ============ Quick Action Button ============

function QuickActionButton({ action, collapsed }: { action: InboxQuickAction; collapsed?: boolean }) {
    const { createThread, setQuickActionMode } = useInboxStore();
    const Icon = getIcon(action.icon);

    const handleClick = () => {
        const thread = createThread(action.threadType, {
            title: action.label,
            primaryAgent: action.defaultAgent,
        });
        // Could also pre-populate with promptTemplate
    };

    if (collapsed) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10"
                onClick={handleClick}
                title={action.label}
            >
                <Icon className="h-4 w-4" />
            </Button>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2 h-9 text-sm font-normal"
            onClick={handleClick}
        >
            <Icon className="h-4 w-4 text-primary" />
            {action.label}
        </Button>
    );
}

// ============ Thread List Item ============

function ThreadListItem({
    thread,
    isActive,
    collapsed,
}: {
    thread: InboxThread;
    isActive: boolean;
    collapsed?: boolean;
}) {
    const { setActiveThread } = useInboxStore();
    const Icon = getIcon(getThreadTypeIcon(thread.type));

    const timeAgo = useMemo(() => {
        try {
            return formatDistanceToNow(new Date(thread.lastActivityAt), { addSuffix: true });
        } catch {
            return '';
        }
    }, [thread.lastActivityAt]);

    if (collapsed) {
        return (
            <Button
                variant={isActive ? 'secondary' : 'ghost'}
                size="icon"
                className="w-10 h-10"
                onClick={() => setActiveThread(thread.id)}
                title={thread.title}
            >
                <Icon className="h-4 w-4" />
            </Button>
        );
    }

    return (
        <button
            onClick={() => setActiveThread(thread.id)}
            className={cn(
                'w-full p-3 text-left rounded-lg transition-colors',
                'hover:bg-muted/50',
                isActive && 'bg-muted'
            )}
        >
            <div className="flex items-start gap-3">
                <div className={cn(
                    'p-1.5 rounded-md',
                    thread.status === 'draft' && 'bg-yellow-100 text-yellow-700',
                    thread.status === 'active' && 'bg-blue-100 text-blue-700',
                    thread.status === 'completed' && 'bg-green-100 text-green-700',
                    thread.status === 'archived' && 'bg-gray-100 text-gray-500',
                )}>
                    <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">
                            {thread.title}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {timeAgo}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {thread.preview || 'No messages yet'}
                    </p>
                    {thread.artifactIds.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                {thread.artifactIds.length} artifact{thread.artifactIds.length !== 1 ? 's' : ''}
                            </Badge>
                            {thread.status === 'draft' && (
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-yellow-600 border-yellow-200">
                                    Draft
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
}

// ============ Filter Button ============

function FilterButton({ collapsed }: { collapsed?: boolean }) {
    const { threadFilter, setThreadFilter, clearThreadFilter } = useInboxStore();

    const filterLabels: Record<InboxThreadType | 'all', string> = {
        all: 'All Threads',
        // Business Operations
        general: 'General',
        carousel: 'Carousels',
        bundle: 'Bundles',
        creative: 'Creative',
        campaign: 'Campaigns',
        retail_partner: 'Retail Partners',
        launch: 'Product Launches',
        performance: 'Performance',
        outreach: 'Outreach',
        inventory_promo: 'Inventory Promos',
        event: 'Events',
        // Customer
        product_discovery: 'Products',
        support: 'Support',
        // Super User: Growth Management
        growth_review: 'Growth Reviews',
        churn_risk: 'Churn Analysis',
        revenue_forecast: 'Revenue Forecasts',
        pipeline: 'Pipeline',
        customer_health: 'Customer Health',
        market_intel: 'Market Intel',
        bizdev: 'BizDev',
        experiment: 'Experiments',
        // Super User: Company Operations
        daily_standup: 'Daily Standups',
        sprint_planning: 'Sprint Planning',
        incident_response: 'Incidents',
        feature_spec: 'Feature Specs',
        code_review: 'Code Reviews',
        release: 'Releases',
        customer_onboarding: 'Onboarding',
        customer_feedback: 'Feedback',
        support_escalation: 'Escalations',
        content_calendar: 'Content Calendar',
        launch_campaign: 'Launch Campaigns',
        seo_sprint: 'SEO Sprints',
        partnership_outreach: 'Partnerships',
        billing_review: 'Billing',
        budget_planning: 'Budget Planning',
        vendor_management: 'Vendors',
        compliance_audit: 'Compliance',
        weekly_sync: 'Weekly Syncs',
        quarterly_planning: 'Quarterly Planning',
        board_prep: 'Board Prep',
        hiring: 'Hiring',
        // Super User: Research
        deep_research: 'Deep Research',
        compliance_research: 'Compliance Research',
        market_research: 'Market Research',
    };

    if (collapsed) {
        return (
            <Button variant="ghost" size="icon" className="w-10 h-10" title="Filter">
                <Filter className="h-4 w-4" />
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-8">
                    <Filter className="h-3 w-3" />
                    {filterLabels[threadFilter.type]}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(filterLabels) as (InboxThreadType | 'all')[]).map((type) => (
                    <DropdownMenuItem
                        key={type}
                        onClick={() => setThreadFilter({ type })}
                        className={cn(threadFilter.type === type && 'bg-muted')}
                    >
                        {filterLabels[type]}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// ============ Main Component ============

export function InboxSidebar({ collapsed, className }: InboxSidebarProps) {
    const {
        activeThreadId,
        isSidebarCollapsed,
        setSidebarCollapsed,
        getFilteredThreads,
        getQuickActions,
    } = useInboxStore();

    const threads = getFilteredThreads();
    const quickActions = getQuickActions();

    // Group threads by status
    const activeThreads = threads.filter((t) => t.status === 'active' || t.status === 'draft');
    const archivedThreads = threads.filter((t) => t.status === 'archived' || t.status === 'completed');

    return (
        <div className={cn('flex flex-col h-full bg-background', className)}>
            {/* Header */}
            <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                    {!collapsed && (
                        <div className="flex items-center gap-2">
                            <InboxIcon className="h-5 w-5 text-primary" />
                            <h2 className="font-semibold">Inbox</h2>
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
                    >
                        {collapsed ? (
                            <ChevronRight className="h-4 w-4" />
                        ) : (
                            <ChevronLeft className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Quick Actions */}
            <div className={cn('p-3 border-b', collapsed && 'flex flex-col items-center gap-2')}>
                {collapsed ? (
                    <>
                        <Button
                            variant="default"
                            size="icon"
                            className="w-10 h-10"
                            title="New Thread"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                        {quickActions.slice(0, 3).map((action) => (
                            <QuickActionButton key={action.id} action={action} collapsed />
                        ))}
                    </>
                ) : (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                            Quick Actions
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {quickActions.map((action) => (
                                <QuickActionButton key={action.id} action={action} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Search and Filter */}
            {!collapsed && (
                <div className="p-3 border-b flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search threads..."
                            className="h-8 pl-8 text-sm"
                        />
                    </div>
                    <FilterButton />
                </div>
            )}

            {/* Thread List */}
            <ScrollArea className="flex-1">
                <div className={cn('p-2', collapsed && 'flex flex-col items-center gap-1')}>
                    {/* Active Threads */}
                    {activeThreads.length > 0 && (
                        <>
                            {!collapsed && (
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-2">
                                    Active ({activeThreads.length})
                                </p>
                            )}
                            {activeThreads.map((thread) => (
                                <ThreadListItem
                                    key={thread.id}
                                    thread={thread}
                                    isActive={thread.id === activeThreadId}
                                    collapsed={collapsed}
                                />
                            ))}
                        </>
                    )}

                    {/* Archived Threads */}
                    {archivedThreads.length > 0 && (
                        <>
                            {!collapsed && (
                                <>
                                    <Separator className="my-2" />
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-2 flex items-center gap-1">
                                        <Archive className="h-3 w-3" />
                                        Archived ({archivedThreads.length})
                                    </p>
                                </>
                            )}
                            {archivedThreads.map((thread) => (
                                <ThreadListItem
                                    key={thread.id}
                                    thread={thread}
                                    isActive={thread.id === activeThreadId}
                                    collapsed={collapsed}
                                />
                            ))}
                        </>
                    )}

                    {/* Empty State */}
                    {threads.length === 0 && !collapsed && (
                        <div className="p-4 text-center text-muted-foreground">
                            <InboxIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No threads yet</p>
                            <p className="text-xs mt-1">Use a quick action to start</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

export default InboxSidebar;
