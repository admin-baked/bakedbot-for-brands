
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, Retailer } from '@/types/domain';
import type { Theme } from '@/lib/themes';

interface StoreState {
  cartItems: CartItem[];
  isCartSheetOpen: boolean;
  isDemo: boolean;
  isCeoMode: boolean;
  theme: Theme;
  menuStyle: 'default' | 'alt';
  selectedRetailerId: string | null;
  favoriteRetailerId: string | null;
  _hasHydrated: boolean;
}

interface StoreActions {
  addToCart: (product: Product, retailerId: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => { subtotal: number; taxes: number; total: number; };
  getItemCount: () => number;
  setCartSheetOpen: (isOpen: boolean) => void;
  setIsDemo: (isDemo: boolean) => void;
  toggleCeoMode: () => void;
  setTheme: (theme: Theme) => void;
  setMenuStyle: (style: 'default' | 'alt') => void;
  setSelectedRetailerId: (id: string | null) => void;
  setFavoriteRetailerId: (id: string | null) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      cartItems: [],
      isCartSheetOpen: false,
      isDemo: false,
      isCeoMode: false,
      theme: 'green',
      menuStyle: 'default',
      selectedRetailerId: null,
      favoriteRetailerId: null,
      _hasHydrated: false,

      setHasHydrated: (hydrated) => {
        set({ _hasHydrated: hydrated });
      },

      addToCart: (product, retailerId) => {
        const currentItems = get().cartItems;
        const itemExists = currentItems.find(item => item.id === product.id);

        if (itemExists) {
          set(state => ({
            cartItems: state.cartItems.map(item =>
              item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            ),
          }));
        } else {
            const price = product.prices?.[retailerId] ?? product.price;
            set(state => ({
                cartItems: [...state.cartItems, { ...product, price, quantity: 1 }],
            }));
        }
      },
      
      removeFromCart: (productId) => {
        set(state => ({
          cartItems: state.cartItems.filter(item => item.id !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
        } else {
          set(state => ({
            cartItems: state.cartItems.map(item =>
              item.id === productId ? { ...item, quantity } : item
            ),
          }));
        }
      },

      clearCart: () => set({ cartItems: [] }),

      getCartTotal: () => {
        const subtotal = get().cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        // Simple tax calculation for demo purposes
        const taxes = subtotal * 0.15;
        const total = subtotal + taxes;
        return { subtotal, taxes, total };
      },

      getItemCount: () => {
        return get().cartItems.reduce((sum, item) => sum + item.quantity, 0);
      },

      setCartSheetOpen: (isOpen) => set({ isCartSheetOpen: isOpen }),
      setIsDemo: (isDemo) => set({ isDemo }),
      toggleCeoMode: () => set(state => ({ isCeoMode: !state.isCeoMode })),
      setTheme: (theme) => set({ theme }),
      setMenuStyle: (style) => set({ menuStyle: style }),
      setSelectedRetailerId: (id) => set({ selectedRetailerId: id }),
      setFavoriteRetailerId: (id) => set({ favoriteRetailerId: id }),
    }),
    {
      name: 'bakedbot-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
            state.setHasHydrated(true);
        }
      },
    }
  )
);
