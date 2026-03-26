'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Zap,
    MapPin,
    Loader2,
    Plus,
    Trash2,
    RefreshCw,
    Clock,
    Crown,
    Sparkles,
    Wallet,
    FileText,
} from 'lucide-react';
import { useUserRole } from '@/hooks/use-user-role';
import { EzalSnapshotCard } from '@/components/dashboard/ezal-snapshot-card';
import { useToast } from '@/hooks/use-toast';
import {
    getCompetitors,
    addManualCompetitor,
    removeCompetitor,
    getLatestDailyReport,
    refreshCompetitiveIntel,
} from './actions';
import type { CompetitorSnapshot } from './actions';
import { CompetitorSetupWizard } from '../intelligence/components/competitor-setup-wizard';
import { AgentOwnerBadge } from '@/components/dashboard/agent-owner-badge';

function formatDate(date: Date) {
    if (!date || date.getTime() === 0) return 'Never';
    return date.toLocaleDateString();
}

function formatUpdateFrequency(frequency?: CompetitorSnapshot['updateFrequency']) {
    switch (frequency) {
        case 'live':
            return 'Every 6-15 hours';
        case 'daily':
            return 'Daily';
        case 'weekly':
        default:
            return 'Weekly';
    }
}

export default function CompetitiveIntelPage() {
    const { role, user, orgId: hookOrgId } = useUserRole();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [snapshot, setSnapshot] = useState<CompetitorSnapshot | null>(null);
    const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [adding, setAdding] = useState(false);

    const legacyOrgId = (user as { uid?: string } | null)?.uid || '';
    const orgId = hookOrgId || legacyOrgId;

    const loadCompetitors = useCallback(async () => {
        if (!orgId && !legacyOrgId) return;

        try {
            const resolvedOrgId = orgId || legacyOrgId;
            const [data, report] = await Promise.all([
                getCompetitors(resolvedOrgId),
                getLatestDailyReport(resolvedOrgId),
            ]);
            setSnapshot(data);
            setReportMarkdown(report);
        } catch (error) {
            console.error('Failed to load competitors:', error);
        } finally {
            setLoading(false);
        }
    }, [legacyOrgId, orgId]);

    useEffect(() => {
        if (orgId || legacyOrgId) {
            void loadCompetitors();
        } else {
            setLoading(false);
        }
    }, [legacyOrgId, loadCompetitors, orgId]);

    const handleRefresh = async () => {
        if (!snapshot?.canRefresh) {
            toast({
                variant: 'destructive',
                title: 'Refresh Not Available',
                description: `${snapshot?.plan.name} refresh cadence is still cooling down. Next refresh available ${snapshot?.nextUpdate.toLocaleDateString()}`,
            });
            return;
        }

        setRefreshing(true);
        try {
            const result = await refreshCompetitiveIntel(orgId);
            if (!result.success) {
                throw new Error(result.error || 'Refresh failed');
            }

            toast({
                title: 'Competitive Intel Refreshed',
                description: result.failedSources > 0
                    ? `Ran ${result.sourcesRun} sources, rebuilt the report from ${result.totalSnapshots} snapshots, and ${result.failedSources} source${result.failedSources === 1 ? '' : 's'} still need attention.`
                    : `Ran ${result.sourcesRun} sources and rebuilt today's report from ${result.totalSnapshots} fresh snapshots.`,
            });
            await loadCompetitors();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Refresh Failed',
                description: error instanceof Error ? error.message : 'Could not refresh competitor intel.',
            });
        } finally {
            setRefreshing(false);
        }
    };

    const handleAddCompetitor = async () => {
        if (!newName.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Name is required' });
            return;
        }

        setAdding(true);
        try {
            await addManualCompetitor(orgId, { name: newName, address: newAddress });
            toast({ title: 'Competitor Added', description: newName });
            setNewName('');
            setNewAddress('');
            setShowAddForm(false);
            await loadCompetitors();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to add competitor' });
        } finally {
            setAdding(false);
        }
    };

    const handleRemoveCompetitor = async (id: string, name: string) => {
        try {
            await removeCompetitor(orgId, id);
            toast({ title: 'Removed', description: `${name} removed from tracking` });
            await loadCompetitors();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove competitor' });
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const credits = snapshot?.credits;
    const remainingCreditsLabel = credits
        ? `${credits.totalRemaining.toLocaleString()} / ${credits.totalAvailable.toLocaleString()}`
        : null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">Competitive Intel</h1>
                        <AgentOwnerBadge agentId="ezal" label="Powered by Ezal" />
                    </div>
                    <p className="text-muted-foreground">
                        {role === 'brand'
                            ? 'Monitor competitor pricing and market positioning.'
                            : 'Track nearby dispensary menus and promotions.'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <CompetitorSetupWizard
                        hasCompetitors={(snapshot?.competitors.length || 0) > 0}
                        maxCompetitors={snapshot?.maxCompetitors || 1000}
                        autoOpen={false}
                    />
                    <Button variant="outline" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Manual
                    </Button>
                    <Button size="sm" onClick={handleRefresh} disabled={refreshing || !snapshot?.canRefresh}>
                        {refreshing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {snapshot?.canRefresh ? 'Refresh Now' : 'Refresh Locked'}
                    </Button>
                </div>
            </div>

            <Card className="bg-muted/50">
                <CardContent className="py-3">
                    <div className="flex flex-col gap-3 text-sm lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>
                                    Last updated: <strong>{formatDate(snapshot?.lastUpdated || new Date(0))}</strong>
                                </span>
                            </div>
                            <Badge variant={snapshot?.plan.isActive ? 'default' : 'secondary'}>
                                {snapshot?.plan.name || 'Signal'} plan
                            </Badge>
                            <Badge
                                variant={
                                    snapshot?.updateFrequency === 'live'
                                        ? 'default'
                                        : snapshot?.updateFrequency === 'daily'
                                            ? 'default'
                                            : 'secondary'
                                }
                            >
                                Ezal refresh: {formatUpdateFrequency(snapshot?.updateFrequency)}
                            </Badge>
                        </div>
                        {snapshot?.updateFrequency === 'weekly' && (
                            <Button variant="link" size="sm" className="h-auto p-0 text-primary">
                                <Crown className="mr-1 h-4 w-4" />
                                Upgrade to Optimize for faster Ezal refresh
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {showAddForm && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Add Competitor Manually</CardTitle>
                        <CardDescription>Track a competitor that was not auto-discovered</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex gap-3">
                            <Input
                                placeholder="Competitor Name"
                                value={newName}
                                onChange={(event) => setNewName(event.target.value)}
                                className="flex-1"
                            />
                            <Input
                                placeholder="Address (optional)"
                                value={newAddress}
                                onChange={(event) => setNewAddress(event.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={handleAddCompetitor} disabled={adding}>
                                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="border-indigo-100 bg-gradient-to-br from-white to-indigo-50/20 dark:border-indigo-900 dark:from-background dark:to-indigo-950/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                                <FileText className="h-5 w-5" />
                                Daily Strategic Intelligence
                            </CardTitle>
                            <CardDescription>
                                Ezal AI-generated analysis of pricing, stockouts, and margin opportunities.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                                <Sparkles className="mr-1 h-3 w-3" />
                                Ezal AI Generated
                            </Badge>
                            {reportMarkdown && (
                                <Badge variant="outline" className="text-xs">
                                    Updated Today
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {reportMarkdown ? (
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded-lg border bg-white/50 p-6 font-mono text-sm leading-relaxed shadow-sm dark:prose-invert dark:bg-black/20">
                            {reportMarkdown}
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <p className="mb-4 text-muted-foreground">
                                {(snapshot?.competitors.length || 0) > 0
                                    ? 'Report generating. Check back after the next scheduled scan.'
                                    : 'Configure competitors to generate your first strategic report.'}
                            </p>
                            {(snapshot?.competitors.length || 0) === 0 && (
                                <CompetitorSetupWizard hasCompetitors={false} autoOpen={false} />
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Tracked Competitors</CardTitle>
                                    <CardDescription>
                                        {snapshot?.competitors.length || 0} competitors tracked - auto-discovered and manually added
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {snapshot?.competitors && snapshot.competitors.length > 0 ? (
                                snapshot.competitors.map((competitor) => (
                                    <div
                                        key={competitor.id}
                                        className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-full bg-primary/10 p-2">
                                                <MapPin className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <div className="font-medium">{competitor.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {competitor.city && competitor.state
                                                        ? `${competitor.city}, ${competitor.state}`
                                                        : competitor.address || 'Location unknown'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={competitor.source === 'auto' ? 'secondary' : 'outline'}>
                                                {competitor.source === 'auto' ? 'Auto' : 'Manual'}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleRemoveCompetitor(competitor.id, competitor.name)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center text-muted-foreground">
                                    <MapPin className="mx-auto mb-2 h-8 w-8 opacity-20" />
                                    <p>No competitors tracked yet.</p>
                                    <p className="mt-1 text-xs">Click Refresh Now to auto-discover or add manually.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {role === 'brand' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Competitor Pricing Snapshots</CardTitle>
                                <CardDescription>Live data from major marketplaces.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <EzalSnapshotCard allowAddCompetitor={true} />
                            </CardContent>
                        </Card>
                    )}

                    {role === 'dispensary' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Promotion Intelligence</CardTitle>
                                <CardDescription>Recent competitor promotions detected by Ezal AI.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
                                <div className="text-center text-muted-foreground">
                                    <Zap className="mx-auto mb-2 h-8 w-8 opacity-20" />
                                    <p>Promotion feed loading...</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
                            <CardDescription>
                                Thrive Syracuse is using the Ezal workspace on {snapshot?.plan.name || 'Signal'}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div>
                                <div className="text-2xl font-bold">{snapshot?.plan.name || 'Signal'}</div>
                                <div className="text-xs text-muted-foreground">
                                    {snapshot?.plan.tagline || snapshot?.plan.description}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="rounded-lg border bg-background p-3">
                                    <div className="text-muted-foreground">Monthly</div>
                                    <div className="mt-1 font-semibold">{snapshot?.plan.priceDisplay || 'Custom'}/mo</div>
                                </div>
                                <div className="rounded-lg border bg-background p-3">
                                    <div className="text-muted-foreground">Activation</div>
                                    <div className="mt-1 font-semibold">
                                        {snapshot?.plan.activationFeeDisplay || 'Included'}
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                {snapshot?.plan.description}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <Wallet className="h-4 w-4 text-primary" />
                                AI Credits
                            </CardTitle>
                            <CardDescription>
                                Credits available for Ezal reports, research, and advanced workflows this cycle.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {credits ? (
                                <>
                                    <div className="space-y-1">
                                        <div className="text-2xl font-bold">{remainingCreditsLabel}</div>
                                        <div className="text-xs text-muted-foreground">
                                            credits remaining in {credits.billingCycleKey}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Used</span>
                                            <span>{credits.totalUsed.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Automation budget remaining</span>
                                            <span>
                                                {credits.automationBudgetRemaining.toLocaleString()} / {credits.automationBudgetTotal.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Credit data is not configured yet for this workspace. Billing can still refresh Ezal using the current plan cadence.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground">Market Pulse</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <div className="text-2xl font-bold">{snapshot?.competitors.length || 0}</div>
                                <div className="text-xs text-muted-foreground">Competitors Tracked</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold">
                                    {formatUpdateFrequency(snapshot?.updateFrequency)}
                                </div>
                                <div className="text-xs text-muted-foreground">Update Frequency</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold">{snapshot?.maxCompetitors || 0}</div>
                                <div className="text-xs text-muted-foreground">Competitor slots on plan</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Ezal Advisor</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs leading-relaxed">
                            {snapshot?.competitors.length ? (
                                `You're tracking ${snapshot.competitors.length} competitors. ${snapshot.canRefresh ? 'Click refresh to get the latest data.' : `Next auto-update on ${formatDate(snapshot.nextUpdate)}.`}`
                            ) : (
                                `Set your market location in ${role === 'dispensary' ? 'Dispensary Identity' : 'Brand Page'} settings to auto-discover competitors in your area.`
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
