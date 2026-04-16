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
import { getCampaigns, getCampaignStats, type CampaignStats } from '@/server/actions/campaigns';
import { getMenuAnalytics } from '@/server/actions/dispensary-analytics';
import type { Campaign } from '@/types/campaign';
import { CampaignWizardV2 } from './campaign-wizard-v2';
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
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
            const [campaignsResult, statsResult, menuResult] = await Promise.all([
                getCampaigns(orgArg),
                getCampaignStats(orgArg),
                orgArg ? getMenuAnalytics(orgArg) : Promise.resolve({ success: false as const }),
            ]);
            setCampaigns(campaignsResult);
            setStats(statsResult);
            if (menuResult.success && menuResult.data) {
                setSlowMovers(menuResult.data.skuRationalizationFlags);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load campaigns');
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
                <AlertDescription>{error}</AlertDescription>
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
                    onCreateCampaign={() => setShowWizard(true)}
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

                        <Button onClick={() => setShowWizard(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Campaign
                        </Button>
                    </div>

                    <TabsContent value={activeTab} className="mt-4">
                        {filteredCampaigns.length === 0 ? (
                            <EmptyState tab={activeTab} onNewCampaign={() => setShowWizard(true)} />
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
                    onClose={() => setShowWizard(false)}
                    onCreated={() => {
                        setShowWizard(false);
                        fetchData();
                    }}
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
                    {items.length} SKU{items.length !== 1 ? 's' : ''} haven't sold in 21+ days.
                    {liquidateCount > 0 && ` ${liquidateCount} flagged for liquidation (60+ days stagnant).`}
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
