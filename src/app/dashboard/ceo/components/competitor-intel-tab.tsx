'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Play, Trash2, Eye, TrendingUp, DollarSign, Tag } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    triggerSingleStoreDiscovery,
    triggerStateDiscovery,
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    getPricingBands,
    getActivePromos,
} from '@/server/services/leafly-connector';
import {
    triggerDispensarySearch,
    getGMapsStats,
    getRecentGMapsRuns,
} from '@/server/services/gmaps-connector';
import type { CompetitorWatchlistEntry, LeaflyOffer } from '@/types/leafly';
import type { GMapsIngestionRun } from '@/types/gmaps';
import { MapPin } from 'lucide-react';

const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
];

const CATEGORIES = ['flower', 'vapes', 'edibles', 'concentrates', 'pre-rolls', 'topicals', 'tinctures'];

interface PricingBand {
    min: number;
    max: number;
    avg: number;
    count: number;
    dispensaries: string[];
}

export default function CompetitorIntelTab() {
    const { toast } = useToast();

    // Watchlist state
    const [watchlist, setWatchlist] = useState<CompetitorWatchlistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [discovering, setDiscovering] = useState<string | null>(null);

    // Add competitor dialog
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [newState, setNewState] = useState('');
    const [newCity, setNewCity] = useState('');
    const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [adding, setAdding] = useState(false);

    // State scan
    const [stateScanOpen, setStateScanOpen] = useState(false);
    const [scanState, setScanState] = useState('');
    const [scanMaxStores, setScanMaxStores] = useState('25');
    const [runningStateScan, setRunningStateScan] = useState(false);

    // Intel view
    const [intelState, setIntelState] = useState('Michigan');
    const [intelCategory, setIntelCategory] = useState('flower');
    const [pricingBands, setPricingBands] = useState<PricingBand | null>(null);
    const [promos, setPromos] = useState<LeaflyOffer[]>([]);
    const [loadingIntel, setLoadingIntel] = useState(false);

    // Google Maps state
    const [gmapsLocation, setGmapsLocation] = useState('Detroit, MI');
    const [gmapsMaxResults, setGmapsMaxResults] = useState('50');
    const [gmapsLoading, setGmapsLoading] = useState(false);
    const [gmapsStats, setGmapsStats] = useState<{ totalPlaces: number; recentRuns: number } | null>(null);
    const [gmapsRuns, setGmapsRuns] = useState<GMapsIngestionRun[]>([]);

    // Load watchlist and GMaps stats
    useEffect(() => {
        loadWatchlist();
        loadGMapsData();
    }, []);

    const loadGMapsData = async () => {
        try {
            const [stats, runs] = await Promise.all([
                getGMapsStats(),
                getRecentGMapsRuns(5),
            ]);
            setGmapsStats(stats);
            setGmapsRuns(runs);
        } catch (e) {
            console.error('Failed to load GMaps data', e);
        }
    };

    const handleGMapsSearch = async () => {
        if (!gmapsLocation.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Location is required' });
            return;
        }
        setGmapsLoading(true);
        try {
            const run = await triggerDispensarySearch(
                gmapsLocation,
                ['dispensary', 'cannabis', 'marijuana store'],
                parseInt(gmapsMaxResults) || 50
            );
            toast({
                title: 'Google Maps Search Started',
                description: `Searching for dispensaries in ${gmapsLocation}. Run ID: ${run.id}`
            });
            await loadGMapsData();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setGmapsLoading(false);
        }
    };

    const loadWatchlist = async () => {
        setLoading(true);
        try {
            const data = await getWatchlist();
            setWatchlist(data);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleAddCompetitor = async () => {
        if (!newName || !newUrl || !newState) {
            toast({ variant: 'destructive', title: 'Missing fields', description: 'Name, URL, and State are required' });
            return;
        }

        setAdding(true);
        try {
            await addToWatchlist({
                name: newName,
                leaflyUrl: newUrl,
                state: newState,
                city: newCity,
                discoveryFrequency: newFrequency,
                enabled: true,
            });

            toast({ title: 'Competitor Added', description: `${newName} added to watchlist` });
            setAddDialogOpen(false);
            setNewName('');
            setNewUrl('');
            setNewState('');
            setNewCity('');
            await loadWatchlist();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setAdding(false);
        }
    };

    const handleDiscoverCompetitor = async (entry: CompetitorWatchlistEntry) => {
        setDiscovering(entry.id);
        try {
            const run = await triggerSingleStoreDiscovery(entry.leaflyUrl);
            toast({
                title: 'Discovery Started',
                description: `Discovering ${entry.name}. Run ID: ${run.id}. Check back in 2-5 minutes.`
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Discovery Failed', description: e.message });
        } finally {
            setDiscovering(null);
        }
    };

    const handleRemoveCompetitor = async (id: string) => {
        try {
            await removeFromWatchlist(id);
            toast({ title: 'Removed', description: 'Competitor removed from watchlist' });
            await loadWatchlist();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    const handleStateDiscovery = async () => {
        if (!scanState) {
            toast({ variant: 'destructive', title: 'Missing state', description: 'Select a state to discover' });
            return;
        }

        setRunningStateScan(true);
        try {
            const run = await triggerStateDiscovery(scanState, parseInt(scanMaxStores) || 25);
            toast({
                title: 'State Discovery Started',
                description: `Discovering up to ${scanMaxStores} dispensaries in ${scanState}. Run ID: ${run.id}`
            });
            setStateScanOpen(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Discovery Failed', description: e.message });
        } finally {
            setRunningStateScan(false);
        }
    };

    const loadIntel = async () => {
        setLoadingIntel(true);
        try {
            const [bands, offers] = await Promise.all([
                getPricingBands(intelState, intelCategory),
                getActivePromos(intelState),
            ]);
            setPricingBands(bands);
            setPromos(offers);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setLoadingIntel(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Competitive Intel</h2>
                    <p className="text-muted-foreground">Monitor competitor menus via BakedBot Discovery</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={stateScanOpen} onOpenChange={setStateScanOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Eye className="h-4 w-4 mr-2" />
                                Discover State
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>State Discovery Scan</DialogTitle>
                                <DialogDescription>
                                    Discover dispensaries in a state. This uses Apify credits.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>State</Label>
                                    <Select value={scanState} onValueChange={setScanState}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select state" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {US_STATES.map(s => (
                                                <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Max Stores</Label>
                                    <Input
                                        type="number"
                                        value={scanMaxStores}
                                        onChange={(e) => setScanMaxStores(e.target.value)}
                                        placeholder="25"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Cost: ~$3 per 1,000 results. 25 stores ≈ $0.50
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setStateScanOpen(false)}>Cancel</Button>
                                <Button onClick={handleStateDiscovery} disabled={runningStateScan}>
                                    {runningStateScan && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Start Discovery
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Competitor
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Competitor</DialogTitle>
                                <DialogDescription>
                                    Add a dispensary to your competitive watchlist
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Curaleaf Western"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Leafly URL</Label>
                                    <Input
                                        value={newUrl}
                                        onChange={(e) => setNewUrl(e.target.value)}
                                        placeholder="https://www.leafly.com/dispensary-info/..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>State</Label>
                                        <Select value={newState} onValueChange={setNewState}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {US_STATES.map(s => (
                                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>City</Label>
                                        <Input
                                            value={newCity}
                                            onChange={(e) => setNewCity(e.target.value)}
                                            placeholder="Detroit"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Discovery Frequency</Label>
                                    <Select value={newFrequency} onValueChange={(v) => setNewFrequency(v as any)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Daily</SelectItem>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddCompetitor} disabled={adding}>
                                    {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Add to Watchlist
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Watchlist */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            Competitor Watchlist
                        </CardTitle>
                        <CardDescription>
                            {watchlist.length} dispensaries tracked
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : watchlist.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                No competitors added yet. Click "Add Competitor" to start.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Frequency</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {watchlist.map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="font-medium">{entry.name}</TableCell>
                                            <TableCell>
                                                {entry.city && `${entry.city}, `}{entry.state}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{entry.discoveryFrequency}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDiscoverCompetitor(entry)}
                                                        disabled={discovering === entry.id}
                                                    >
                                                        {discovering === entry.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Play className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveCompetitor(entry.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Pricing Intel */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Pricing Intel
                        </CardTitle>
                        <CardDescription>
                            Average pricing bands by category
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Select value={intelState} onValueChange={setIntelState}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="State" />
                                </SelectTrigger>
                                <SelectContent>
                                    {US_STATES.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={intelCategory} onValueChange={setIntelCategory}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={loadIntel} disabled={loadingIntel}>
                                {loadingIntel ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <TrendingUp className="h-4 w-4" />
                                )}
                            </Button>
                        </div>

                        {pricingBands && (
                            <div className="grid grid-cols-3 gap-4">
                                <div className="rounded-lg border p-4 text-center">
                                    <div className="text-sm text-muted-foreground">Min</div>
                                    <div className="text-2xl font-bold text-green-600">
                                        ${pricingBands.min.toFixed(2)}
                                    </div>
                                </div>
                                <div className="rounded-lg border p-4 text-center">
                                    <div className="text-sm text-muted-foreground">Average</div>
                                    <div className="text-2xl font-bold">
                                        ${pricingBands.avg.toFixed(2)}
                                    </div>
                                </div>
                                <div className="rounded-lg border p-4 text-center">
                                    <div className="text-sm text-muted-foreground">Max</div>
                                    <div className="text-2xl font-bold text-red-600">
                                        ${pricingBands.max.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {pricingBands && pricingBands.count === 0 && (
                            <p className="text-center text-muted-foreground py-4">
                                No data yet. Run a state scan first.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Active Promos */}
            {promos.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Tag className="h-5 w-5" />
                            Active Promotions in {intelState}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {promos.slice(0, 6).map((promo) => (
                                <div key={promo.id} className="rounded-lg border p-4 space-y-2">
                                    <div className="font-medium">{promo.title}</div>
                                    <div className="text-sm text-muted-foreground">{promo.dispensaryName}</div>
                                    {promo.discountPercent && (
                                        <Badge className="bg-green-100 text-green-800">
                                            {promo.discountPercent}% off
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
            {/* Google Maps Discovery */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Google Maps Discovery
                    </CardTitle>
                    <CardDescription>
                        Find dispensaries via Google Maps - discover locations not in Leafly
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <Label>Location</Label>
                            <Input
                                placeholder="Detroit, MI"
                                value={gmapsLocation}
                                onChange={(e) => setGmapsLocation(e.target.value)}
                            />
                        </div>
                        <div className="w-32 space-y-2">
                            <Label>Max Results</Label>
                            <Input
                                type="number"
                                value={gmapsMaxResults}
                                onChange={(e) => setGmapsMaxResults(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleGMapsSearch} disabled={gmapsLoading}>
                            {gmapsLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Search Google Maps
                        </Button>
                    </div>

                    {/* Stats */}
                    {gmapsStats && (
                        <div className="flex gap-4">
                            <div className="text-sm">
                                <span className="text-muted-foreground">Total Places: </span>
                                <strong>{gmapsStats.totalPlaces}</strong>
                            </div>
                            <div className="text-sm">
                                <span className="text-muted-foreground">Recent Runs: </span>
                                <strong>{gmapsStats.recentRuns}</strong>
                            </div>
                        </div>
                    )}

                    {/* Recent Runs */}
                    {gmapsRuns.length > 0 && (
                        <div className="space-y-2">
                            <Label>Recent Google Maps Runs</Label>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Places Found</TableHead>
                                        <TableHead>Started</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {gmapsRuns.map((run) => (
                                        <TableRow key={run.id}>
                                            <TableCell>{run.location || 'Custom Geo'}</TableCell>
                                            <TableCell>
                                                <Badge variant={run.status === 'completed' ? 'default' : 'secondary'}>
                                                    {run.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{run.placesFound}</TableCell>
                                            <TableCell suppressHydrationWarning>{run.startedAt.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
