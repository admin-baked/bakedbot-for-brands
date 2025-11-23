
'use client';

import React from 'react';
import { ThemeProvider } from '@/components/theme-provider';

/**
 * A placeholder provider component that simply renders its children.
 * This will be built out to include Theme, Firebase, and other global providers.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
        {children}
    </ThemeProvider>
  );
}
