
'use client';

import { create } from 'zustand';
import type { Product } from '@/types/domain';
import { useToast } from '@/hooks/use-toast';
import { useCookieStore } from './../lib/cookie-storage';

export type CartItem = Product & { quantity: number };

export interface StoreState {
  cartItems: CartItem[];
  selectedRetailerId: string | null;
  isCartSheetOpen: boolean;

  // Actions
  setSelectedRetailerId: (id: string | null) => void;
  setCartSheetOpen: (isOpen: boolean) => void;

  // Cart Actions
  addToCart: (product: Product, retailerId?: string | null) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => { subtotal: number; taxes: number; total: number };
  getItemCount: () => number;
}


export const useStore = create<StoreState>()(
    (set, get) => ({
      cartItems: [],
      selectedRetailerId: null,
      isCartSheetOpen: false,
      
      // Actions
      setSelectedRetailerId: (id: string | null) => {
        useCookieStore.getState().setFavoriteRetailerId(id);
        set({ selectedRetailerId: id })
      },
      setCartSheetOpen: (isOpen: boolean) => set({ isCartSheetOpen: isOpen }),
      
      // Cart Actions
      addToCart: (product, retailerId) =>
        set((state) => {
          if (!retailerId) {
            // This case should be prevented by UI logic, but as a safeguard:
            console.error("addToCart called without a retailerId.");
            // Optionally, show a toast to the user. This part depends on how you handle user feedback.
            // For now, we'll just prevent the action.
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
    })
);
