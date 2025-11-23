// src/providers.tsx
'use client';

import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // No FirebaseProvider, no ThemeProvider yet – just pass children through
  return <>{children}</>;
}
