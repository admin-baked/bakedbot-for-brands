
'use client';

import * as React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Product } from '@/lib/types';

// Define the type for items within the cart
export type CartItem = Product & { quantity: number };

// Define the state of the cart
interface CartState {
  items: CartItem[];
  isCartOpen: boolean;
}

// Define the actions that can be performed on the cart
interface CartActions {
  addToCart: (product: Product, locationId?: string | null) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateItemPrices: (locationId: string | null, products: Product[]) => void;
  clearCart: () => void;
  toggleCart: () => void;
  getCartTotal: () => { subtotal: number; taxes: number; total: number };
  getItemCount: () => number;
}

// Combine state and actions for the full store type
type CartStore = CartState & CartActions;

// Create the Zustand store with persistence
const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      isCartOpen: false,

      // Actions
      addToCart: (product, locationId) =>
        set((state) => {
          const existingItem = state.items.find((i) => i.id === product.id);
          
          // Determine the correct price based on location
          const price = (locationId && product.prices?.[locationId])
            ? product.prices[locationId]
            : product.price;

          if (existingItem) {
            // If item exists, update its quantity and ensure its price is current
            return {
              items: state.items.map((i) =>
                i.id === product.id ? { ...i, quantity: i.quantity + 1, price } : i
              ),
            };
          }
          // If item is new, add it to the cart
          return { items: [...state.items, { ...product, quantity: 1, price }] };
        }),

      removeFromCart: (itemId) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== itemId),
        })),

      updateQuantity: (itemId, quantity) =>
        set((state) => {
          // If quantity is 0 or less, remove the item
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.id !== itemId) };
          }
          // Otherwise, update the quantity
          return {
            items: state.items.map((i) =>
              i.id === itemId ? { ...i, quantity } : i
            ),
          };
        }),
        
      updateItemPrices: (locationId, products) =>
        set((state) => ({
          items: state.items.map(cartItem => {
            const fullProduct = products.find(p => p.id === cartItem.id);
            if (!fullProduct) return cartItem; // Should not happen

            // Determine the new price based on the selected location
            const newPrice = (locationId && fullProduct.prices?.[locationId]) 
              ? fullProduct.prices[locationId] 
              : fullProduct.price;
            
            return { ...cartItem, price: newPrice };
          })
        })),

      clearCart: () => set({ items: [], isCartOpen: false }),

      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

      getCartTotal: () => {
        const subtotal = get().items.reduce((total, item) => total + item.price * item.quantity, 0);
        // Using a fixed 15% tax rate for now
        const taxes = subtotal * 0.15; 
        const total = subtotal + taxes;
        return { subtotal, taxes, total };
      },

      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'bakedbot-cart-storage', // The key for storing the cart in localStorage
    }
  )
);

// This hook can be used throughout the app
export const useCart = () => useCartStore((state) => state);
