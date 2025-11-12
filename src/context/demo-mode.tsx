
'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Ctx = { isDemo: boolean; setIsDemo: (v: boolean) => void };
const DemoModeCtx = createContext<Ctx | null>(null);

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true; // Default to true on server
    return localStorage.getItem('bb_demo_mode') !== '0'; // Default to true unless explicitly '0'
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bb_demo_mode', isDemo ? '1' : '0');
    }
  }, [isDemo]);

  const value = useMemo(() => ({ isDemo, setIsDemo }), [isDemo]);
  return <DemoModeCtx.Provider value={value}>{children}</DemoModeCtx.Provider>;
}

export function useDemoMode() {
  const ctx = useContext(DemoModeCtx);
  if (!ctx) throw new Error('useDemoMode must be used within <DemoModeProvider>');
  return ctx;
}
