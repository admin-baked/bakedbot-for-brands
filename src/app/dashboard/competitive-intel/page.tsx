'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutDashboard, Zap, MapPin, TrendingUp, Search, Loader2, Plus, Trash2, RefreshCw, Clock, Crown } from 'lucide-react';
import { useUserRole } from '@/hooks/use-user-role';
import { EzalSnapshotCard } from '@/components/dashboard/ezal-snapshot-card';
import { useToast } from '@/hooks/use-toast';
import { getCompetitors, autoDiscoverCompetitors, addManualCompetitor, removeCompetitor } from './actions';
import type { CompetitorEntry, CompetitorSnapshot } from './actions';
import { useUser } from '@/firebase/auth/use-user';

export default function CompetitiveIntelPage() {
    const { role } = useUserRole();
    const { user } = useUser();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [snapshot, setSnapshot] = useState<CompetitorSnapshot | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Add competitor form
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [adding, setAdding] = useState(false);

    const orgId = user?.uid || '';

    const loadCompetitors = useCallback(async () => {
        if (!orgId) return;
        try {
            const data = await getCompetitors(orgId);
            setSnapshot(data);
        } catch (error) {
            console.error('Failed to load competitors:', error);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => {
        if (orgId) {
            loadCompetitors();
        } else {
            setLoading(false);
        }
    }, [orgId, loadCompetitors]);

    const handleRefresh = async () => {
        if (!snapshot?.canRefresh) {
            toast({
                variant: 'destructive',
                title: 'Refresh Not Available',
                description: `Free plan allows weekly updates. Next refresh available ${snapshot?.nextUpdate.toLocaleDateString()}`
            });
            return;
        }

        setRefreshing(true);
        try {
            const result = await autoDiscoverCompetitors(orgId, true);
            toast({
                title: 'Competitors Updated',
                description: `Discovered ${result.discovered} competitors in your market.`
            });
            await loadCompetitors();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Refresh Failed',
                description: 'Could not update competitor data.'
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

    const formatDate = (date: Date) => {
        if (!date || date.getTime() === 0) return 'Never';
        return date.toLocaleDateString();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Competitive Intel</h1>
                    <p className="text-muted-foreground">
                        {role === 'brand'
                            ? "Monitor competitor pricing and market positioning."
                            : "Track nearby dispensary menus and promotions."}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Competitor
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing || !snapshot?.canRefresh}
                    >
                        {refreshing ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        {snapshot?.canRefresh ? 'Refresh Now' : 'Refresh Locked'}
                    </Button>
                </div>
            </div>

            {/* Update Status Banner */}
            <Card className="bg-muted/50">
                <CardContent className="py-3">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>Last updated: <strong>{formatDate(snapshot?.lastUpdated || new Date(0))}</strong></span>
                            </div>
                            <Badge variant={snapshot?.updateFrequency === 'weekly' ? 'secondary' : 'default'}>
                                {snapshot?.updateFrequency === 'weekly' ? 'Free: Weekly Updates' : 'Pro: Daily Updates'}
                            </Badge>
                        </div>
                        {snapshot?.updateFrequency === 'weekly' && (
                            <Button variant="link" size="sm" className="text-primary p-0 h-auto">
                                <Crown className="h-4 w-4 mr-1" />
                                Upgrade for daily updates
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Add Competitor Form */}
            {showAddForm && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Add Competitor Manually</CardTitle>
                        <CardDescription>Track a competitor that wasn't auto-discovered</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex gap-3">
                            <Input
                                placeholder="Competitor Name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="flex-1"
                            />
                            <Input
                                placeholder="Address (optional)"
                                value={newAddress}
                                onChange={(e) => setNewAddress(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={handleAddCompetitor} disabled={adding}>
                                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Competitors List */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Tracked Competitors</CardTitle>
                                    <CardDescription>
                                        {snapshot?.competitors.length || 0} competitors tracked • Auto-discovered + manually added
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {snapshot?.competitors && snapshot.competitors.length > 0 ? (
                                snapshot.competitors.map((comp) => (
                                    <div key={comp.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-full">
                                                <MapPin className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <div className="font-medium">{comp.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {comp.city && comp.state ? `${comp.city}, ${comp.state}` : comp.address || 'Location unknown'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={comp.source === 'auto' ? 'secondary' : 'outline'}>
                                                {comp.source === 'auto' ? 'Auto' : 'Manual'}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleRemoveCompetitor(comp.id, comp.name)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p>No competitors tracked yet.</p>
                                    <p className="text-xs mt-1">Click "Refresh Now" to auto-discover or add manually.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Brand-specific insights */}
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

                    {/* Dispensary-specific insights */}
                    {role === 'dispensary' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Promotion Intelligence</CardTitle>
                                <CardDescription>Recent competitor promotions detected by AI.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-48 flex items-center justify-center border-2 border-dashed rounded-lg">
                                <div className="text-center text-muted-foreground">
                                    <Zap className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p>Promotion feed loading...</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar area */}
                <div className="space-y-6">
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
                                    {snapshot?.updateFrequency === 'weekly' ? '7d' : '24h'}
                                </div>
                                <div className="text-xs text-muted-foreground">Update Frequency</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">BakedBot Advisor</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs leading-relaxed">
                            {snapshot?.competitors.length ? (
                                `You're tracking ${snapshot.competitors.length} competitors. ${snapshot.canRefresh ? 'Click refresh to get the latest data.' : `Next auto-update on ${formatDate(snapshot.nextUpdate)}.`}`
                            ) : (
                                "Set your market location in Brand Page settings to auto-discover competitors in your area."
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
