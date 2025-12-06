'use client';

import { useStore } from '@/hooks/use-store';
import { useInventoryCheck } from '@/hooks/use-inventory-check';
import { useEffect } from 'react';
import type { Product } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export function ProductAvailability({ product }: { product: Product }) {
    const { selectedRetailerId } = useStore();
    const { inventoryStatus, checkAvailability } = useInventoryCheck(product.id);

    useEffect(() => {
        if (selectedRetailerId) {
            checkAvailability(selectedRetailerId);
        }
    }, [selectedRetailerId, checkAvailability]);

    if (!selectedRetailerId) {
        // Show base price range or starting price
        return (
            <div className="flex items-center gap-4 mb-6">
                <span className="text-2xl font-bold text-primary">
                    ${product.price.toFixed(2)}
                </span>
            </div>
        );
    }

    if (inventoryStatus.loading) {
        return (
            <div className="flex items-center gap-4 mb-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground text-sm">Checking availability...</span>
            </div>
        );
    }

    const displayPrice = inventoryStatus.price || (product.prices?.[selectedRetailerId] ?? product.price);

    return (
        <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-primary">
                    ${displayPrice.toFixed(2)}
                </span>
                {!inventoryStatus.available && (
                    <Badge variant="destructive">Out of Stock</Badge>
                )}
                {inventoryStatus.available && inventoryStatus.checked && (
                    <Badge variant="outline" className="text-green-600 border-green-600">In Stock</Badge>
                )}
            </div>
            {inventoryStatus.checked && (
                <p className="text-xs text-muted-foreground">
                    Verified just now
                </p>
            )}
        </div>
    );
}
