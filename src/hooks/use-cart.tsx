
'use client';

import * as React from 'react';
import { type CartItem, type Product, type Location } from '@/lib/types';
import { create } from 'zustand';

interface CartState {
  items: CartItem[];
  isCartOpen: boolean;
  addToCart: (product: Product, locationId?: string | null) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateItemPrices: (locationId: string | null, products: Product[]) => void;
  clearCart: () => void;
  toggleCart: () => void;
  getCartTotal: () => number;
  getItemCount: () => number;
}

const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isCartOpen: false,
  addToCart: (product, locationId) => {
    const { items } = get();
    const existingItem = items.find((i) => i.id === product.id);
    
    let price: number;
    if (locationId && product.prices?.[locationId]) {
        price = product.prices[locationId];
    } else {
        price = product.price;
    }

    if (existingItem) {
      set({
        items: items.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1, price } : i
        ),
      });
    } else {
      set({ items: [...items, { ...product, quantity: 1, price }] });
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
  updateItemPrices: (locationId, products) => {
    set((state) => ({
      items: state.items.map(cartItem => {
        const fullProduct = products.find(p => p.id === cartItem.id);
        if (!fullProduct) return cartItem; // Should not happen

        const newPrice = (locationId && fullProduct.prices?.[locationId]) 
          ? fullProduct.prices[locationId] 
          : fullProduct.price;
        
        return { ...cartItem, price: newPrice };
      })
    }));
  },
  clearCart: () => set({ items: [] }),
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
  getCartTotal: () => {
    return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
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
