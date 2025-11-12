'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Ctx = { isDemo: boolean; setIsDemo: (v: boolean) => void };
const DemoModeCtx = createContext<Ctx | null>(null);

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  // IMPORTANT: start with a stable SSR/CSR default (false). No localStorage here.
  const [isDemo, setIsDemo] = useState<boolean>(false);

  // After mount, read persisted value and update.
  useEffect(() => {
    try {
      const persisted = localStorage.getItem('bb_demo_mode');
      if (persisted === '1') {
        setIsDemo(true);
      }
    } catch {}
  }, []);

  // Persist on change (after mount).
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('bb_demo_mode', isDemo ? '1' : '0');
      }
    } catch {}
  }, [isDemo]);

  const value = useMemo(() => ({ isDemo, setIsDemo }), [isDemo]);
  return <DemoModeCtx.Provider value={value}>{children}</DemoModeCtx.Provider>;
}

export function useDemoMode() {
  const ctx = useContext(DemoModeCtx);
  if (!ctx) throw new Error('useDemoMode must be used within <DemoModeProvider>');
  return ctx;
}
