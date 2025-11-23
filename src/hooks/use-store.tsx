
'use client';

import { create } from 'zustand';
import type { CartItem, Product, Retailer } from '@/types/domain';
import type { Theme } from '@/lib/themes';

// A minimal stub for the store, providing only what the header needs for now.
interface StoreState {
  isCartSheetOpen: boolean;
  isDemo: boolean;
  _hasHydrated: boolean;
}

interface StoreActions {
  getItemCount: () => number;
  setCartSheetOpen: (isOpen: boolean) => void;
  setIsDemo: (isDemo: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useStore = create<StoreState & StoreActions>()((set, get) => ({
    isCartSheetOpen: false,
    isDemo: true, // Default to true for now
    _hasHydrated: false,
    
    // Stubbed functions
    getItemCount: () => 0,
    setCartSheetOpen: (isOpen) => set({ isCartSheetOpen: isOpen }),
    setIsDemo: (isDemo) => set({ isDemo }),
    setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
}));

// Simulate rehydration for client-side stores
useStore.persist?.rehydrate();
