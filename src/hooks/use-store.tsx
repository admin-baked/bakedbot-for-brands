
'use client';

import * as React from 'react';
import { type Theme } from '@/lib/themes';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createContext, useContext, useRef, type ReactNode } from 'react';

interface StoreState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  chatbotIcon: string | null;
  setChatbotIcon: (icon: string | null) => void;
  chatExperience: 'default' | 'classic';
  setChatExperience: (experience: 'default' | 'classic') => void;
  brandImageGenerations: number;
  lastBrandImageGeneration: number | null;
  recordBrandImageGeneration: () => void;
}

const defaultState = {
  theme: 'green' as Theme,
  chatbotIcon: null,
  chatExperience: 'default' as 'default' | 'classic',
  brandImageGenerations: 0,
  lastBrandImageGeneration: null,
};

const createStore = () => create<StoreState>()(
  persist(
    (set, get) => ({
      ...defaultState,
      setTheme: (theme: Theme) => set({ theme }),
      setChatbotIcon: (icon: string | null) => set({ chatbotIcon: icon }),
      setChatExperience: (experience: 'default' | 'classic') => set({ chatExperience: experience }),
      recordBrandImageGeneration: () => {
        const { lastBrandImageGeneration, brandImageGenerations } = get();
        const now = Date.now();
        const today = new Date(now).toDateString();
        const lastDate = lastBrandImageGeneration ? new Date(lastBrandImageGeneration).toDateString() : null;

        if (today === lastDate) {
          set({ brandImageGenerations: brandImageGenerations + 1, lastBrandImageGeneration: now });
        } else {
          // It's a new day, reset the count
          set({ brandImageGenerations: 1, lastBrandImageGeneration: now });
        }
      },
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
  
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const state = store();

  const setters = {
    setTheme: state.setTheme,
    setChatbotIcon: state.setChatbotIcon,
    setChatExperience: state.setChatExperience,
    recordBrandImageGeneration: state.recordBrandImageGeneration,
  };

  const fullState = { ...state, ...setters };

  const defaultSetters = {
    setTheme: (theme: Theme) => {},
    setChatbotIcon: (icon: string | null) => {},
    setChatExperience: (experience: 'default' | 'classic') => {},
    recordBrandImageGeneration: () => {},
  }

  return hydrated ? fullState : { ...defaultState, ...defaultSetters };
}
