
'use client';

import { create } from 'zustand';

// This is a STUB implementation of the store for our stable restoration process.
// It only contains the state and actions needed by the header component.

export const useStore = create<{
  isDemo: boolean;
  setIsDemo: (isDemo: boolean) => void;
  getItemCount: () => number;
  setCartSheetOpen: (isOpen: boolean) => void;
  cartItems: any[]; // Stubbed
  getCartTotal: () => { total: number }; // Stubbed
}>((set) => ({
  isDemo: false,
  setIsDemo: (isDemo: boolean) => set({ isDemo }),
  getItemCount: () => 0, // Always returns 0 for now
  setCartSheetOpen: () => {}, // No-op
  cartItems: [],
  getCartTotal: () => ({ total: 0 }),
}));
