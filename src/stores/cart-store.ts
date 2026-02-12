// src/stores/cart-store.ts
/**
 * Cart store with persistence and abandoned cart tracking
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { trackCartEvent } from '@/lib/customer-analytics';

export type CartItem = {
    id: string;
    productId: string;
    name: string;
    price: number;
    imageUrl: string;
    quantity: number;
    brandId: string;
    brandName: string;
    category: string;
    dispensaryId: string;
    dispensaryName: string;
    displayWeight?: string;
    thcPercent?: number;
    cbdPercent?: number;
};

export type CartState = {
    items: CartItem[];
    selectedDispensaryId: string | null;
    selectedDispensaryName: string | null;
    lastModified: number;
    sessionId: string;
};

export type CartActions = {
    addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    setDispensary: (dispensaryId: string, dispensaryName: string) => void;
    getTotal: () => { subtotal: number; tax: number; total: number; itemCount: number };
    hasItems: () => boolean;
};

type CartStore = CartState & CartActions;

// Generate unique session ID
const generateSessionId = () => {
    return `cart_${Date.now()}_${Math.random().toString(36).substring(7)}`;
};

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            // Initial state
            items: [],
            selectedDispensaryId: null,
            selectedDispensaryName: null,
            lastModified: Date.now(),
            sessionId: generateSessionId(),

            // Actions
            addItem: (item) => {
                const quantity = item.quantity || 1;
                const existingItem = get().items.find((i) => i.productId === item.productId);

                if (existingItem) {
                    set((state) => ({
                        items: state.items.map((i) =>
                            i.productId === item.productId
                                ? { ...i, quantity: i.quantity + quantity }
                                : i
                        ),
                        lastModified: Date.now(),
                    }));
                } else {
                    set((state) => ({
                        items: [
                            ...state.items,
                            {
                                ...item,
                                quantity,
                            },
                        ],
                        lastModified: Date.now(),
                    }));
                }

                // Track analytics event
                trackCartEvent('item_added', {
                    productId: item.productId,
                    productName: item.name,
                    price: item.price,
                    quantity,
                    brandId: item.brandId,
                    dispensaryId: item.dispensaryId,
                    sessionId: get().sessionId,
                });
            },

            removeItem: (productId) => {
                const item = get().items.find((i) => i.productId === productId);

                set((state) => ({
                    items: state.items.filter((i) => i.productId !== productId),
                    lastModified: Date.now(),
                }));

                if (item) {
                    trackCartEvent('item_removed', {
                        productId: item.productId,
                        productName: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        brandId: item.brandId,
                        dispensaryId: item.dispensaryId,
                        sessionId: get().sessionId,
                    });
                }
            },

            updateQuantity: (productId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(productId);
                    return;
                }

                const item = get().items.find((i) => i.productId === productId);
                const oldQuantity = item?.quantity || 0;

                set((state) => ({
                    items: state.items.map((i) =>
                        i.productId === productId ? { ...i, quantity } : i
                    ),
                    lastModified: Date.now(),
                }));

                if (item) {
                    trackCartEvent('quantity_updated', {
                        productId: item.productId,
                        productName: item.name,
                        oldQuantity,
                        newQuantity: quantity,
                        brandId: item.brandId,
                        dispensaryId: item.dispensaryId,
                        sessionId: get().sessionId,
                    });
                }
            },

            clearCart: () => {
                const itemCount = get().items.length;
                const total = get().getTotal().total;

                set({
                    items: [],
                    lastModified: Date.now(),
                });

                trackCartEvent('cart_cleared', {
                    itemCount,
                    total,
                    sessionId: get().sessionId,
                });
            },

            setDispensary: (dispensaryId, dispensaryName) => {
                set({
                    selectedDispensaryId: dispensaryId,
                    selectedDispensaryName: dispensaryName,
                    lastModified: Date.now(),
                });

                trackCartEvent('dispensary_selected', {
                    dispensaryId,
                    dispensaryName,
                    sessionId: get().sessionId,
                });
            },

            getTotal: () => {
                const items = get().items;
                const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                const tax = subtotal * 0.15; // 15% tax estimate
                const total = subtotal + tax;
                const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

                return { subtotal, tax, total, itemCount };
            },

            hasItems: () => {
                return get().items.length > 0;
            },
        }),
        {
            name: 'bakedbot-cart',
            partialize: (state) => ({
                items: state.items,
                selectedDispensaryId: state.selectedDispensaryId,
                selectedDispensaryName: state.selectedDispensaryName,
                lastModified: state.lastModified,
                sessionId: state.sessionId,
            }),
        }
    )
);

/**
 * Hook to check if cart is abandoned (no activity for 30 minutes)
 */
export function useIsCartAbandoned(): boolean {
    const lastModified = useCartStore((state) => state.lastModified);
    const hasItems = useCartStore((state) => state.hasItems());

    if (!hasItems) return false;

    const thirtyMinutes = 30 * 60 * 1000;
    return Date.now() - lastModified > thirtyMinutes;
}

/**
 * Get cart abandonment data for analytics
 */
export function getCartAbandonmentData() {
    const state = useCartStore.getState();

    return {
        sessionId: state.sessionId,
        items: state.items,
        total: state.getTotal().total,
        itemCount: state.items.length,
        lastModified: new Date(state.lastModified).toISOString(),
        dispensaryId: state.selectedDispensaryId,
        dispensaryName: state.selectedDispensaryName,
    };
}

/**
 * Save a cart abandonment snapshot when user leaves the page with items in cart.
 * Uses navigator.sendBeacon for reliable delivery on page hide.
 * Call this in a useEffect cleanup or visibilitychange handler.
 */
export function saveCartAbandonmentSnapshot(orgId?: string): void {
    const state = useCartStore.getState();
    if (state.items.length === 0) return;

    const snapshot = {
        items: state.items.map((i) => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            category: i.category,
        })),
        total: state.getTotal().total,
        itemCount: state.items.length,
        dispensaryId: state.selectedDispensaryId,
        dispensaryName: state.selectedDispensaryName,
    };

    // Fire and forget
    import('@/lib/customer-analytics').then(({ trackCartAbandonment }) => {
        trackCartAbandonment(snapshot, state.sessionId, orgId);
    });
}
