'use client';



import { Button } from '@/components/ui/button';
import { Plus, Loader2, Package, Sparkles, Check, Wand2, List } from 'lucide-react';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { useEffect, useState, useCallback } from 'react';
import { getBundles } from '@/app/actions/bundles';
import { generateAIBundleSuggestions, createBundleFromSuggestion, type SuggestedBundle } from '@/app/actions/bundle-suggestions';
import { BundleDeal } from '@/types/bundles';
import { useToast } from '@/hooks/use-toast';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { BundleForm } from '@/components/dashboard/bundles/bundle-form';
import { BundleRuleBuilder } from '@/components/dashboard/bundles/bundle-rule-builder';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BundlesPage() {
    const { dispensaryId, loading: idLoading } = useDispensaryId();
    const [bundles, setBundles] = useState<BundleDeal[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedBundle, setSelectedBundle] = useState<BundleDeal | undefined>(undefined);

    // AI Suggestions state
    const [isSuggestDialogOpen, setIsSuggestDialogOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<SuggestedBundle[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [creatingSuggestion, setCreatingSuggestion] = useState<string | null>(null);

    const fetchBundles = useCallback(async () => {
        if (!dispensaryId) return;
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
        fetchBundles();
    };

    const handleAISuggest = async () => {
        if (!dispensaryId) return;
        setIsSuggestDialogOpen(true);
        setLoadingSuggestions(true);
        setSuggestions([]);

        const result = await generateAIBundleSuggestions(dispensaryId);
        setLoadingSuggestions(false);

        if (result.success && result.suggestions) {
            setSuggestions(result.suggestions);
        } else {
            toast({
                title: "No Suggestions",
                description: result.error || "Could not generate suggestions. Make sure you have products added.",
                variant: "destructive"
            });
        }
    };

    const handleAcceptSuggestion = async (suggestion: SuggestedBundle) => {
        if (!dispensaryId) return;
        setCreatingSuggestion(suggestion.name);

        const result = await createBundleFromSuggestion(dispensaryId, suggestion);
        setCreatingSuggestion(null);

        if (result.success) {
            toast({
                title: "Bundle Created",
                description: `"${suggestion.name}" has been added as a draft. Review and activate it when ready.`,
            });
            setSuggestions(prev => prev.filter(s => s.name !== suggestion.name));
            fetchBundles();
        } else {
            toast({
                title: "Failed to Create",
                description: result.error,
                variant: "destructive"
            });
        }
    };

    if (idLoading || (loading && dispensaryId && bundles.length === 0)) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold">Bundle Deals</h2>
                    <p className="text-sm text-muted-foreground">Create margin-protected bundles with AI-powered rules.</p>
                </div>
                <Button onClick={handleCreateOpen}>
                    <Plus className="h-4 w-4 mr-2" />
                    Manual Bundle
                </Button>
            </div>

            <Tabs defaultValue="ai-builder" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="ai-builder" className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4" />
                        AI Rule Builder
                    </TabsTrigger>
                    <TabsTrigger value="bundles" className="flex items-center gap-2">
                        <List className="h-4 w-4" />
                        Your Bundles ({bundles.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ai-builder" className="space-y-4">
                    {dispensaryId && (
                        <BundleRuleBuilder
                            orgId={dispensaryId}
                            onBundleCreated={fetchBundles}
                        />
                    )}
                </TabsContent>

                <TabsContent value="bundles" className="space-y-4">
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={handleAISuggest}>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Quick AI Suggestions
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {bundles.length === 0 ? (
                            <div className="p-12 border border-dashed rounded-lg bg-card/50 text-center text-muted-foreground flex flex-col items-center">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Package className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">No bundles yet</h3>
                                <p className="mb-4 max-w-sm">Use the AI Rule Builder to create your first margin-protected bundle deals.</p>
                                <div className="flex gap-2">
                                    <Button onClick={handleAISuggest} variant="outline">
                                        <Sparkles className="h-4 w-4 mr-2" />Quick Suggestions
                                    </Button>
                                    <Button onClick={handleCreateOpen}>Manual Create</Button>
                                </div>
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
                </TabsContent>
            </Tabs>

            {/* Bundle Form Sheet */}
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

            {/* AI Suggestions Dialog */}
            <Dialog open={isSuggestDialogOpen} onOpenChange={setIsSuggestDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            AI Bundle Suggestions
                        </DialogTitle>
                        <DialogDescription>
                            Based on your product catalog, here are some bundle ideas. Click to add them as drafts.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
                        {loadingSuggestions ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : suggestions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No suggestions available. Try adding more products first.</p>
                            </div>
                        ) : (
                            suggestions.map((suggestion, idx) => (
                                <Card key={idx} className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-semibold">{suggestion.name}</h4>
                                            {suggestion.badgeText && (
                                                <Badge variant="secondary" className="mt-1">{suggestion.badgeText}</Badge>
                                            )}
                                        </div>
                                        <Badge className="bg-green-100 text-green-700">{suggestion.savingsPercent}% OFF</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
                                    <div className="text-xs text-muted-foreground mb-3">
                                        Products: {suggestion.products.map(p => p.name).join(', ')}
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleAcceptSuggestion(suggestion)}
                                        disabled={creatingSuggestion === suggestion.name}
                                    >
                                        {creatingSuggestion === suggestion.name ? (
                                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</>
                                        ) : (
                                            <><Check className="h-4 w-4 mr-2" />Add as Draft</>
                                        )}
                                    </Button>
                                </Card>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
