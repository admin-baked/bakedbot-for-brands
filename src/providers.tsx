'use client';

import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // Later this will wrap ThemeProvider, Firebase, Toaster, etc.
  return <>{children}</>;
}
