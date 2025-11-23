
// src/dev-auth.tsx
'use client';

import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from 'react';

export type DevUserRole = 'brand' | 'dispensary' | 'admin';

export type DevUser = {
  id: string;
  name: string;
  email: string;
  role: DevUserRole;
};

type DevAuthContextValue = {
  user: DevUser | null;
  loginAs: (role: DevUserRole) => void;
  logout: () => void;
};

const DevAuthContext = createContext<DevAuthContextValue | undefined>(
  undefined,
);

export function DevAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DevUser | null>(null);

  const value = useMemo<DevAuthContextValue>(
    () => ({
      user,
      loginAs: (role) => {
        setUser({
          id: `dev-${role}`,
          role,
          name:
            role === 'brand'
              ? 'Brand Owner (Dev)'
              : role === 'dispensary'
              ? 'Dispensary Owner (Dev)'
              : 'Admin (Dev)',
          email: `${role}@dev.bakedbot.ai`,
        });
      },
      logout: () => setUser(null),
    }),
    [user],
  );

  return (
    <DevAuthContext.Provider value={value}>
      {children}
    </DevAuthContext.Provider>
  );
}

export function useDevAuth() {
  const ctx = useContext(DevAuthContext);
  if (!ctx) {
    throw new Error('useDevAuth must be used within DevAuthProvider');
  }
  return ctx;
}
