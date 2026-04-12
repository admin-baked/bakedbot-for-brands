'use client';

/**
 * Mission Control — Super User Landing View
 *
 * Design Philosophy: "Status-Forward Landing" (Principle 3)
 * Shows what needs attention, not a blank chat.
 *
 * Sections:
 * 1. KPI Strip — MRR, ARR, DAU, signups with trends
 * 2. Action Queue — items needing human attention (drafts, leads, disconnections)
 * 3. Agent Pulse — last 24h agent activity summary
 * 4. Quick Chat — collapsed PuffChat for fast questions
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const AgentTaskBoard = dynamic(() => import('./agent-task-board'), { ssr: false });
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    TrendingUp,
    TrendingDown,
    Users,
    DollarSign,
    Activity,
    ArrowRight,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Bot,
    Inbox,
    FileEdit,
    UserPlus,
    Zap,
    MessageSquare,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPlatformAnalytics } from '../actions/data-actions';
import type { PlatformAnalyticsData } from '../actions/types';
import type { SuperUserStatusCounts } from '@/server/actions/action-types';

// --- KPI Card ---

function KpiCard({
    label,
    value,
    prefix = '',
    trend,
    trendUp,
    subtitle,
}: {
    label: string;
    value: string;
    prefix?: string;
    trend?: number | null;
    trendUp?: boolean | null;
    subtitle?: string;
}) {
    return (
        <Card className="flex-1 min-w-[140px]">
            <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-bold tracking-tight">{prefix}{value}</span>
                    {trend != null && (
                        <span className={cn(
                            "flex items-center text-xs font-medium",
                            trendUp ? "text-green-600" : "text-red-500"
                        )}>
                            {trendUp ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                            {Math.abs(trend)}%
                        </span>
                    )}
                </div>
                {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
            </CardContent>
        </Card>
    );
}

// --- Action Card ---

type ActionCardVariant = 'warning' | 'info' | 'success' | 'danger';

const variantStyles: Record<ActionCardVariant, { bg: string; icon: string; border: string }> = {
    warning: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200' },
    info: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
    success: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' },
    danger: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
};

function ActionCard({
    title,
    description,
    href,
    variant = 'info',
    icon: Icon,
    count,
}: {
    title: string;
    description: string;
    href: string;
    variant?: ActionCardVariant;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
}) {
    const styles = variantStyles[variant];
    return (
        <Link href={href}>
            <Card className={cn(
                "group cursor-pointer transition-all hover:shadow-md",
                styles.bg, styles.border
            )}>
                <CardContent className="p-4 flex items-start gap-3">
                    <div className={cn("mt-0.5 shrink-0", styles.icon)}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{title}</p>
                            {count != null && count > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{count}</Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
                </CardContent>
            </Card>
        </Link>
    );
}

// --- Agent Activity Item ---

function AgentActivityItem({
    agent,
    calls,
    successRate,
    costToday,
}: {
    agent: string;
    calls: number;
    successRate: number;
    costToday: number;
}) {
    const statusColor = successRate >= 90 ? 'text-green-600' : successRate >= 70 ? 'text-amber-600' : 'text-red-600';
    const StatusIcon = successRate >= 90 ? CheckCircle2 : successRate >= 70 ? AlertTriangle : XCircle;

    return (
        <div className="flex items-center gap-3 py-2 px-1">
            <StatusIcon className={cn("h-4 w-4 shrink-0", statusColor)} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize">{agent}</p>
            </div>
            <div className="text-right shrink-0">
                <p className="text-sm font-mono">{calls} calls</p>
                <p className="text-[10px] text-muted-foreground">{successRate}% success</p>
            </div>
        </div>
    );
}

// --- Main Component ---

export default function MissionControlTab() {
    const [analytics, setAnalytics] = useState<PlatformAnalyticsData | null>(null);
    const [statusCounts, setStatusCounts] = useState<SuperUserStatusCounts | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [analyticsData, statusModule] = await Promise.all([
                    getPlatformAnalytics(),
                    import('@/server/actions/ny-outreach-dashboard').then(m => m.getSuperUserStatusCounts()),
                ]);
                setAnalytics(analyticsData);
                if (statusModule.success && statusModule.counts) {
                    setStatusCounts(statusModule.counts);
                }
            } catch {
                // Non-critical — cards just show loading state
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const mrr = analytics?.revenue.mrr ?? 0;
    const arr = analytics?.revenue.arr ?? 0;
    const dau = analytics?.activeUsers.daily ?? 0;
    const signupsToday = analytics?.signups.today ?? 0;
    const signupsTotal = analytics?.signups.total ?? 0;
    const revTrend = analytics?.revenue.trend ?? null;
    const revTrendUp = analytics?.revenue.trendUp ?? null;
    const activeAgents = analytics?.agentUsage?.filter(a => a.calls > 0) ?? [];

    // Build action items from status counts
    const actionItems: React.ReactNode[] = [];

    if (statusCounts?.pendingOutreachDrafts && statusCounts.pendingOutreachDrafts > 0) {
        actionItems.push(
            <ActionCard
                key="outreach"
                title="Outreach drafts to review"
                description="AI-generated emails ready for your approval before sending"
                href="/dashboard/ceo?tab=outreach"
                variant="warning"
                icon={FileEdit}
                count={statusCounts.pendingOutreachDrafts}
            />
        );
    }

    if (statusCounts?.pendingBlogDrafts && statusCounts.pendingBlogDrafts > 0) {
        actionItems.push(
            <ActionCard
                key="blog"
                title="Blog drafts ready"
                description="Content ready for review and publishing"
                href="/dashboard/ceo?tab=content"
                variant="info"
                icon={FileEdit}
                count={statusCounts.pendingBlogDrafts}
            />
        );
    }

    if (statusCounts?.unenrichedLeads && statusCounts.unenrichedLeads > 0) {
        actionItems.push(
            <ActionCard
                key="leads"
                title="Leads need enrichment"
                description="New leads missing company data — enrich to unlock outreach"
                href="/dashboard/ceo?tab=outreach"
                variant="info"
                icon={UserPlus}
                count={statusCounts.unenrichedLeads}
            />
        );
    }

    if (statusCounts?.apolloCreditsRemaining != null && statusCounts.apolloCreditsRemaining < 25) {
        actionItems.push(
            <ActionCard
                key="apollo"
                title="Apollo credits running low"
                description={`${statusCounts.apolloCreditsRemaining} credits remaining — lead enrichment will pause`}
                href="/dashboard/ceo?tab=outreach"
                variant="danger"
                icon={AlertTriangle}
            />
        );
    }

    // If no action items, show the all-clear
    if (actionItems.length === 0 && !loading) {
        actionItems.push(
            <Card key="clear" className="bg-green-50 border-green-200">
                <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-green-900">All clear</p>
                        <p className="text-xs text-green-700">No items need your attention right now</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Section 1: KPI Strip */}
            <div className="flex flex-wrap gap-3">
                <KpiCard
                    label="MRR"
                    value={mrr.toLocaleString()}
                    prefix="$"
                    trend={revTrend}
                    trendUp={revTrendUp}
                    subtitle="Monthly recurring revenue"
                />
                <KpiCard
                    label="ARR"
                    value={arr.toLocaleString()}
                    prefix="$"
                    subtitle="Annual run rate"
                />
                <KpiCard
                    label="DAU"
                    value={dau.toLocaleString()}
                    trend={analytics?.activeUsers.trend}
                    trendUp={analytics?.activeUsers.trendUp}
                    subtitle="Daily active users"
                />
                <KpiCard
                    label="Signups"
                    value={signupsToday.toLocaleString()}
                    subtitle={`${signupsTotal.toLocaleString()} total`}
                    trend={analytics?.signups.trend}
                    trendUp={analytics?.signups.trendUp}
                />
            </div>

            {/* Section 2 + 3: Two-column — Actions + Agent Pulse */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Action Queue — wider column */}
                <div className="lg:col-span-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Inbox className="h-4 w-4 text-muted-foreground" />
                            Needs Your Attention
                        </h3>
                        {statusCounts && actionItems.length > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                                {actionItems.length} item{actionItems.length !== 1 ? 's' : ''}
                            </Badge>
                        )}
                    </div>
                    <div className="space-y-2">
                        {loading ? (
                            <Card>
                                <CardContent className="p-6 flex items-center justify-center">
                                    <Activity className="h-5 w-5 animate-spin text-muted-foreground" />
                                </CardContent>
                            </Card>
                        ) : actionItems}
                    </div>

                    {/* Quick Actions Row */}
                    <div className="flex flex-wrap gap-2 pt-2">
                        <Link href="/dashboard/ceo?tab=boardroom">
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5" />
                                Open Boardroom
                            </Button>
                        </Link>
                        <Link href="/dashboard/inbox">
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <Inbox className="h-3.5 w-3.5" />
                                Inbox
                            </Button>
                        </Link>
                        <Link href="/dashboard/ceo?tab=outreach">
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <Zap className="h-3.5 w-3.5" />
                                Outreach
                            </Button>
                        </Link>
                        <Link href="/dashboard/creative">
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <FileEdit className="h-3.5 w-3.5" />
                                Creative Center
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Agent Pulse — narrower column */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader className="pb-2 pt-4 px-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Bot className="h-4 w-4 text-muted-foreground" />
                                    Agent Pulse
                                </CardTitle>
                                <Link href="/dashboard/ceo?tab=agents">
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1">
                                        All Agents <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </div>
                            <CardDescription className="text-[11px]">Last 24 hours</CardDescription>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Activity className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : activeAgents.length > 0 ? (
                                <div className="divide-y">
                                    {activeAgents
                                        .sort((a, b) => b.calls - a.calls)
                                        .slice(0, 8)
                                        .map(agent => (
                                            <AgentActivityItem
                                                key={agent.agent}
                                                agent={agent.agent}
                                                calls={agent.calls}
                                                successRate={agent.successRate}
                                                costToday={agent.costToday}
                                            />
                                        ))
                                    }
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                                    <p className="text-sm text-muted-foreground">No agent activity in the last 24h</p>
                                    <Link href="/dashboard/ceo?tab=boardroom">
                                        <Button variant="link" size="sm" className="mt-1 text-xs">
                                            Start a conversation <ArrowRight className="h-3 w-3 ml-1" />
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Signups Mini-List */}
                    {analytics?.recentSignups && analytics.recentSignups.length > 0 && (
                        <Card className="mt-3">
                            <CardHeader className="pb-2 pt-4 px-4">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    Recent Signups
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                                <div className="space-y-2">
                                    {analytics.recentSignups.slice(0, 5).map(signup => (
                                        <div key={signup.id} className="flex items-center justify-between py-1">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{signup.name || signup.email}</p>
                                                <p className="text-[10px] text-muted-foreground">{signup.plan} &middot; {signup.date}</p>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] shrink-0">{signup.role}</Badge>
                                        </div>
                                    ))}
                                </div>
                                <Link href="/dashboard/ceo?tab=crm">
                                    <Button variant="ghost" size="sm" className="w-full mt-2 text-xs gap-1">
                                        View all users <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Section 4: Agent Task Board */}
            <AgentTaskBoard />

            {/* Section 5: Knowledge Engine Brief + Alerts */}
            <KnowledgeBoardroomSection tenantId={''} />
        </div>
    );
}

