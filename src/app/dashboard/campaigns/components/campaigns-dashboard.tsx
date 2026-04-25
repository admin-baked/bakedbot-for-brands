'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Plus, Megaphone, Send, BarChart3,
    Loader2, TrendingUp, Building2, Package, AlertTriangle,
} from 'lucide-react';
import { getCampaigns, getCampaignStats, getSegmentCounts, type CampaignStats, type SegmentCounts } from '@/server/actions/campaigns';
import { getMenuAnalytics } from '@/server/actions/dispensary-analytics';
import type { Campaign } from '@/types/campaign';
import { CampaignWizardV2, type WizardContext } from './campaign-wizard-v2';
import { CampaignCard } from './campaign-card';

// Orgs super_user can switch between in the Campaigns view
const SUPER_USER_ORGS = [
    { id: 'org_bakedbot_platform', label: 'BakedBot Platform' },
    { id: 'org_thrive_syracuse', label: 'Thrive Syracuse' },
    { id: 'org_ecstatic_edibles', label: 'Ecstatic Edibles' },
] as const;

type SlowMover = {
    productId: string;
    name: string;
    category: string;
    daysSinceLastSale: number;
    velocity: number;
    action: 'markdown' | 'liquidate';
    estimatedAtRisk: number;
};

interface CampaignsDashboardProps {
    userId: string;
    orgId?: string;
    isSuperUser?: boolean;
}

