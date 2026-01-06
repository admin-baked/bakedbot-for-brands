'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Server, Loader2, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { triggerDiscoverySync } from '@/server/actions/discovery-search';
import { useToast } from '@/hooks/use-toast';
import { doc, onSnapshot } from 'firebase/firestore'; 
import { db } from '@/firebase/client';

interface SyncToggleProps {
    brandId: string;
    website?: string;
    initialStats?: {
        products: number;
        competitors: number;
        lastSynced: string | null;
    };
    type: 'brand' | 'dispensary';
}

export function SyncToggle({ brandId, website, initialStats, type }: SyncToggleProps) {
    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);
    const [productsFound, setProductsFound] = useState(initialStats?.products || 0);
    const [status, setStatus] = useState<string>('idle');
    const [lastSynced, setLastSynced] = useState<string | null>(initialStats?.lastSynced || null);

    // Subscribe to live sync updates
    useEffect(() => {
        // If we don't have a valid brandId, skip
        if (!brandId) return;

        // Listen to the organization document for syncStatus changes
        const unsub = onSnapshot(doc(db, 'organizations', brandId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const sync = data.syncStatus;
                
                if (sync) {
                    if (sync.status === 'syncing') {
                        setIsSyncing(true);
                        setStatus('syncing');
                    } else {
                        setIsSyncing(false);
                        setStatus(sync.status || 'idle');
                    }
                    
                    if (typeof sync.productsFound === 'number') {
                        setProductsFound(sync.productsFound);
                    }
                    
                    if (sync.lastSync) {
                        // Handle Firestore timestamp
                        const date = sync.lastSync.toDate ? sync.lastSync.toDate() : new Date(sync.lastSync);
                        setLastSynced(date.toLocaleTimeString());
                    }
                }
            }
        });

        return () => unsub();
    }, [brandId]);

    const handleSync = async () => {
        if (!website) {
            toast({ variant: 'destructive', title: 'No website linked', description: 'Please link your website first.' });
            return;
        }

        setIsSyncing(true);
        setStatus('starting');
        
        try {
            await triggerDiscoverySync(brandId, website, type);
            toast({ title: 'Sync started', description: 'BakedBot is scanning your site...' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Sync failed to start' });
            setIsSyncing(false);
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className={`flex items-center gap-2 px-3 py-1.5 border-2 rounded-md shadow-sm cursor-pointer hover:bg-muted/50 transition-colors ${isSyncing ? 'bg-emerald-50 border-emerald-200' : 'bg-background border-border'}`}>
                    <div className={`h-2 w-2 rounded-full ${isSyncing || status === 'syncing' ? 'bg-amber-500 animate-ping' : 'bg-green-500 animate-pulse'}`} />
                    <span className="text-[11px] font-black uppercase tracking-wider">
                        {isSyncing ? `Syncing (${productsFound})` : 'Live Data ON'}
                    </span>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end">
                <div className="p-3 bg-slate-950 text-white rounded-t-lg border-b border-slate-800">
                    <div className="flex justify-between items-center">
                        <div className="text-xs font-mono text-slate-400 mb-1">DATA STREAM</div>
                        {isSyncing && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                    </div>
                    <div className="text-sm font-semibold flex items-center gap-2">
                        <Server className={`h-4 w-4 ${isSyncing ? 'text-amber-400' : 'text-emerald-400'}`} />
                        {isSyncing ? 'BakedBot Discovery Active' : 'Active Sync'}
                    </div>
                </div>
                <div className="p-3 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Products Indexed</span>
                        <span className={`font-mono font-bold ${isSyncing ? 'text-emerald-600' : ''}`}>{productsFound}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                         {/* Placeholder for competitors until connected */}
                        <span className="text-muted-foreground">Competitors Found</span>
                        <span className="font-mono font-bold">{initialStats?.competitors || 0}</span>
                    </div>
                    
                    <div className="pt-3 border-t flex flex-col gap-2">
                        <div className="text-xs text-muted-foreground flex justify-between">
                            <span>Last Sync:</span>
                            <span>{lastSynced || 'Never'}</span>
                        </div>
                        
                        <Button 
                            size="sm" 
                            variant={isSyncing ? "outline" : "default"} 
                            className="w-full gap-2 h-8"
                            onClick={handleSync}
                            disabled={isSyncing}
                        >
                            {isSyncing ? (
                                <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-3 w-3" />
                                    Run BakedBot Discovery
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
