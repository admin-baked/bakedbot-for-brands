'use client';

import React from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';
import { CartSheet } from '@/components/cart-sheet';
import { DemoModeProvider } from '@/context/demo-mode';
import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration';
import { PWAInstallPrompt } from '@/components/pwa/install-prompt';
import { FloatingCartPill } from '@/components/floating-cart-pill';

/**
 * This component centralizes all the global context providers for the application.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <DemoModeProvider>
        <ThemeProvider>
          <ServiceWorkerRegistration />
          {children}
          <Toaster />
          <CartSheet />
          <FloatingCartPill />
          <PWAInstallPrompt />
        </ThemeProvider>
      </DemoModeProvider>
    </FirebaseClientProvider>
  );
}
