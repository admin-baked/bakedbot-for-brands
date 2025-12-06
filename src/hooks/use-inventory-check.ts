import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface InventoryStatus {
    available: boolean;
    price?: number;
    lastUpdated?: Date;
    loading: boolean;
    checked: boolean;
}

export function useInventoryCheck(productId: string) {
    const [status, setStatus] = useState<InventoryStatus>({
        available: true, // Optimistic default
        loading: false,
        checked: false
    });
    const { toast } = useToast();

    const checkAvailability = useCallback(async (retailerId: string) => {
        if (!retailerId) return;

        setStatus(prev => ({ ...prev, loading: true }));

        try {
            const res = await fetch(`/api/inventory/check?productId=${productId}&retailerId=${retailerId}`);
            if (!res.ok) throw new Error('Failed to check inventory');

            const data = await res.json();

            setStatus({
                available: data.available,
                price: data.price,
                lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : undefined,
                loading: false,
                checked: true
            });

            if (!data.available) {
                toast({
                    variant: "destructive",
                    title: "Out of Stock",
                    description: "This item is no longer available at the selected location.",
                });
            } else if (data.price) {
                // Optional: Notify if price changed?
                // For now, silent update is fine, the UI will bind to the returned price if we expose it.
            }

            return data;
        } catch (error) {
            console.error(error);
            setStatus(prev => ({ ...prev, loading: false }));
            // On error, default to available (don't block sale on API failure)
            return { available: true };
        }
    }, [productId, toast]);

    return {
        inventoryStatus: status,
        checkAvailability
    };
}
