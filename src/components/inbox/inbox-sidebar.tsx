'use client';

/**
 * Inbox Sidebar
 *
 * Left sidebar with quick actions, thread filters, and thread list.
 */

import React, { useMemo, useEffect, useState, useCallback } from 'react';
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
    Loader2,
    Pin,
    X,
    FolderKanban,
    Star,
    MoreHorizontal as MoreHorizontalIcon,
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
import { formatSmartTime } from '@/lib/utils/format-time';
import { createInboxThread } from '@/server/actions/inbox';
import { useToast } from '@/hooks/use-toast';
import { ProjectSelector } from '@/components/dashboard/project-selector';
import type { Project } from '@/types/project';

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

// ============ Quick Action Categories ============

const QUICK_ACTION_CATEGORIES = {
    marketing: ['new-carousel', 'new-bundle', 'new-creative', 'new-campaign', 'create-qr', 'customer-blast', 'plan-event'],
    operations: ['product-launch', 'review-performance', 'move-inventory'],
    growth: ['growth-review', 'churn-analysis', 'revenue-forecast', 'pipeline-review', 'customer-health', 'market-intel', 'bizdev-outreach', 'growth-experiment'],
    company: ['daily-standup', 'sprint-planning', 'incident-response', 'release-prep', 'customer-onboarding', 'customer-pulse', 'content-brief', 'weekly-sync', 'cash-flow', 'board-update', 'compliance-audit', 'hiring-review'],
    research: ['deep-research', 'compliance-brief', 'market-analysis'],
    customer: ['find-products', 'my-routines', 'get-help'],
};

// Default favorites (most commonly used)
function getDefaultFavoritesForRole(role: string | null): string[] {
    // Super Users: prioritize executive ops + platform growth workflows
    if (role === 'super_user' || role === 'super_admin' || role === 'owner') {
        return [
            'daily-standup',
            'growth-review',
            'pipeline-review',
            'revenue-forecast',
            'incident-response',
            'board-update',
        ];
    }

    // Customers
    if (role === 'customer') {
        return ['find-products', 'my-routines', 'get-help'];
    }

    // Default (brand/dispensary)
    return ['new-carousel', 'new-bundle', 'new-creative', 'new-campaign', 'review-performance', 'customer-blast'];
}

// ============ Props ============

interface InboxSidebarProps {
    collapsed?: boolean;
    className?: string;
}

// ============ Quick Action Button ============