// =============================================================================
// KNOWLEDGE BOARDROOM SECTION (client-fetched)
// =============================================================================

import type { KnowledgeSearchResult, KnowledgeAlert } from '@/server/services/knowledge-engine';
import { KnowledgeExecutiveBrief } from './knowledge-executive-brief';
import { KnowledgeAlertsPanel } from './knowledge-alerts-panel';

interface KnowledgeBriefData {
    summary: string;
    claims: KnowledgeSearchResult[];
    actions: string[];
}

function KnowledgeBoardroomSection({ tenantId }: { tenantId: string }) {
    const [brief, setBrief] = useState<KnowledgeBriefData | null>(null);
    const [alerts] = useState<KnowledgeAlert[]>([]);

    useEffect(() => {
        if (!tenantId) return;
        fetch('/api/knowledge/executive-brief', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId, lookbackDays: 14, limit: 6 }),
        })
            .then(r => r.json())
            .then((data: KnowledgeBriefData) => setBrief(data))
            .catch(() => {});
    }, [tenantId]);

    if (!brief || brief.claims.length === 0) return null;

    return (
        <div className="grid gap-4 lg:grid-cols-3 mt-4">
            <div className="lg:col-span-2">
                <KnowledgeExecutiveBrief
                    tenantId={tenantId}
                    summary={brief.summary}
                    claims={brief.claims}
                    actions={brief.actions}
                />
            </div>
            <div>
                <KnowledgeAlertsPanel tenantId={tenantId} alerts={alerts} />
            </div>
        </div>
    );
}
