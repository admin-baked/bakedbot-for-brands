
'use client';

import React from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';
import { CartSheet } from '@/components/cart-sheet';
import { DemoModeProvider } from '@/context/demo-mode';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

/**
 * This component centralizes all the global context providers for the application.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <DemoModeProvider>
        <ThemeProvider>
          <FirebaseErrorListener />
          {children}
          <Toaster />
          <CartSheet />
        </ThemeProvider>
      </DemoModeProvider>
    </FirebaseClientProvider>
  );
}