function QuickActionButton({ action, collapsed }: { action: InboxQuickAction; collapsed?: boolean }) {
    const { createThread, deleteThread, markThreadPending, markThreadPersisted, currentOrgId, threadFilter } = useInboxStore();
    const [isCreating, setIsCreating] = useState(false);
    const { toast } = useToast();
    const Icon = getIcon(action.icon);

    const handleClick = async () => {
        if (isCreating) return;
        setIsCreating(true);

        let localThread = null;
        try {
            // Auto-assign current project filter if one is selected
            const projectId = threadFilter.projectId && threadFilter.projectId !== 'all'
                ? threadFilter.projectId
                : undefined;

            // Create thread locally first for instant UI feedback
            localThread = createThread(action.threadType, {
                title: action.label,
                primaryAgent: action.defaultAgent,
                projectId,
            });

            // Mark thread as pending (not yet persisted to Firestore)
            markThreadPending(localThread.id);

            // Persist to Firestore - pass local ID to avoid race conditions
            const result = await createInboxThread({
                id: localThread.id, // Use the same ID as local thread
                type: action.threadType,
                title: action.label,
                primaryAgent: action.defaultAgent,
                brandId: currentOrgId || undefined,
                dispensaryId: currentOrgId || undefined,
                projectId,
            });

            if (!result.success) {
                console.error('[QuickActionButton] Failed to persist thread:', result.error);
                // Delete local thread since server persistence failed
                deleteThread(localThread.id);
                toast({
                    title: 'Failed to create conversation',
                    description: result.error || 'Please try again',
                    variant: 'destructive',
                });
                return;
            }

            // Mark thread as persisted (safe to use now)
            markThreadPersisted(localThread.id);
        } catch (error) {
            console.error('[QuickActionButton] Error creating thread:', error);
            // Clean up local thread on error
            if (localThread) {
                deleteThread(localThread.id);
            }
            toast({
                title: 'Failed to create conversation',
                description: 'An unexpected error occurred. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsCreating(false);
        }
    };

    if (collapsed) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10"
                onClick={handleClick}
                title={action.label}
                disabled={isCreating}
            >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
            </Button>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2 h-9 text-sm font-normal"
            onClick={handleClick}
            disabled={isCreating}
        >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4 text-primary" />}
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
        return formatSmartTime(thread.lastActivityAt, { abbreviated: true });
    }, [thread.lastActivityAt]);

    if (collapsed) {
        return (
            <div className="relative">
                <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="icon"
                    className="w-10 h-10"
                    onClick={() => setActiveThread(thread.id)}
                    title={thread.title}
                >
                    <Icon className="h-4 w-4" />
                </Button>
                {thread.isPinned && (
                    <Pin className="absolute -top-1 -right-1 h-3 w-3 text-primary fill-primary" />
                )}
            </div>
        );
    }

    return (
        <button
            onClick={() => setActiveThread(thread.id)}
            className={cn(
                'w-full p-3 text-left rounded-lg transition-all duration-200 relative',
                'hover:bg-white/5 hover:backdrop-blur-sm',
                isActive && 'bg-white/10 backdrop-blur-sm border border-white/10 shadow-sm'
            )}
            style={thread.color ? { borderLeft: `3px solid ${thread.color}` } : undefined}
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
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {thread.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                            <span className="font-medium text-sm truncate">
                                {thread.title}
                            </span>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 min-w-[32px] text-right">
                            {timeAgo}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {thread.preview || 'No messages yet'}
                    </p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {thread.projectId && (
                            <div className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] bg-primary/10 text-primary">
                                <FolderKanban className="h-2.5 w-2.5" />
                                Project
                            </div>
                        )}
                        {thread.artifactIds.length > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                {thread.artifactIds.length} artifact{thread.artifactIds.length !== 1 ? 's' : ''}
                            </Badge>
                        )}
                        {thread.status === 'draft' && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-yellow-600 border-yellow-200">
                                Draft
                            </Badge>
                        )}
                        {thread.tags && thread.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="outline" className="h-5 px-1.5 text-[10px]">
                                {tag}
                            </Badge>
                        ))}
                        {thread.tags && thread.tags.length > 2 && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                +{thread.tags.length - 2}
                            </Badge>
                        )}
                    </div>
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
        hero: 'Hero Banners',
        bundle: 'Bundles',
        creative: 'Creative',
        campaign: 'Campaigns',
        qr_code: 'QR Codes',
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
        // CRM
        crm_customer: 'CRM Customer',
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
        loadQuickActions,
        currentRole,
        threadFilter,
        setThreadFilter,
        createThread,
        deleteThread,
        markThreadPending,
        markThreadPersisted,
    } = useInboxStore();

    const threads = getFilteredThreads();
    const quickActions = getQuickActions();
    const defaultFavorites = useMemo(() => getDefaultFavoritesForRole(currentRole), [currentRole]);
    const favoriteQuickActions = useMemo(
        () => quickActions.filter(action => defaultFavorites.includes(action.id)),
        [quickActions, defaultFavorites]
    );
    const collapsedQuickActions = useMemo(
        () => (favoriteQuickActions.length > 0 ? favoriteQuickActions.slice(0, 3) : quickActions.slice(0, 3)),
        [favoriteQuickActions, quickActions]
    );
    const favoriteGridActions = useMemo(
        () => (favoriteQuickActions.length > 0 ? favoriteQuickActions.slice(0, 6) : quickActions.slice(0, 6)),
        [favoriteQuickActions, quickActions]
    );

    const handleQuickActionSelect = useCallback((action: InboxQuickAction) => {
        // Create thread via the action
        const projectId = threadFilter.projectId && threadFilter.projectId !== 'all'
            ? threadFilter.projectId
            : undefined;

        const thread = createThread(action.threadType, {
            title: action.label,
            primaryAgent: action.defaultAgent,
            projectId,
        });

        markThreadPending(thread.id);

        createInboxThread({
            id: thread.id,
            type: action.threadType,
            title: action.label,
            primaryAgent: action.defaultAgent,
            projectId,
        }).then(result => {
            if (result.success) {
                markThreadPersisted(thread.id);
            } else {
                deleteThread(thread.id);
            }
        });
    }, [createThread, deleteThread, markThreadPending, markThreadPersisted, threadFilter.projectId]);

    // Load quick actions when role changes
    useEffect(() => {
        loadQuickActions();
    }, [currentRole, loadQuickActions]);

    // Group threads by status
    const activeThreads = threads.filter((t) => t.status === 'active' || t.status === 'draft');
    const archivedThreads = threads.filter((t) => t.status === 'archived' || t.status === 'completed');

    return (
        <div className={cn(
            'flex flex-col h-full',
            'bg-sidebar/80 backdrop-blur-xl',
            'border-r border-white/5',
            'supports-[backdrop-filter]:bg-sidebar/60',
            className
        )}>
            {/* Header */}
            <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                    {!collapsed && (
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                <InboxIcon className="h-4 w-4" />
                            </div>
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
            <div className={cn('p-3 border-b border-white/5', collapsed && 'flex flex-col items-center gap-2')}>
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
                        {collapsedQuickActions.map((action) => (
                            <QuickActionButton key={action.id} action={action} collapsed />
                        ))}
                    </>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Quick Actions
                            </p>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Favorites
                            </Button>
                        </div>

                        {/* Favorite Actions (Top 6) */}
                        <div className="grid grid-cols-2 gap-2">
                            {favoriteGridActions.map((action) => (
                                <QuickActionButton key={action.id} action={action} />
                            ))}
                        </div>

                        {/* More Actions Menu */}
                        {quickActions.length > 6 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full gap-2 h-9">
                                        <MoreHorizontalIcon className="h-4 w-4" />
                                        More Actions ({quickActions.length - 6})
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-[280px] max-h-[400px] overflow-y-auto">
                                    {(() => {
                                        const isSuper = currentRole === 'super_user' || currentRole === 'super_admin' || currentRole === 'owner';
                                        const isCustomer = currentRole === 'customer';

                                        const orderedCategories: Array<keyof typeof QUICK_ACTION_CATEGORIES> = isCustomer
                                            ? ['customer']
                                            : isSuper
                                                ? ['growth', 'company', 'research', 'marketing', 'operations']
                                                : ['marketing', 'operations'];

                                        const categorized = new Set<string>();
                                        Object.values(QUICK_ACTION_CATEGORIES).forEach((ids) => {
                                            ids.forEach((id) => categorized.add(id));
                                        });

                                        const blocks: React.ReactNode[] = [];

                                        for (const category of orderedCategories) {
                                            const actions = quickActions
                                                .filter(a => QUICK_ACTION_CATEGORIES[category].includes(a.id))
                                                .filter(a => !defaultFavorites.includes(a.id));

                                            if (actions.length === 0) continue;

                                            blocks.push(
                                                <React.Fragment key={category}>
                                                    <DropdownMenuLabel className="text-xs">
                                                        {category === 'company' ? 'Company Ops' : category.charAt(0).toUpperCase() + category.slice(1)}
                                                    </DropdownMenuLabel>
                                                    {actions.map((action) => {
                                                        const Icon = getIcon(action.icon);
                                                        return (
                                                            <DropdownMenuItem
                                                                key={action.id}
                                                                className="text-sm"
                                                                onClick={() => handleQuickActionSelect(action)}
                                                            >
                                                                <Icon className="h-4 w-4 mr-2" />
                                                                {action.label}
                                                            </DropdownMenuItem>
                                                        );
                                                    })}
                                                    <DropdownMenuSeparator />
                                                </React.Fragment>
                                            );
                                        }

                                        const uncategorized = quickActions
                                            .filter(a => !categorized.has(a.id))
                                            .filter(a => !defaultFavorites.includes(a.id));

                                        if (uncategorized.length > 0) {
                                            blocks.push(
                                                <React.Fragment key="other">
                                                    <DropdownMenuLabel className="text-xs">Other</DropdownMenuLabel>
                                                    {uncategorized.map((action) => {
                                                        const Icon = getIcon(action.icon);
                                                        return (
                                                            <DropdownMenuItem
                                                                key={action.id}
                                                                className="text-sm"
                                                                onClick={() => handleQuickActionSelect(action)}
                                                            >
                                                                <Icon className="h-4 w-4 mr-2" />
                                                                {action.label}
                                                            </DropdownMenuItem>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        }

                                        return blocks.length > 0
                                            ? blocks
                                            : (
                                                <div className="p-4 text-sm text-muted-foreground">
                                                    No additional actions available.
                                                </div>
                                            );
                                    })()}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                )}
            </div>

            {/* Search, Filter, and Project Selector */}
            {!collapsed && (
                <div className="p-3 border-b border-white/5 space-y-2">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search threads..."
                            className="h-8 pl-8 pr-8 text-sm"
                            value={threadFilter.searchQuery || ''}
                            onChange={(e) => setThreadFilter({ searchQuery: e.target.value })}
                        />
                        {threadFilter.searchQuery && (
                            <button
                                onClick={() => setThreadFilter({ searchQuery: '' })}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    {/* Project Selector and Filter */}
                    <div className="flex items-center gap-2">
                        <ProjectSelector
                            selectedProjectId={threadFilter.projectId === 'all' ? null : threadFilter.projectId}
                            onProjectChange={(project: Project | null) => {
                                setThreadFilter({ projectId: project?.id || 'all' });
                            }}
                            className="flex-1"
                        />
                        <FilterButton />
                    </div>
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
                                    Active Threads ({activeThreads.length})
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
