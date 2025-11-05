'use client';

import { type Product } from '@/lib/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createContext, useContext, useRef, type ReactNode } from 'react';

export type CartItem = Product & { quantity: number };

type ChatbotMode = 'simple' | 'checkout';

interface StoreState {
  chatbotMode: ChatbotMode;
  setChatbotMode: (mode: ChatbotMode) => void;
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const createStore = () => create<StoreState>()(
  persist(
    (set, get) => ({
      chatbotMode: 'checkout',
      setChatbotMode: (mode) => set({ chatbotMode: mode }),
      cart: [],
      addToCart: (product) => {
        const cart = get().cart;
        const cartItem = cart.find((item) => item.id === product.id);

        if (cartItem) {
          const updatedCart = cart.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
          set({ cart: updatedCart });
        } else {
          const updatedCart = [...cart, { ...product, quantity: 1 }];
          set({ cart: updatedCart });
        }
      },
      removeFromCart: (productId) => {
        set({
          cart: get().cart.filter((item) => item.id !== productId),
        });
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
        } else {
          set({
            cart: get().cart.map((item) =>
              item.id === productId ? { ...item, quantity } : item
            ),
          });
        }
      },
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: 'smokey-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

type Store = ReturnType<typeof createStore>;
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<Store>();
  if (!storeRef.current) {
    storeRef.current = createStore();
  }
  return (
    <StoreContext.Provider value={storeRef.current}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used within a StoreProvider.');
  }
  return store();
}
