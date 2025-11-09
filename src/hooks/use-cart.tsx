'use client';

import * as React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type CartItem as AppCartItem, type Product } from '@/lib/types';


// Define the type for items within the cart
export type CartItem = AppCartItem;

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
  getCartTotal: () => number;
  getItemCount: () => number;
}

// Combine state and actions for the full store type
type CartStore = CartState & CartActions;

// Create the Zustand store with persistence
export const useCartStore = create<CartStore>()(
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
          let price = (locationId && product.prices?.[locationId])
            ? product.prices[locationId]
            : product.price;

          if (existingItem) {
            // If item exists, update its quantity and price
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
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
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


// We create a provider to make the store available throughout the app
const CartContext = React.createContext<CartStore | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const store = useCartStore;
  return <CartContext.Provider value={store()}>{children}</CartContext.Provider>;
};

// The primary hook that components will use to interact with the cart
export const useCart = (): CartStore => {
  const store = React.useContext(CartContext);
  if (!store) {
    throw new Error('useCart must be used within a CartProvider');
  }
  // We directly use the store selectors here. Zustand ensures components re-render only when the selected state changes.
  return useCartStore();
};
