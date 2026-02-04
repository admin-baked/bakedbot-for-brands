'use client';

import { useState, useTransition } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Save, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    generateProductDescriptionAI,
    generateBulkDescriptionsAI,
    saveGeneratedDescription,
    saveBulkGeneratedDescriptions
} from '../actions';
import type { Product } from '@/types/domain';
import { Progress } from '@/components/ui/progress';

interface AIDescriptionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product?: Product | null; // Single product mode
    products?: Product[]; // Bulk mode
    onSuccess?: () => void;
}

export function AIDescriptionDialog({
    open,
    onOpenChange,
    product,
    products,
    onSuccess
}: AIDescriptionDialogProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [generatedDescription, setGeneratedDescription] = useState<string>('');
    const [bulkResults, setBulkResults] = useState<{ productId: string; productName: string; description?: string; error?: string }[]>([]);
    const [bulkProgress, setBulkProgress] = useState(0);
    const [copied, setCopied] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const isBulkMode = products && products.length > 0;
    const title = isBulkMode
        ? `Generate Descriptions for ${products.length} Products`
        : `Generate Description for "${product?.name}"`;

    const handleGenerate = () => {
        if (isBulkMode && products) {
            // Bulk mode
            startTransition(async () => {
                setBulkResults([]);
                setBulkProgress(0);

                const productIds = products.map(p => p.id);
                const result = await generateBulkDescriptionsAI(productIds);

                if (result.success && result.results) {
                    const mapped = result.results.map(r => {
                        const p = products.find(prod => prod.id === r.productId);
                        return {
                            productId: r.productId,
                            productName: p?.name || 'Unknown',
                            description: r.description,
                            error: r.error
                        };
                    });
                    setBulkResults(mapped);
                    setBulkProgress(100);

                    const successCount = mapped.filter(r => r.description).length;
                    toast({
                        title: 'Generation Complete',
                        description: `Generated ${successCount} of ${products.length} descriptions.`
                    });
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Generation Failed',
                        description: result.error || 'Failed to generate descriptions'
                    });
                }
            });
        } else if (product) {
            // Single mode
            startTransition(async () => {
                setGeneratedDescription('');
                const result = await generateProductDescriptionAI(product.id);

                if (result.success && result.description) {
                    setGeneratedDescription(result.description);
                    toast({
                        title: 'Description Generated',
                        description: 'Review and save the generated description.'
                    });
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Generation Failed',
                        description: result.error || 'Failed to generate description'
                    });
                }
            });
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (isBulkMode) {
                const updates = bulkResults
                    .filter(r => r.description)
                    .map(r => ({ productId: r.productId, description: r.description! }));

                const result = await saveBulkGeneratedDescriptions(updates);
                if (result.success) {
                    toast({
                        title: 'Saved',
                        description: `Updated ${updates.length} product descriptions.`
                    });
                    onOpenChange(false);
                    onSuccess?.();
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Save Failed',
                        description: result.error
                    });
                }
            } else if (product && generatedDescription) {
                const result = await saveGeneratedDescription(product.id, generatedDescription);
                if (result.success) {
                    toast({
                        title: 'Saved',
                        description: 'Product description updated successfully.'
                    });
                    onOpenChange(false);
                    onSuccess?.();
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Save Failed',
                        description: result.error
                    });
                }
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopy = () => {
        if (generatedDescription) {
            navigator.clipboard.writeText(generatedDescription);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setGeneratedDescription('');
        setBulkResults([]);
        setBulkProgress(0);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        Generate SEO-optimized product descriptions using AI.
                        Review the generated content before saving.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Single Product Mode */}
                    {!isBulkMode && product && (
                        <>
                            <div className="text-sm text-muted-foreground">
                                <p><strong>Current:</strong> {product.description || 'No description'}</p>
                            </div>

                            {generatedDescription ? (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Generated Description</label>
                                    <Textarea
                                        value={generatedDescription}
                                        onChange={(e) => setGeneratedDescription(e.target.value)}
                                        rows={6}
                                        className="resize-none"
                                    />
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={handleCopy}>
                                            {copied ? (
                                                <><Check className="h-4 w-4 mr-1" /> Copied</>
                                            ) : (
                                                <><Copy className="h-4 w-4 mr-1" /> Copy</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-8 border rounded-lg bg-muted/50">
                                    {isPending ? (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Generating description...</span>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">
                                            Click &quot;Generate&quot; to create an AI description
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Bulk Mode */}
                    {isBulkMode && products && (
                        <>
                            {bulkResults.length === 0 ? (
                                <div className="space-y-4">
                                    <div className="text-sm text-muted-foreground">
                                        <p>Products to process: {products.length}</p>
                                        <ul className="mt-2 max-h-32 overflow-y-auto text-xs">
                                            {products.slice(0, 10).map(p => (
                                                <li key={p.id} className="truncate">• {p.name}</li>
                                            ))}
                                            {products.length > 10 && (
                                                <li className="text-muted-foreground/70">
                                                    ...and {products.length - 10} more
                                                </li>
                                            )}
                                        </ul>
                                    </div>

                                    {isPending && (
                                        <div className="space-y-2">
                                            <Progress value={bulkProgress} />
                                            <p className="text-sm text-muted-foreground text-center">
                                                Processing... This may take a while.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {bulkResults.map((result, idx) => (
                                        <div key={result.productId} className="p-3 border rounded-lg text-sm">
                                            <div className="font-medium">{result.productName}</div>
                                            {result.description ? (
                                                <p className="text-muted-foreground mt-1 line-clamp-2">
                                                    {result.description}
                                                </p>
                                            ) : (
                                                <p className="text-destructive mt-1">
                                                    Error: {result.error}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>

                    {(!generatedDescription && bulkResults.length === 0) ? (
                        <Button onClick={handleGenerate} disabled={isPending}>
                            {isPending ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                            ) : (
                                <><Sparkles className="h-4 w-4 mr-2" /> Generate</>
                            )}
                        </Button>
                    ) : (
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="h-4 w-4 mr-2" /> Save</>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
