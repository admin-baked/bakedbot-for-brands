'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BundleDeal, BundleProduct } from '@/types/bundles';
import { Plus, Check, Sparkles, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import Image from 'next/image';

interface BundleBuilderProps {
    deal: BundleDeal;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Mock eligible products - normally fetched based on deal criteria
const MOCK_ELIGIBLE_PRODUCTS = [
    { id: 'prod-1', name: 'Camino Midnight Blueberry', category: 'Edible', price: 22.00, image: '/placeholder.jpg', tags: ['Sleep', 'Indica'] },
    { id: 'prod-2', name: 'Camino Wild Berry', category: 'Edible', price: 22.00, image: '/placeholder.jpg', tags: ['Chill', 'Indica'] },
    { id: 'prod-3', name: 'Camino Pineapple Hab.', category: 'Edible', price: 22.00, image: '/placeholder.jpg', tags: ['Energy', 'Sativa'] },
    { id: 'prod-4', name: 'Camino Watermelon Lemonade', category: 'Edible', price: 22.00, image: '/placeholder.jpg', tags: ['Bliss', 'Hybrid'] },
];

export function BundleBuilder({ deal, open, onOpenChange }: BundleBuilderProps) {
    // Determine how many slots we need. For Mix & Match "Buy 3", it's 3 slots.
    // Simplifying: assuming deal.minProducts holds the required count (e.g., 3)
    const requiredCount = deal.minProducts || 3;
    const [slots, setSlots] = useState<any[]>(Array(requiredCount).fill(null));

    const handleSelectProduct = (product: any) => {
        // Find first empty slot
        const emptySlotIndex = slots.findIndex(s => s === null);
        if (emptySlotIndex !== -1) {
            const newSlots = [...slots];
            newSlots[emptySlotIndex] = product;
            setSlots(newSlots);
        }
    };

    const handleRemoveProduct = (index: number) => {
        const newSlots = [...slots];
        newSlots[index] = null;
        setSlots(newSlots);
    };

    const isComplete = slots.every(s => s !== null);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b shrink-0 bg-secondary/20">
                    <div className="flex items-start justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                {deal.name}
                                <Badge variant="secondary" className="ml-2 font-normal">
                                    {deal.type === 'mix_match' ? 'Mix & Match' : 'Bundle'}
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-base mt-2">
                                {deal.description}
                            </DialogDescription>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-primary">${deal.bundlePrice.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground line-through">
                                Value: ${(deal.originalTotal || (22 * requiredCount)).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Product Selection */}
                    <div className="w-full md:w-2/3 flex flex-col border-r">
                        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                            <h3 className="font-semibold">Select {requiredCount} Items</h3>
                            <div className="flex gap-2">
                                {/* AI Agent Recommendation Toggle or Badge */}
                                <Badge variant="outline" className="gap-1 bg-background">
                                    <Sparkles className="h-3 w-3 text-purple-500" />
                                    AI Recommendations Active
                                </Badge>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                {MOCK_ELIGIBLE_PRODUCTS.map((product) => (
                                    <Card
                                        key={product.id}
                                        className="cursor-pointer hover:border-primary transition-all group relative overflow-hidden"
                                        onClick={() => handleSelectProduct(product)}
                                    >
                                        <div className="aspect-square bg-muted relative">
                                            {/* Placeholder Image */}
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                                Image
                                            </div>
                                            {/* AI Badge for specific products */}
                                            {product.tags.includes('Sleep') && (
                                                <div className="absolute top-2 right-2 bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm">
                                                    <Sparkles className="h-2 w-2" /> Top Pick
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <h4 className="font-medium text-sm line-clamp-1">{product.name}</h4>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-xs text-muted-foreground">{product.category}</span>
                                                <span className="font-bold text-sm">${product.price.toFixed(2)}</span>
                                            </div>
                                            <Button size="sm" variant="secondary" className="w-full mt-2 h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus className="h-3 w-3 mr-1" /> Add
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right: Bundle State (Slots) */}
                    <div className="w-full md:w-1/3 bg-secondary/10 flex flex-col">
                        <div className="p-4 border-b">
                            <h3 className="font-semibold">Your Bundle</h3>
                            <p className="text-xs text-muted-foreground">
                                {slots.filter(s => s !== null).length} of {requiredCount} items selected
                            </p>
                        </div>

                        <div className="flex-1 p-4 space-y-4">
                            {slots.map((slot, idx) => (
                                <div
                                    key={idx}
                                    className={`
                                        h-24 border-2 border-dashed rounded-xl flex items-center justify-center relative overflow-hidden transition-all
                                        ${slot ? 'border-solid border-primary/20 bg-background' : 'border-muted-foreground/30 hover:border-primary/50'}
                                    `}
                                >
                                    {slot ? (
                                        <div className="flex items-center gap-3 p-3 w-full">
                                            <div className="h-16 w-16 bg-muted rounded-md shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">{slot.name}</div>
                                                <div className="text-xs text-muted-foreground">${slot.price.toFixed(2)}</div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleRemoveProduct(idx)}
                                            >
                                                <span className="sr-only">Remove</span>
                                                &times;
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center text-muted-foreground/50">
                                            <Plus className="h-8 w-8 mb-1" />
                                            <span className="text-xs font-medium uppercase tracking-wider">Add Item</span>
                                        </div>
                                    )}

                                    <div className="absolute top-2 left-2 text-[10px] font-bold text-muted-foreground/50">
                                        0{idx + 1}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t bg-background mt-auto">
                            {!isComplete && (
                                <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                    Add {slots.filter(s => s === null).length} more item(s) to unlock this deal.
                                </div>
                            )}

                            <Button
                                className="w-full h-12 text-lg font-bold"
                                disabled={!isComplete}
                            >
                                {isComplete ? (
                                    <>
                                        Add Bundle to Cart - ${deal.bundlePrice.toFixed(2)}
                                    </>
                                ) : (
                                    'Complete Bundle to Add'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
