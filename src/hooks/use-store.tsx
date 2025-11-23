
'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartItem, Product, Retailer } from '@/types/domain';
import type { Theme } from '@/lib/themes';

type MenuStyle = 'grid' | 'alt';

interface StoreState {
  cartItems: CartItem[];
  isCartSheetOpen: boolean;
  selectedRetailerId: string | null;
  favoriteRetailerId: string | null;
  theme: Theme;
  menuStyle: MenuStyle;
  isDemo: boolean;
  chatExperience: 'default' | 'v1';
  _hasHydrated: boolean;
}

interface StoreActions {
  addToCart: (product: Product, retailerId: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setCartSheetOpen: (isOpen: boolean) => void;
  getCartTotal: () => { subtotal: number; taxes: number; total: number };
  getItemCount: () => number;
  setSelectedRetailerId: (id: string | null) => void;
  setFavoriteRetailerId: (id: string | null) => void;
  setTheme: (theme: Theme) => void;
  setMenuStyle: (style: MenuStyle) => void;
  setIsDemo: (isDemo: boolean) => void;
  setChatExperience: (exp: 'default' | 'v1') => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      cartItems: [],
      isCartSheetOpen: false,
      selectedRetailerId: null,
      favoriteRetailerId: null,
      theme: 'green',
      menuStyle: 'alt',
      isDemo: true,
      chatExperience: 'default',
      _hasHydrated: false,

      addToCart: (product, retailerId) => {
        if (get().selectedRetailerId && get().selectedRetailerId !== retailerId) {
            get().clearCart();
        }
        set((state) => {
          const existingItem = state.cartItems.find(item => item.id === product.id);
          if (existingItem) {
            return {
              cartItems: state.cartItems.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
              ),
              selectedRetailerId: retailerId,
            };
          }
          return { cartItems: [...state.cartItems, { ...product, quantity: 1 }], selectedRetailerId: retailerId };
        });
      },
      removeFromCart: (productId) =>
        set((state) => ({
          cartItems: state.cartItems.filter(item => item.id !== productId),
        })),
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
        } else {
          set((state) => ({
            cartItems: state.cartItems.map(item =>
              item.id === productId ? { ...item, quantity } : item
            ),
          }));
        }
      },
      clearCart: () => set({ cartItems: [] }),
      setCartSheetOpen: (isOpen) => set({ isCartSheetOpen: isOpen }),
      getCartTotal: () => {
        const subtotal = get().cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const taxes = subtotal * 0.15; // Example tax rate
        const total = subtotal + taxes;
        return { subtotal, taxes, total };
      },
      getItemCount: () => get().cartItems.reduce((sum, i) => sum + i.quantity, 0),
      setSelectedRetailerId: (id) => set({ selectedRetailerId: id }),
      setFavoriteRetailerId: (id) => set({ favoriteRetailerId: id }),
      setTheme: (theme) => set({ theme }),
      setMenuStyle: (style) => set({ menuStyle: style }),
      setIsDemo: (isDemo) => set({ isDemo }),
      setChatExperience: (exp) => set({ chatExperience: exp }),
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
    }),
    {
      name: 'bakedbot-store',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHasHydrated(true);
      },
    }
  )
);
