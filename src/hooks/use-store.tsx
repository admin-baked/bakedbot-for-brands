
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
}

const defaultState = {
  theme: 'green' as Theme,
  chatbotIcon: null,
  chatExperience: 'default' as 'default' | 'classic',
};

const createStore = () => create<StoreState>()(
  persist(
    (set, get) => ({
      ...defaultState,
      setTheme: (theme: Theme) => set({ theme }),
      setChatbotIcon: (icon: string | null) => set({ chatbotIcon: icon }),
      setChatExperience: (experience: 'default' | 'classic') => set({ chatExperience: experience }),
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
  
  // Zustand's persist middleware with client-side storage can cause hydration issues.
  // We need to ensure that we only return the state once the component has mounted on the client.
  // See: https://docs.pmnd.rs/zustand/integrations/persisting-middleware#getstorage-and-hydration-caveats
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const state = store();

  const setters = {
    setTheme: state.setTheme,
    setChatbotIcon: state.setChatbotIcon,
    setChatExperience: state.setChatExperience,
  };

  return hydrated ? { ...state } : { ...defaultState, ...setters };
}
