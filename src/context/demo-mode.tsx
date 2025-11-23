
'use client';

import { useStore } from '@/hooks/use-store';
import React, { createContext, useContext, ReactNode, useMemo } from 'react';

type DemoModeContextType = {
  isDemo: boolean;
  setIsDemo: (isDemo: boolean) => void;
};

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

/**
 * This provider centralizes the logic for handling demo mode.
 * It reads the initial state from the stub Zustand store.
 */
export function DemoModeProvider({ children }: { children: ReactNode }) {
  const { isDemo, setIsDemo } = useStore();

  const value = useMemo(() => ({
    isDemo: isDemo,
    setIsDemo: setIsDemo,
  }), [isDemo, setIsDemo]);

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}

/**
 * A hook to easily access the demo mode state from any client component.
 */
export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}
