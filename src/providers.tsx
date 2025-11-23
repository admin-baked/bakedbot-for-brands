
'use client';

import type { ReactNode } from 'react';
import { DevAuthProvider } from '@/dev-auth';

export function Providers({ children }: { children: ReactNode }) {
  // Later: wrap ThemeProvider, FirebaseProvider, Toaster, etc. inside here.
  return <DevAuthProvider>{children}</DevAuthProvider>;
}
