'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TrendingUp, DollarSign, Tag, Zap, Clock, Search } from 'lucide-react';
import {
    runLiteSnapshot,
    getCachedSnapshot,
    addEzalCompetitor,
    getEzalCompetitors,
} from '@/server/services/ezal-lite-connector';
import type { EzalSnapshot, EzalCompetitor } from '@/types/ezal-snapshot';

interface EzalSnapshotCardProps {
    /** User's state for default filtering */
    userState?: string;
    /** User's city for local context */
    userCity?: string;
    /** Allow adding competitors (for paid tiers) */
    allowAddCompetitor?: boolean;
    /** Compact mode for smaller spaces */
    compact?: boolean;
}

/**
 * Ezal Lite Snapshot Card
 * Shows cheap competitive intelligence (~$0.10/snapshot)
 * Available for all roles: Brand, Dispensary, CEO
 */
export function EzalSnapshotCard({
    userState = 'Michigan',
    userCity,
    allowAddCompetitor = false,
    compact = false,
}: EzalSnapshotCardProps) {
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [snapshot, setSnapshot] = useState<EzalSnapshot | null>(null);
    const [competitors, setCompetitors] = useState<EzalCompetitor[]>([]);
    const [selectedCompetitor, setSelectedCompetitor] = useState<EzalCompetitor | null>(null);

    // Add competitor form
    const [newUrl, setNewUrl] = useState('');
    const [newName, setNewName] = useState('');
    const [adding, setAdding] = useState(false);
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        loadCompetitors();
    }, []);

    const loadCompetitors = async () => {
        setLoading(true);
        try {
            const comps = await getEzalCompetitors(10);
            setCompetitors(comps);

            // Auto-select first competitor if exists
            if (comps.length > 0) {
                setSelectedCompetitor(comps[0]);
                await loadSnapshot(comps[0]);
            }
        } catch (e) {
            console.error('Failed to load competitors', e);
        } finally {
            setLoading(false);
        }
    };

    const loadSnapshot = async (competitor: EzalCompetitor) => {
        try {
            const cached = await getCachedSnapshot(competitor.id);
            setSnapshot(cached);
        } catch (e) {
            console.error('Failed to load snapshot', e);
        }
    };

    const handleScan = async () => {
        if (!selectedCompetitor) return;

        setScanning(true);
        try {
            const result = await runLiteSnapshot(
                selectedCompetitor.id,
                selectedCompetitor.name,
                selectedCompetitor.url,
                true // force refresh
            );
            setSnapshot(result);
            toast({
                title: 'Snapshot Complete',
                description: `Found ${result.priceRange.count} prices, ${result.promoCount} promos`,
            });
        } catch (e: any) {
            toast({
                variant: 'destructive',
                title: 'Scan Failed',
                description: e.message,
            });
        } finally {
            setScanning(false);
        }
    };

    const handleAddCompetitor = async () => {
        if (!newUrl || !newName) {
            toast({ variant: 'destructive', title: 'Error', description: 'Name and URL required' });
            return;
        }

        setAdding(true);
        try {
            const comp = await addEzalCompetitor(newName, newUrl, userState, userCity);
            setCompetitors(prev => [comp, ...prev]);
            setSelectedCompetitor(comp);
            setNewUrl('');
            setNewName('');
            toast({ title: 'Competitor Added', description: comp.name });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setAdding(false);
        }
    };

    const selectCompetitor = async (comp: EzalCompetitor) => {
        setSelectedCompetitor(comp);
        await loadSnapshot(comp);
    };

    if (loading) {
        return (
            <Card className={compact ? 'p-4' : ''}>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={compact ? 'p-4' : ''}>
            <CardHeader className={compact ? 'pb-2' : ''}>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Ezal Lite
                    <Badge variant="secondary" className="text-xs">~$0.10/scan</Badge>
                </CardTitle>
                <CardDescription>
                    Competitive intelligence snapshot
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Competitor Selector */}
                {competitors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {competitors.slice(0, 5).map(comp => (
                            <Button
                                key={comp.id}
                                size="sm"
                                variant={selectedCompetitor?.id === comp.id ? 'default' : 'outline'}
                                onClick={() => selectCompetitor(comp)}
                            >
                                {comp.name}
                            </Button>
                        ))}
                    </div>
                )}

                {/* Snapshot Display */}
                {snapshot && (
                    <div className="space-y-3">
                        {/* Price Range */}
                        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                            <DollarSign className="h-8 w-8 text-green-600" />
                            <div>
                                <div className="text-2xl font-bold">
                                    ${snapshot.priceRange.min} - ${snapshot.priceRange.max}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {snapshot.priceRange.count} prices found • Median: ${snapshot.priceRange.median}
                                </div>
                            </div>
                        </div>

                        {/* Promos */}
                        {snapshot.promoCount > 0 && (
                            <div className="flex items-center gap-3">
                                <Tag className="h-5 w-5 text-purple-600" />
                                <div className="flex flex-wrap gap-1">
                                    {snapshot.promoSignals.slice(0, 5).map((promo, i) => (
                                        <Badge key={i} variant="secondary">{promo}</Badge>
                                    ))}
                                    {snapshot.promoCount > 5 && (
                                        <Badge variant="outline">+{snapshot.promoCount - 5} more</Badge>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Categories */}
                        {snapshot.categorySignals.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {snapshot.categorySignals.map((cat, i) => (
                                    <Badge key={i} variant="outline" className="capitalize">{cat}</Badge>
                                ))}
                            </div>
                        )}

                        {/* Freshness */}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Scraped {(() => {
                                    try {
                                        const date = new Date(snapshot.scrapedAt);
                                        return isNaN(date.getTime()) ? 'Recently' : date.toLocaleDateString();
                                    } catch (e) {
                                        return 'Recently';
                                    }
                                })()}
                            </div>
                            <Badge variant={snapshot.freshness === 'fresh' ? 'default' : 'secondary'}>
                                {snapshot.freshness}
                            </Badge>
                        </div>
                    </div>
                )}

                {/* No Snapshot */}
                {!snapshot && selectedCompetitor && (
                    <div className="text-center py-4 text-muted-foreground">
                        No snapshot yet. Click "Scan Now" to get competitive intel.
                    </div>
                )}

                {/* No Competitors */}
                {competitors.length === 0 && !allowAddCompetitor && (
                    <div className="text-center py-4 text-muted-foreground">
                        No competitors tracked yet.
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    {selectedCompetitor && (
                        <Button onClick={handleScan} disabled={scanning} className="flex-1">
                            {scanning ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Scanning...
                                </>
                            ) : (
                                <>
                                    <Search className="h-4 w-4 mr-2" />
                                    Scan Now
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {/* Add Competitor (for paid tiers or admin) */}
                {allowAddCompetitor && (
                    <div className="pt-2 border-t space-y-2">
                        <div className="text-sm font-medium">Add Competitor</div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-32"
                            />
                            <Input
                                placeholder="https://leafly.com/..."
                                value={newUrl}
                                onChange={(e) => setNewUrl(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={handleAddCompetitor} disabled={adding} size="sm">
                                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
