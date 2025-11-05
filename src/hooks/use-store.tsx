
'use client';

import { type Theme, themes } from '@/lib/themes';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createContext, useContext, useRef, type ReactNode } from 'react';

interface StoreState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const createStore = () => create<StoreState>()(
  persist(
    (set, get) => ({
      theme: 'default',
      setTheme: (theme: Theme) => set({ theme }),
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
