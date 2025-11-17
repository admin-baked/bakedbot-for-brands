
'use client';

import React from 'react';
import { FirebaseProvider } from '@/firebase/provider';

export function FirebaseRoot({ children }: { children: React.ReactNode }) {
  return <FirebaseProvider>{children}</FirebaseProvider>;
}
