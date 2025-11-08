
'use client';

import * as React from 'react';
import { type CartItem, type Product } from '@/lib/types';
import { create } from 'zustand';

interface CartState {
  items: CartItem[];
  isCartOpen: boolean;
  addToCart: (product: Product, locationId?: string | null) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  getCartTotal: () => number;
  getItemCount: () => number;
}

const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isCartOpen: false,
  addToCart: (product, locationId) => {
    const existingItem = get().items.find((i) => i.id === product.id);
    const price = locationId ? product.prices[locationId] ?? product.price : product.price;

    if (existingItem) {
      set((state) => ({
        items: state.items.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1, price: price } : i
        ),
      }));
    } else {
      set((state) => ({ items: [...state.items, { ...product, quantity: 1, price: price }] }));
    }
  },
  removeFromCart: (itemId) => {
    set((state) => ({
      items: state.items.filter((i) => i.id !== itemId),
    }));
  },
  updateQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(itemId);
    } else {
      set((state) => ({
        items: state.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
      }));
    }
  },
  clearCart: () => set({ items: [] }),
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
  getCartTotal: () => {
    return get().items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  },
  getItemCount: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },
}));


// Context provider setup
const CartContext = React.createContext<CartState | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
    const store = useCartStore();
    return <CartContext.Provider value={store}>{children}</CartContext.Provider>;
};

export const useCart = () => {
    const context = React.useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
