
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
            const idTokenResult = await user.getIdTokenResult(true);
            const claims = idTokenResult.claims;
            const userWithClaims = { ...user, ...claims } as any;
            setUser(userWithClaims);

            if (claims.favoriteRetailerId) {
              setFavoriteRetailerId(claims.favoriteRetailerId as string);
            }
          } else {
            setUser(null);
          }
        } catch (e) {
          setError(e instanceof Error ? e : new Error('An authentication error occurred.'));
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        setError(err);
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
