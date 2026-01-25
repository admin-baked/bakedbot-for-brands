
'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onIdTokenChanged } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
import { useStore } from '@/hooks/use-store';

/**
 * A hook for accessing the authenticated user's state.
 * It listens for authentication state changes from Firebase.
 */
export const useUser = () => {
  const { auth } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const setFavoriteRetailerId = useStore(state => state.setFavoriteRetailerId);

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onIdTokenChanged(
      auth,
      async (user) => {
        try {
          if (user) {
            let idTokenResult;
            let claims: Record<string, unknown> = {};

            try {
              // Don't force refresh - use cached token to avoid 400 errors
              idTokenResult = await user.getIdTokenResult(false);
              claims = idTokenResult.claims;
            } catch (tokenError: any) {
              // Token refresh failed - handle gracefully
              const errorCode = tokenError?.code || '';
              const errorMessage = tokenError?.message || '';

              // Handle invalid token errors - treat as signed out
              if (errorCode === 'auth/invalid-user-token' ||
                  errorCode === 'auth/user-token-expired' ||
                  errorCode === 'auth/user-disabled' ||
                  errorMessage.includes('400') ||
                  errorMessage.includes('INVALID_REFRESH_TOKEN')) {
                console.warn('[useUser] Invalid token, clearing user state:', errorCode || errorMessage);
                setUser(null);
                setIsLoading(false);
                return;
              }

              // For other errors, use user without claims
              console.warn('[useUser] Token error, using basic user:', errorCode);
              setUser(user as any);
              setIsLoading(false);
              return;
            }

            let userWithClaims = { ...user, ...claims } as any;

            // --- CLIENT-SIDE ROLE SIMULATION ---
            // Check if the user is an owner and if a simulation cookie exists
            if (claims.role === 'owner') {
              // We need to read the cookie. Since this is client-side, we can use document.cookie
              const match = document.cookie.match(new RegExp('(^| )x-simulated-role=([^;]+)'));
              const simulatedRole = match ? match[2] : null;

              if (simulatedRole) {
                userWithClaims = { ...userWithClaims, role: simulatedRole };
              }
            }

            setUser(userWithClaims);

            if (claims.favoriteRetailerId) {
              setFavoriteRetailerId(claims.favoriteRetailerId as string);
            }
          } else {
            setUser(null);
          }
        } catch (e: any) {
          // Handle all errors gracefully - don't crash the app
          console.warn('[useUser] Auth error:', e?.code || e?.message);
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      },
      (err: any) => {
        // Auth listener error - log but don't crash
        console.warn('[useUser] Auth listener error:', err?.code || err?.message);
        setUser(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth, setFavoriteRetailerId]);

  return {
    user: user,
    isUserLoading: isLoading,
    userError: error,
  };
};
