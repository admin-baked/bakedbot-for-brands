'use client';

import { Button } from '@/components/ui/button';
import { Plus, Loader2, Package } from 'lucide-react';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { useEffect, useState, useCallback } from 'react';
import { getBundles } from '@/app/actions/bundles';
import { BundleDeal } from '@/types/bundles';
import { useToast } from '@/hooks/use-toast';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { BundleForm } from '@/components/dashboard/bundles/bundle-form';

export default function BundlesPage() {
    const { dispensaryId, loading: idLoading } = useDispensaryId();
    const [bundles, setBundles] = useState<BundleDeal[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedBundle, setSelectedBundle] = useState<BundleDeal | undefined>(undefined);

    const fetchBundles = useCallback(async () => {
        if (!dispensaryId) return;
        // setLoading(true); // Don't show full spinner on refresh
        const result = await getBundles(dispensaryId);
        if (result.success && result.data) {
            setBundles(result.data);
        } else {
            toast({
                title: "Error",
                description: "Failed to load bundles.",
                variant: "destructive"
            });
        }
        setLoading(false);
    }, [dispensaryId, toast]);

    useEffect(() => {
        if (!dispensaryId) {
            if (!idLoading) setLoading(false);
            return;
        }
        setLoading(true);
        fetchBundles();
    }, [dispensaryId, idLoading, fetchBundles]);

    const handleCreateOpen = () => {
        setSelectedBundle(undefined);
        setIsSheetOpen(true);
    };

    const handleEditOpen = (bundle: BundleDeal) => {
        setSelectedBundle(bundle);
        setIsSheetOpen(true);
    };

    const handleSuccess = () => {
        setIsSheetOpen(false);
        fetchBundles(); // Refresh list
    };

    if (idLoading || (loading && dispensaryId && bundles.length === 0)) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold">Your Bundles</h2>
                    <p className="text-sm text-muted-foreground">Manage your menu deals and packages.</p>
                </div>
                <Button onClick={handleCreateOpen}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Bundle
                </Button>
            </div>

            <div className="grid gap-4">
                {bundles.length === 0 ? (
                    <div className="p-12 border border-dashed rounded-lg bg-card/50 text-center text-muted-foreground flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">No bundles yet</h3>
                        <p className="mb-4 max-w-sm">Create your first product bundle to allow customers to buy multiple items at a discount.</p>
                        <Button onClick={handleCreateOpen} variant="outline">Create Bundle</Button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {bundles.map(bundle => (
                            <div
                                key={bundle.id}
                                className="p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow cursor-pointer hover:border-primary/50 relative group"
                                onClick={() => handleEditOpen(bundle)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold truncate pr-2">{bundle.name}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${bundle.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            'bg-muted text-muted-foreground'
                                        }`}>
                                        {bundle.status}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                                    {bundle.description || "No description provided."}
                                </p>
                                <div className="text-sm border-t pt-3 flex justify-between items-center text-muted-foreground">
                                    <span className="font-medium">{bundle.products.length} Products</span>
                                    <span className="text-xs uppercase tracking-wider">
                                        {bundle.type.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{selectedBundle ? 'Edit Bundle' : 'Create New Bundle'}</SheetTitle>
                        <SheetDescription>
                            Configure your bundle details, type, and status.
                        </SheetDescription>
                    </SheetHeader>
                    {dispensaryId && (
                        <div className="mt-8">
                            <BundleForm
                                initialData={selectedBundle}
                                orgId={dispensaryId}
                                onSuccess={handleSuccess}
                                onCancel={() => setIsSheetOpen(false)}
                            />
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
