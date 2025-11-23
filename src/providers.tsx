'use client';

import React from 'react';
import AppThemeProvider from '@/components/AppThemeProvider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';
import { CartSheet } from '@/components/cart-sheet';
import { DemoModeProvider } from '@/context/demo-mode';

/**
 * This component centralizes all the global context providers for the application.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <DemoModeProvider>
        <AppThemeProvider>
          {children}
          <Toaster />
          <CartSheet />
        </AppThemeProvider>
      </DemoModeProvider>
    </FirebaseClientProvider>
  );
}
