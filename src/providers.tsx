// src/providers.tsx
'use client';

import type { ReactNode } from 'react';
import { DevAuthProvider } from '@/dev-auth';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/toaster';
import { CartSheet } from './components/cart-sheet';
import { DemoModeProvider } from './context/demo-mode';

export function Providers({ children }: { children: ReactNode }) {
  // Later: wrap ThemeProvider, FirebaseProvider, Toaster, etc. inside here.
  return (
    <DevAuthProvider>
        <DemoModeProvider>
            <ThemeProvider>
                {children}
                <Toaster />
                <CartSheet />
            </ThemeProvider>
        </DemoModeProvider>
    </DevAuthProvider>
  );
}
