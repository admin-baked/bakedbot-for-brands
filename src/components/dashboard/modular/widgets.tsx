'use client';

/**
 * Widget Components Index
 * Exports all individual widget components for the modular dashboard
 */

import React from 'react';
import { WidgetWrapper } from './widget-wrapper';
import {
    MapPin, TrendingUp, DollarSign, Search, Globe,
    Bot, Play, Zap, Sparkles, BarChart,
    MessageSquare, UserPlus, Shield, AlertTriangle
} from 'lucide-react';

// ============================================================================
// INSIGHTS WIDGETS
// ============================================================================

export function TopZipsWidget({ onRemove }: { onRemove?: () => void }) {
    const mockData = [
        { zip: '60601', views: 3200, ctr: 4.2 },
        { zip: '60602', views: 2800, ctr: 3.8 },
        { zip: '60603', views: 2100, ctr: 3.5 },
        { zip: '60604', views: 1900, ctr: 3.2 },
        { zip: '60605', views: 1700, ctr: 2.9 },
    ];

    return (
        <WidgetWrapper title="Top Performing ZIPs" icon={<MapPin className="h-4 w-4" />} onRemove={onRemove}>
            <div className="space-y-3">
                {mockData.map((item, i) => (
                    <div key={item.zip} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                                {i + 1}
                            </span>
                            <span className="font-mono">{item.zip}</span>
                        </div>
                        <div className="text-right">
                            <div className="font-medium">{item.views.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">{item.ctr}% CTR</div>
                        </div>
                    </div>
                ))}
            </div>
        </WidgetWrapper>
    );
}

export function FootTrafficWidget({ onRemove }: { onRemove?: () => void }) {
    return (
        <WidgetWrapper title="Foot Traffic Stats" icon={<TrendingUp className="h-4 w-4" />} onRemove={onRemove}>
            <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">24.5K</div>
                    <div className="text-xs text-muted-foreground">Page Views</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">1,856</div>
                    <div className="text-xs text-muted-foreground">Unique Visitors</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">+12%</div>
                    <div className="text-xs text-muted-foreground">vs Last Week</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">3.2</div>
                    <div className="text-xs text-muted-foreground">Pages/Session</div>
                </div>
            </div>
        </WidgetWrapper>
    );
}

export function RevenueSummaryWidget({ onRemove }: { onRemove?: () => void }) {
    return (
        <WidgetWrapper title="Revenue Summary" icon={<DollarSign className="h-4 w-4" />} onRemove={onRemove}>
            <div className="space-y-4">
                <div className="text-center">
                    <div className="text-3xl font-bold">$28,450</div>
                    <div className="text-sm text-muted-foreground">This Month</div>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">vs Last Month</span>
                    <span className="text-green-600 font-medium">+18.5%</span>
                </div>
            </div>
        </WidgetWrapper>
    );
}

// ============================================================================
// SEO WIDGETS
// ============================================================================

export function SeoHealthWidget({ onRemove }: { onRemove?: () => void }) {
    return (
        <WidgetWrapper title="SEO Health" icon={<Search className="h-4 w-4" />} onRemove={onRemove}>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span>Health Score</span>
                    <span className="text-2xl font-bold text-green-600">92</span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Indexed Pages</span>
                        <span className="font-medium">1,383</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Issues Found</span>
                        <span className="font-medium text-amber-600">12</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Last Crawl</span>
                        <span className="font-medium">2h ago</span>
                    </div>
                </div>
            </div>
        </WidgetWrapper>
    );
}

export function CrawlStatusWidget({ onRemove }: { onRemove?: () => void }) {
    return (
        <WidgetWrapper title="Crawl Status" icon={<Globe className="h-4 w-4" />} onRemove={onRemove}>
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm">Healthy</span>
                </div>
                <div className="text-sm text-muted-foreground">
                    Last indexed: 2 hours ago
                </div>
                <div className="text-sm">
                    Coverage: <span className="font-medium">98.5%</span>
                </div>
            </div>
        </WidgetWrapper>
    );
}

// ============================================================================
// OPERATIONS WIDGETS
// ============================================================================

export function AgentStatusWidget({ onRemove }: { onRemove?: () => void }) {
    const agents = [
        { name: 'Smokey', status: 'active' },
        { name: 'Craig', status: 'active' },
        { name: 'Deebo', status: 'active' },
        { name: 'Pops', status: 'idle' },
        { name: 'Ezal', status: 'active' },
    ];

    return (
        <WidgetWrapper title="Agent Status" icon={<Bot className="h-4 w-4" />} onRemove={onRemove}>
            <div className="space-y-2">
                {agents.map(agent => (
                    <div key={agent.name} className="flex items-center justify-between">
                        <span className="text-sm">{agent.name}</span>
                        <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                    </div>
                ))}
            </div>
        </WidgetWrapper>
    );
}

export function PlaybookTrackerWidget({ onRemove }: { onRemove?: () => void }) {
    const runs = [
        { name: 'Welcome Email', time: '2h ago', status: 'success' },
        { name: 'Price Update', time: '5h ago', status: 'success' },
        { name: 'Inventory Sync', time: '1d ago', status: 'failed' },
    ];

    return (
        <WidgetWrapper title="Playbook Runs" icon={<Play className="h-4 w-4" />} onRemove={onRemove}>
            <div className="space-y-3">
                {runs.map((run, i) => (
                    <div key={i} className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium">{run.name}</div>
                            <div className="text-xs text-muted-foreground">{run.time}</div>
                        </div>
                        <div className={`text-xs ${run.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {run.status}
                        </div>
                    </div>
                ))}
            </div>
        </WidgetWrapper>
    );
}

// ============================================================================
// GROWTH WIDGETS
// ============================================================================

export function ClaimCtaWidget({ onRemove }: { onRemove?: () => void }) {
    return (
        <WidgetWrapper title="Grow Your Coverage" icon={<Zap className="h-4 w-4" />} onRemove={onRemove}>
            <div className="text-center space-y-3">
                <div className="text-4xl font-bold text-primary">47</div>
                <div className="text-sm text-muted-foreground">unclaimed pages in your area</div>
                <button className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                    Claim More ZIPs
                </button>
            </div>
        </WidgetWrapper>
    );
}

export function NewDetectedWidget({ onRemove }: { onRemove?: () => void }) {
    return (
        <WidgetWrapper title="New Discoveries" icon={<Sparkles className="h-4 w-4" />} onRemove={onRemove}>
            <div className="space-y-3">
                <div className="flex justify-between">
                    <span className="text-sm">New Dispensaries</span>
                    <span className="font-medium">+12</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm">New Brands</span>
                    <span className="font-medium">+5</span>
                </div>
                <div className="text-xs text-muted-foreground">Last 7 days</div>
            </div>
        </WidgetWrapper>
    );
}

export function CampaignMetricsWidget({ onRemove }: { onRemove?: () => void }) {
    return (
        <WidgetWrapper title="Campaign Metrics" icon={<BarChart className="h-4 w-4" />} onRemove={onRemove}>
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-muted rounded">
                        <div className="text-lg font-bold">42.5%</div>
                        <div className="text-xs text-muted-foreground">Open Rate</div>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                        <div className="text-lg font-bold">8.2%</div>
                        <div className="text-xs text-muted-foreground">Click Rate</div>
                    </div>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                    Active campaigns: 3
                </div>
            </div>
        </WidgetWrapper>
    );
}

// ============================================================================
// CONTENT WIDGETS
// ============================================================================

export function RecentReviewsWidget({ onRemove }: { onRemove?: () => void }) {
    const reviews = [
        { user: 'John D.', rating: 5, snippet: 'Great selection and fast service!' },
        { user: 'Sarah M.', rating: 4, snippet: 'Good prices but parking is limited.' },
        { user: 'Mike R.', rating: 5, snippet: 'Best dispensary in the area.' },
    ];

    return (
        <WidgetWrapper title="Recent Reviews" icon={<MessageSquare className="h-4 w-4" />} onRemove={onRemove}>
            <div className="space-y-3">
                {reviews.map((review, i) => (
                    <div key={i} className="border-b pb-2 last:border-0">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{review.user}</span>
                            <span className="text-yellow-500">{'★'.repeat(review.rating)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{review.snippet}</p>
                    </div>
                ))}
            </div>
        </WidgetWrapper>
    );
}

export function EditorRequestsWidget({ onRemove }: { onRemove?: () => void }) {
    return (
        <WidgetWrapper title="Editor Requests" icon={<UserPlus className="h-4 w-4" />} onRemove={onRemove}>
            <div className="space-y-3">
                <div className="text-center">
                    <div className="text-3xl font-bold">3</div>
                    <div className="text-sm text-muted-foreground">Pending Requests</div>
                </div>
                <button className="w-full py-2 px-4 border rounded-lg text-sm hover:bg-muted transition-colors">
                    Review Requests
                </button>
            </div>
        </WidgetWrapper>
    );
}

// ============================================================================
// COMPLIANCE WIDGETS
// ============================================================================

export function ComplianceAlertsWidget({ onRemove }: { onRemove?: () => void }) {
    return (
        <WidgetWrapper title="Compliance Alerts" icon={<Shield className="h-4 w-4" />} onRemove={onRemove}>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm">Active Violations</span>
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">2</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm">Warnings</span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">5</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm">All Clear</span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">1,376</span>
                </div>
            </div>
        </WidgetWrapper>
    );
}

export function RuleChangesWidget({ onRemove }: { onRemove?: () => void }) {
    return (
        <WidgetWrapper title="Upcoming Rule Changes" icon={<AlertTriangle className="h-4 w-4" />} onRemove={onRemove}>
            <div className="space-y-3">
                <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                    <div className="text-sm font-medium">Illinois</div>
                    <div className="text-xs text-muted-foreground">New labeling requirements - Jan 1</div>
                </div>
                <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                    <div className="text-sm font-medium">California</div>
                    <div className="text-xs text-muted-foreground">Updated advertising rules - Feb 15</div>
                </div>
            </div>
        </WidgetWrapper>
    );
}

// ============================================================================
// BRAND-SPECIFIC WIDGETS
// ============================================================================

// Shared components
import { BrandKPIs } from '@/app/dashboard/brand/components/brand-kpi-grid';
import { NextBestActions } from '@/app/dashboard/brand/components/next-best-actions';

// ... (other imports)

// ...

export function BrandKpisWidget({ onRemove, data }: { onRemove?: () => void, data?: any }) {
    return (
        <WidgetWrapper title="Brand KPIs" icon={<TrendingUp className="h-4 w-4" />} onRemove={onRemove}>
            <div className="h-full overflow-auto">
                <BrandKPIs data={data} />
            </div>
        </WidgetWrapper>
    );
}

export function NextBestActionsWidget({ onRemove }: { onRemove?: () => void }) {
    return (
        <WidgetWrapper title="Next Best Actions" icon={<Zap className="h-4 w-4" />} onRemove={onRemove}>
            <div className="h-full overflow-auto">
                <NextBestActions />
            </div>
        </WidgetWrapper>
    );
}

export function CompetitiveIntelWidget({ onRemove }: { onRemove?: () => void }) {
    return (
        <WidgetWrapper title="Competitive Intel (Ezal)" icon={<Search className="h-4 w-4" />} onRemove={onRemove}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <div className="text-3xl font-bold">6+</div>
                        <div className="text-xs text-muted-foreground">COMPETITORS</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-emerald-600">+6%</div>
                        <div className="text-xs text-muted-foreground">PRICE INDEX</div>
                    </div>
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Undercutters this week</span>
                        <span className="font-medium">3 Retailers</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Promo Gap detected</span>
                        <span className="font-medium">5 vs 1</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Shelf Share Trend</span>
                        <span className="font-medium text-emerald-600">+1 stores</span>
                    </div>
                </div>
            </div>
        </WidgetWrapper>
    );
}

// ... other imports
import { BrandChatWidget } from '@/app/dashboard/brand/components/brand-chat-widget';
import { ManagedPagesList } from '@/components/dashboard/managed-pages-list';

// ...

export function ManagedPagesWidget({ onRemove }: { onRemove?: () => void }) {
    return (
        <WidgetWrapper title="Your Pages" icon={<Globe className="h-4 w-4" />} onRemove={onRemove}>
            <div className="h-full overflow-auto">
                <ManagedPagesList userRole="brand" />
            </div>
        </WidgetWrapper>
    );
}

export function BrandChatWidgetWrapper({ onRemove }: { onRemove?: () => void }) {
    return (
        <WidgetWrapper title="Ask Baked HQ (Brand)" icon={<MessageSquare className="h-4 w-4" />} onRemove={onRemove}>
            <div className="h-full overflow-hidden">
                <BrandChatWidget />
            </div>
        </WidgetWrapper>
    );
}

export function QuickActionsWidget({ onRemove }: { onRemove?: () => void }) {
    const actions = [
        { label: 'Launch Compliant Campaign', icon: '🚀' },
        { label: 'Generate Retail Sell Sheet', icon: '📄' },
        { label: 'Run Competitor Price Scan', icon: '🔍' },
        { label: 'Build Buyer Target List', icon: '📊' },
    ];

    return (
        <WidgetWrapper title="Quick Actions" icon={<Zap className="h-4 w-4" />} onRemove={onRemove}>
            <div className="space-y-2">
                {actions.map((action, i) => (
                    <button key={i} className="w-full flex items-center gap-2 p-2 text-left text-sm border rounded-lg hover:bg-muted transition-colors">
                        <span>{action.icon}</span>
                        <span>{action.label}</span>
                    </button>
                ))}
            </div>
        </WidgetWrapper>
    );
}

export function BrandAlertsWidget({ onRemove }: { onRemove?: () => void }) {
    const alerts = [
        { type: 'error', text: '3 stores out of stock (Top SKU)' },
        { type: 'warning', text: '2 retailers pricing below MAP' },
        { type: 'warning', text: 'Campaign deliverability dip' },
        { type: 'success', text: 'Compliance clean in IL, MI' },
    ];

    return (
        <WidgetWrapper title="Brand Alerts" icon={<AlertTriangle className="h-4 w-4" />} onRemove={onRemove}>
            <div className="space-y-2">
                {alerts.map((alert, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${alert.type === 'error' ? 'bg-red-500' :
                            alert.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                        <span>{alert.text}</span>
                    </div>
                ))}
            </div>
        </WidgetWrapper>
    );
}

// ============================================================================
// WIDGET COMPONENT MAP
// ============================================================================

export const WIDGET_COMPONENTS: Record<string, React.ComponentType<{ onRemove?: () => void }>> = {
    'top-zips': TopZipsWidget,
    'foot-traffic': FootTrafficWidget,
    'revenue-summary': RevenueSummaryWidget,
    'seo-health': SeoHealthWidget,
    'crawl-status': CrawlStatusWidget,
    'agent-status': AgentStatusWidget,
    'playbook-tracker': PlaybookTrackerWidget,
    'claim-cta': ClaimCtaWidget,
    'new-detected': NewDetectedWidget,
    'campaign-metrics': CampaignMetricsWidget,
    'recent-reviews': RecentReviewsWidget,
    'editor-requests': EditorRequestsWidget,
    'compliance-alerts': ComplianceAlertsWidget,
    'rule-changes': RuleChangesWidget,
    // Brand-specific widgets
    'brand-kpis': BrandKpisWidget,
    'next-best-actions': NextBestActionsWidget,
    'competitive-intel': CompetitiveIntelWidget,
    'managed-pages': ManagedPagesWidget,
    'brand-chat': BrandChatWidgetWrapper,
    'quick-actions': QuickActionsWidget,
    'brand-alerts': BrandAlertsWidget,
};

/**
 * Get widget component by type
 */
export function getWidgetComponent(type: string): React.ComponentType<{ onRemove?: () => void }> | null {
    return WIDGET_COMPONENTS[type] || null;
}

