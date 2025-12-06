'use client';

import { useEffect, useState } from 'react';
import { useOptionalFirebase } from '@/firebase/use-optional-firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

export function ImportProgress({ brandId }: { brandId: string }) {
    const firebase = useOptionalFirebase();
    const { toast } = useToast();
    const [status, setStatus] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!firebase?.firestore || !brandId) return;

        // Listen for the most recent sync status for this brand
        const q = query(
            collection(firebase.firestore, 'sync_status'),
            where('brandId', '==', brandId),
            orderBy('startTime', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                setStatus(null);
                setIsVisible(false);
                return;
            }

            const data = snapshot.docs[0].data();
            const isRecent = data.startTime?.toDate().getTime() > Date.now() - 1000 * 60 * 60; // Max 1 hour old

            if (!isRecent && data.status !== 'in_progress') {
                setIsVisible(false);
                return;
            }

            setStatus(data);
            setIsVisible(true);

            // Toast notifications on completion
            if (data.status === 'completed' && isVisible) { // Only toast if we were watching
                toast({
                    title: 'Menu Sync Completed',
                    description: `Processed ${data.retailersProcessed} retailers and ${data.productsProcessed} products.`,
                });
                // Hide after a delay
                setTimeout(() => setIsVisible(false), 5000);
            } else if (data.status === 'failed' && isVisible) {
                toast({
                    variant: 'destructive',
                    title: 'Menu Sync Failed',
                    description: data.error || 'Unknown error occurred.',
                });
            }
        });

        return () => unsubscribe();
    }, [firebase, brandId, toast, isVisible]);

    if (!isVisible || !status) return null;

    if (status.status !== 'in_progress') return null;

    return (
        <div className="fixed top-4 right-4 z-50 w-80 bg-white dark:bg-zinc-900 border rounded-lg shadow-lg p-4 animate-in slide-in-from-right-5">
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="font-medium text-sm">Syncing Menu...</span>
                </div>
                <span className="text-xs text-muted-foreground">{status.retailersProcessed} retailers</span>
            </div>

            {status.currentRetailer && (
                <p className="text-xs text-muted-foreground truncate mb-2">
                    Checking {status.currentRetailer}...
                </p>
            )}

            <Progress value={undefined} className="h-1" />
        </div>
    );
}
