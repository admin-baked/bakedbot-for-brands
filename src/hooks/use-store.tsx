
'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Product } from '@/types/domain';
import type { Theme } from '@/lib/themes';

export type CartItem = Product & { quantity: number };

export interface StoreState {
  _hasHydrated: boolean;
  cartItems: CartItem[];
  isCartSheetOpen: boolean;
  selectedRetailerId: string | null;
  
  // UI Preferences
  theme: Theme;
  menuStyle: 'default' | 'alt';
  favoriteRetailerId: string | null;
  chatExperience: 'default' | 'classic';
  isCeoMode: boolean; // Not persisted
  isDemo: boolean; // Not persisted

  // Actions
  setHasHydrated: (hydrated: boolean) => void;
  setCartSheetOpen: (isOpen: boolean) => void;
  setSelectedRetailerId: (id: string | null) => void;
  setTheme: (theme: Theme) => void;
  setMenuStyle: (style: 'default' | 'alt') => void;
  setFavoriteRetailerId: (id: string | null) => void;
  setChatExperience: (experience: 'default' | 'classic') => void;
  setIsCeoMode: (isCeo: boolean) => void;
  setIsDemo: (isDemo: boolean) => void;
  
  // Cart Actions
  addToCart: (product: Product, retailerId?: string | null) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => { subtotal: number; taxes: number; total: number };
  getItemCount: () => number;
}


export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      cartItems: [],
      isCartSheetOpen: false,
      selectedRetailerId: null,

      // UI Preferences
      theme: 'green',
      menuStyle: 'default',
      favoriteRetailerId: null,
      chatExperience: 'default',
      isCeoMode: false,
      isDemo: false,

      // Actions
      setHasHydrated: (hydrated: boolean) => set({ _hasHydrated: hydrated }),
      setCartSheetOpen: (isOpen: boolean) => set({ isCartSheetOpen: isOpen }),
      setSelectedRetailerId: (id) => set({ selectedRetailerId: id }),
      setTheme: (theme) => set({ theme }),
      setMenuStyle: (style) => set({ menuStyle: style }),
      // When a user favorites a location, also select it for the current session.
      setFavoriteRetailerId: (id) => set({ favoriteRetailerId: id, selectedRetailerId: id }),
      setChatExperience: (experience) => set({ chatExperience: experience }),
      setIsCeoMode: (isCeo) => set({ isCeoMode: isCeo }),
      setIsDemo: (isDemo) => set({ isDemo }),
      
      // Cart Actions
      addToCart: (product, retailerId) =>
        set((state) => {
          if (!retailerId) {
            console.error("addToCart called without a retailerId.");
            return state;
          }

          const existingItem = state.cartItems.find((i) => i.id === product.id);
          
          const price = (product.prices?.[retailerId])
            ? product.prices[retailerId]
            : product.price;

          if (existingItem) {
            return {
              cartItems: state.cartItems.map((i) =>
                i.id === product.id ? { ...i, quantity: i.quantity + 1, price } : i
              ),
            };
          }
          return { cartItems: [...state.cartItems, { ...product, quantity: 1, price }] };
        }),

      removeFromCart: (itemId) =>
        set((state) => ({
          cartItems: state.cartItems.filter((i) => i.id !== itemId),
        })),

      updateQuantity: (itemId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { cartItems: state.cartItems.filter((i) => i.id !== itemId) };
          }
          return {
            cartItems: state.cartItems.map((i) =>
              i.id === itemId ? { ...i, quantity } : i
            ),
          };
        }),
        
      clearCart: () => set({ cartItems: [] }),

      getCartTotal: () => {
        const subtotal = get().cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
        const taxes = subtotal * 0.15; 
        const total = subtotal + taxes;
        return { subtotal, taxes, total };
      },

      getItemCount: () => {
        return get().cartItems.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'bakedbot-ui-preferences', 
      storage: createJSONStorage(() => localStorage), 
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
      // Persist UI preferences but exclude transactional state like cart or CEO mode.
      partialize: (state) => ({
        theme: state.theme,
        menuStyle: state.menuStyle,
        favoriteRetailerId: state.favoriteRetailerId,
        chatExperience: state.chatExperience,
        selectedRetailerId: state.selectedRetailerId,
        isDemo: state.isDemo, // Now persisting demo mode
      }),
    }
  )
);
