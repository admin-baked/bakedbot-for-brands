'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Cookies from 'universal-cookie';

const cookies = new Cookies();

type Ctx = { isDemo: boolean; setIsDemo: (v: boolean) => void };
const DemoModeCtx = createContext<Ctx | null>(null);

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  // Read initial value from cookie if available, otherwise default to false.
  // This ensures the initial server render and client render match.
  const getInitialDemoMode = () => {
    try {
      return cookies.get('isUsingDemoData') === 'true';
    } catch {
      return false; // Default to false in case of errors (e.g., in environments without cookies)
    }
  };

  const [isDemo, setIsDemo] = useState<boolean>(getInitialDemoMode);

  // Persist on change
  useEffect(() => {
    cookies.set('isUsingDemoData', isDemo ? 'true' : 'false', { path: '/', maxAge: 60 * 60 * 24 * 365 });
  }, [isDemo]);

  const value = useMemo(() => ({ isDemo, setIsDemo }), [isDemo]);
  return <DemoModeCtx.Provider value={value}>{children}</DemoModeCtx.Provider>;
}

export function useDemoMode() {
  const ctx = useContext(DemoModeCtx);
  if (!ctx) throw new Error('useDemoMode must be used within <DemoModeProvider>');
  return ctx;
}
