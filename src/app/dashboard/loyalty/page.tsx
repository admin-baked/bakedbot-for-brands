'use client';

import { Button } from '@/components/ui/button';
import { Settings, Loader2, Award, RefreshCw, Users, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { useEffect, useState, useCallback } from 'react';
import { getLoyaltySettings } from '@/app/actions/loyalty';
import { LoyaltySettings } from '@/types/customers';
import { useToast } from '@/hooks/use-toast';
import { LoyaltySettingsForm } from '@/components/dashboard/loyalty/loyalty-settings-form';
import { BadgeGrid } from '@/components/dashboard/loyalty/badge-grid';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LoyaltyStats {
    totalCustomers: number;
    withAlpineSync: number;
    withCalculatedPoints: number;
    reconciled: number;
    needsReview: number;
    lastSyncAt: string | null;
}

export default function LoyaltyPage() {
    const { dispensaryId, loading: idLoading } = useDispensaryId();
    const [settings, setSettings] = useState<LoyaltySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<LoyaltyStats | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);
    const { toast } = useToast();

    const fetchSettings = useCallback(async () => {
        if (!dispensaryId) return;
        const result = await getLoyaltySettings(dispensaryId);
        if (result.success && result.data) {
            setSettings(result.data);
        } else {
            toast({
                title: "Error",
                description: "Failed to load loyalty settings.",
                variant: "destructive"
            });
        }
        setLoading(false);
    }, [dispensaryId, toast]);

    const fetchStats = useCallback(async () => {
        if (!dispensaryId) return;

        try {
            const response = await fetch(`/api/loyalty/sync?orgId=${dispensaryId}`);
            if (response.ok) {
                const data = await response.json();
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to fetch loyalty stats:', error);
        }
    }, [dispensaryId]);

    const handleSync = async () => {
        if (!dispensaryId) return;

        setIsSyncing(true);
        setSyncSuccess(false);

        try {
            const response = await fetch('/api/loyalty/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ orgId: dispensaryId }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSyncSuccess(true);
                toast({
                    title: "Success",
                    description: `Synced ${data.result.totalProcessed} customers successfully.`,
                });

                // Refresh stats
                await fetchStats();
            } else {
                throw new Error(data.error || 'Sync failed');
            }
        } catch (error) {
            toast({
                title: "Sync Failed",
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: "destructive"
            });
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        if (!dispensaryId) {
            if (!idLoading) setLoading(false);
            return;
        }
        setLoading(true);
        fetchSettings();
        fetchStats();
    }, [dispensaryId, idLoading, fetchSettings, fetchStats]);

    if (idLoading || (loading && dispensaryId)) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold">Loyalty Program</h2>
                    <p className="text-sm text-muted-foreground">Configure points, rewards, and sync customer data.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                </div>
            </div>

            {syncSuccess && (
                <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                        Loyalty data synced successfully! Customer points are up to date.
                    </AlertDescription>
                </Alert>
            )}

            {settings ? (
                <div className="grid gap-6">
                    {/* Sync Stats */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="p-6 border rounded-lg bg-card">
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                <Users className="h-4 w-4" />
                                <h3 className="font-medium text-sm">Total Customers</h3>
                            </div>
                            <p className="text-2xl font-bold">{stats?.totalCustomers?.toLocaleString() || '--'}</p>
                            <p className="text-xs text-muted-foreground mt-1">In loyalty program</p>
                        </div>
                        <div className="p-6 border rounded-lg bg-card">
                            <div className="flex items-center gap-2 text-purple-600 mb-2">
                                <Award className="h-4 w-4" />
                                <h3 className="font-medium text-sm">Alpine IQ Synced</h3>
                            </div>
                            <p className="text-2xl font-bold">{stats?.withAlpineSync?.toLocaleString() || '--'}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stats?.totalCustomers ? `${Math.round((stats.withAlpineSync / stats.totalCustomers) * 100)}% coverage` : '--'}
                            </p>
                        </div>
                        <div className="p-6 border rounded-lg bg-card">
                            <div className="flex items-center gap-2 text-green-600 mb-2">
                                <CheckCircle2 className="h-4 w-4" />
                                <h3 className="font-medium text-sm">Reconciled</h3>
                            </div>
                            <p className="text-2xl font-bold">{stats?.reconciled?.toLocaleString() || '--'}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stats?.totalCustomers ? `${Math.round((stats.reconciled / stats.totalCustomers) * 100)}% accurate` : '--'}
                            </p>
                        </div>
                        <div className="p-6 border rounded-lg bg-card">
                            <div className="flex items-center gap-2 text-amber-600 mb-2">
                                <AlertCircle className="h-4 w-4" />
                                <h3 className="font-medium text-sm">Needs Review</h3>
                            </div>
                            <p className="text-2xl font-bold text-amber-600">{stats?.needsReview?.toLocaleString() || '--'}</p>
                            <p className="text-xs text-muted-foreground mt-1">Discrepancies &gt;10%</p>
                        </div>
                    </div>

                    {/* Sync Status Info */}
                    {stats && (
                        <div className="p-6 border rounded-lg bg-card">
                            <div className="flex items-center gap-2 mb-4">
                                <Database className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-medium">Sync Status</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold tracking-tight">Customer Engagement Badges</h2>
                                    <Award className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <BadgeGrid />
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Last Sync:</span>
                                    <Badge variant="outline">
                                        {stats.lastSyncAt ? new Date(stats.lastSyncAt).toLocaleString() : 'Never'}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Calculated Points:</span>
                                    <Badge variant="outline">{stats.withCalculatedPoints} customers</Badge>
                                </div>
                                <div className="pt-3 border-t text-xs text-muted-foreground">
                                    <div className="font-medium mb-1">Data Sources:</div>
                                    <ul className="space-y-1 ml-4">
                                        <li>• Alleaves POS: Order history & spending</li>
                                        <li>• Alpine IQ: External loyalty (source of truth)</li>
                                        <li>• BakedBot: Calculated & reconciliation</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-6 border rounded-lg bg-card">
                        <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            Program Rules
                        </h3>
                        {dispensaryId && (
                            <LoyaltySettingsForm
                                initialData={settings}
                                orgId={dispensaryId}
                            />
                        )}
                    </div>
                </div>
            ) : (
                <div className="p-12 border border-dashed rounded-lg text-center text-muted-foreground">
                    Unable to load settings.
                </div>
            )}
        </div>
    );
}
