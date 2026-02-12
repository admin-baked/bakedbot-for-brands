'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Plus, Megaphone, Send, Clock, FileText, BarChart3,
    Mail, MessageSquare, Users, Loader2, TrendingUp,
} from 'lucide-react';
import { getCampaigns, getCampaignStats, type CampaignStats } from '@/server/actions/campaigns';
import type { Campaign, CampaignStatus } from '@/types/campaign';
import { CAMPAIGN_STATUS_INFO } from '@/types/campaign';
import { CampaignWizardV2 } from './campaign-wizard-v2';
import { CampaignCard } from './campaign-card';

interface CampaignsDashboardProps {
    userId: string;
}

export function CampaignsDashboard({ userId }: CampaignsDashboardProps) {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [stats, setStats] = useState<CampaignStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        setError(null);
        try {
            const [campaignsResult, statsResult] = await Promise.all([
                getCampaigns(''), // orgId resolved server-side via requireUser
                getCampaignStats(''),
            ]);
            setCampaigns(campaignsResult);
            setStats(statsResult);
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