export function CampaignsDashboard({ userId, orgId: defaultOrgId, isSuperUser }: CampaignsDashboardProps) {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [stats, setStats] = useState<CampaignStats | null>(null);
    const [slowMovers, setSlowMovers] = useState<SlowMover[]>([]);
    const [segmentCounts, setSegmentCounts] = useState<SegmentCounts | undefined>(undefined);
    const [wizardContext, setWizardContext] = useState<WizardContext | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [sortBy, setSortBy] = useState<'newest' | 'openRate' | 'clickRate' | 'revenue'>('newest');
    // Super user org switcher — defaults to platform org
    const [selectedOrgId, setSelectedOrgId] = useState(
        isSuperUser ? 'org_bakedbot_platform' : (defaultOrgId ?? '')
    );

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedOrgId]);

    async function fetchData() {
        setLoading(true);
        setError(null);
        try {
            const orgArg = isSuperUser ? selectedOrgId : (defaultOrgId ?? '');
            if (!orgArg) {
                setCampaigns([]);
                setStats(null);
                setSlowMovers([]);
                setError('Missing organization context for Campaigns. Refresh the page or reselect your workspace.');
                return;
            }
            // Use allSettled so a non-critical analytics failure doesn't block the campaigns list
            const [campaignsSettled, statsSettled, menuSettled, countsSettled] = await Promise.allSettled([
                getCampaigns(orgArg),
                getCampaignStats(orgArg),
                orgArg ? getMenuAnalytics(orgArg) : Promise.resolve({ success: false as const }),
                getSegmentCounts(orgArg),
            ]);
            if (campaignsSettled.status === 'rejected' || statsSettled.status === 'rejected') {
                setError('Failed to load campaigns. Please refresh the page.');
                return;
            }
            setCampaigns(campaignsSettled.value);
            setStats(statsSettled.value);
            if (menuSettled.status === 'fulfilled' && menuSettled.value.success && menuSettled.value.data) {
                setSlowMovers(menuSettled.value.data.skuRationalizationFlags);
            }
            if (countsSettled.status === 'fulfilled') {
                setSegmentCounts(countsSettled.value);
            }
        } catch (err) {
            setError('Failed to load campaigns. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    }

    const filteredCampaigns = campaigns.filter(c => {
        if (activeTab === 'all') return true;
        if (activeTab === 'active') return ['sending', 'scheduled', 'approved', 'compliance_review', 'pending_approval'].includes(c.status);
        if (activeTab === 'scheduled') return c.status === 'scheduled';
        if (activeTab === 'drafts') return c.status === 'draft';
        if (activeTab === 'completed') return ['sent', 'cancelled', 'failed'].includes(c.status);
        return true;
    }).sort((a, b) => {
        if (sortBy === 'openRate') return (b.performance?.openRate ?? 0) - (a.performance?.openRate ?? 0);
        if (sortBy === 'clickRate') return (b.performance?.clickRate ?? 0) - (a.performance?.clickRate ?? 0);
        if (sortBy === 'revenue') return (b.performance?.revenue ?? 0) - (a.performance?.revenue ?? 0);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertDescription className="flex items-center justify-between gap-4">
                    <span>Failed to load campaigns. Please refresh the page.</span>
                    <Button size="sm" variant="outline" onClick={fetchData}>
                        Retry
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Campaigns"
                        value={stats.total}
                        icon={<Megaphone className="h-4 w-4" />}
                    />
                    <StatCard
                        title="Active"
                        value={stats.active}
                        icon={<Send className="h-4 w-4" />}
                        highlight={stats.active > 0}
                    />
                    <StatCard
                        title="Avg Open Rate"
                        value={`${stats.avgOpenRate.toFixed(1)}%`}
                        icon={<BarChart3 className="h-4 w-4" />}
                    />
                    <StatCard
                        title="Total Revenue"
                        value={`$${stats.totalRevenue.toLocaleString()}`}
                        icon={<TrendingUp className="h-4 w-4" />}
                    />
                </div>
            )}

            {/* Slow-Moving Inventory Audit */}
            {slowMovers.length > 0 && (
                <SlowInventoryPanel
                    items={slowMovers}
                    onCreateCampaign={() => {
                        const totalAtRisk = slowMovers.reduce((s, i) => s + i.estimatedAtRisk, 0);
                        const topItems = slowMovers.slice(0, 5)
                            .map(i => `- ${i.name} ($${i.estimatedAtRisk.toLocaleString()} at risk, ${i.daysSinceLastSale}d stale)`)
                            .join('\n');
                        setWizardContext({
                            mode: 'slow-mover',
                            presetGoal: 'drive_sales',
                            presetName: `Slow Mover Flash Sale — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                            presetChannels: ['email'],
                            note: `${slowMovers.length} SKUs have $${totalAtRisk.toLocaleString()} at risk. Craig will write a flash sale campaign to clear this inventory.`,
                            aiPrompt: `Write a flash sale email campaign to move slow-selling inventory. These products haven't sold in 60+ days:\n${topItems}\nTotal at risk: $${totalAtRisk.toLocaleString()} across ${slowMovers.length} SKUs.\n\nSuggest a 20-25% discount or "this weekend only" deal. Keep messaging urgent but compliant (no medical claims). Use {{firstName}} for personalization.`,
                        });
                        setShowWizard(true);
                    }}
                />
            )}

            {/* Super User Org Switcher */}
            {isSuperUser && (
                <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Viewing:</span>
                    <div className="flex gap-1">
                        {SUPER_USER_ORGS.map(org => (
                            <Button
                                key={org.id}
                                variant={selectedOrgId === org.id ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedOrgId(org.id)}
                            >
                                {org.label}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs + New Campaign */}
            <div className="flex items-center justify-between">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="all">All ({campaigns.length})</TabsTrigger>
                            <TabsTrigger value="active">Active</TabsTrigger>
                            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                            <TabsTrigger value="drafts">Drafts</TabsTrigger>
                            <TabsTrigger value="completed">Completed</TabsTrigger>
                        </TabsList>

                        <div className="flex items-center gap-2">
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                                className="text-sm border rounded-md px-2 py-1.5 bg-background"
                            >
                                <option value="newest">Newest</option>
                                <option value="openRate">Open Rate</option>
                                <option value="clickRate">Click Rate</option>
                                <option value="revenue">Revenue</option>
                            </select>
                            <Button onClick={() => { setWizardContext(undefined); setShowWizard(true); }}>
                                <Plus className="h-4 w-4 mr-2" />
                                New Campaign
                            </Button>
                        </div>
                    </div>

                    <TabsContent value={activeTab} className="mt-4">
                        {filteredCampaigns.length === 0 ? (
                            <EmptyState tab={activeTab} onNewCampaign={() => { setWizardContext(undefined); setShowWizard(true); }} />
                        ) : (
                            <div className="space-y-3">
                                {filteredCampaigns.map(campaign => (
                                    <CampaignCard
                                        key={campaign.id}
                                        campaign={campaign}
                                        onRefresh={fetchData}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Campaign Wizard Dialog */}
            {showWizard && (
                <CampaignWizardV2
                    open={showWizard}
                    onClose={() => { setShowWizard(false); setWizardContext(undefined); }}
                    onCreated={() => {
                        setShowWizard(false);
                        setWizardContext(undefined);
                        fetchData();
                    }}
                    context={wizardContext}
                    segmentCounts={segmentCounts}
                />
            )}
        </div>
    );
}

// =============================================================================
// SLOW INVENTORY PANEL
// =============================================================================

function SlowInventoryPanel({ items, onCreateCampaign }: {
    items: SlowMover[];
    onCreateCampaign: () => void;
}) {
    const totalAtRisk = items.reduce((s, i) => s + i.estimatedAtRisk, 0);
    const liquidateCount = items.filter(i => i.action === 'liquidate').length;

    return (
        <Card className="border-amber-200 bg-amber-50/40">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <CardTitle className="text-base text-amber-900">
                            Slow-Moving Inventory — ${totalAtRisk.toLocaleString()} at risk
                        </CardTitle>
                    </div>
                    <Button size="sm" onClick={onCreateCampaign}>
                        <Plus className="h-3 w-3 mr-1" />
                        Move It Campaign
                    </Button>
                </div>
                <CardDescription className="text-amber-700">
                    {items.length} SKU{items.length !== 1 ? 's' : ''} have gone 60+ days without meaningful sell-through.
                    {liquidateCount > 0 && ` ${liquidateCount} flagged for liquidation (90+ days stagnant).`}
                    {' '}Create a flash sale or promo campaign to clear stock.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {items.slice(0, 8).map(item => (
                        <div
                            key={item.productId}
                            className="flex items-center justify-between rounded-md border border-amber-100 bg-white px-3 py-2 text-sm"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="font-medium truncate">{item.name}</span>
                                <Badge
                                    variant="outline"
                                    className="text-xs shrink-0 border-muted text-muted-foreground"
                                >
                                    {item.category}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-2">
                                <span className="text-muted-foreground text-xs">
                                    {item.daysSinceLastSale}d ago
                                </span>
                                <Badge
                                    className={`text-xs ${
                                        item.action === 'liquidate'
                                            ? 'bg-red-100 text-red-800 border-red-200'
                                            : 'bg-amber-100 text-amber-800 border-amber-200'
                                    }`}
                                    variant="outline"
                                >
                                    {item.action}
                                </Badge>
                                <span className="font-semibold text-amber-800 w-16 text-right">
                                    ${item.estimatedAtRisk.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ))}
                    {items.length > 8 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">
                            + {items.length - 8} more slow-moving SKUs
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// =============================================================================
// STAT CARD
// =============================================================================

function StatCard({ title, value, icon, highlight }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    highlight?: boolean;
}) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className={`text-2xl font-bold ${highlight ? 'text-green-600' : ''}`}>
                            {value}
                        </p>
                    </div>
                    <div className="text-muted-foreground">{icon}</div>
                </div>
            </CardContent>
        </Card>
    );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState({ tab, onNewCampaign }: { tab: string; onNewCampaign: () => void }) {
    const messages: Record<string, { title: string; description: string }> = {
        all: {
            title: 'No campaigns yet',
            description: 'Create your first campaign to engage customers with personalized email and SMS messages.',
        },
        active: {
            title: 'No active campaigns',
            description: 'Your active campaigns will appear here once scheduled or sending.',
        },
        scheduled: {
            title: 'No scheduled campaigns',
            description: 'Schedule a campaign to send at a specific date and time.',
        },
        drafts: {
            title: 'No drafts',
            description: 'Start a new campaign — you can save it as a draft at any time.',
        },
        completed: {
            title: 'No completed campaigns',
            description: 'Completed campaigns and their performance metrics will show here.',
        },
    };

    const msg = messages[tab] || messages.all;

    return (
        <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Megaphone className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{msg.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">{msg.description}</p>
                {tab === 'all' && (
                    <Button onClick={onNewCampaign}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Campaign
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
