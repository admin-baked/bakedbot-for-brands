
'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState, useMemo, useRef } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { onIdTokenChanged, getIdTokenResult } from 'firebase/auth';
import { useStore } from '@/hooks/use-store';

import { logger } from '@/lib/logger';

export interface FirebaseServices {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseServices | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children, firebaseApp, auth, firestore }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);
  const setFavoriteRetailerId = useStore(state => state.setFavoriteRetailerId);
  const isEnsuringServerSessionRef = useRef(false);

  const ensureServerSessionCookie = async (firebaseUser: User) => {
    // Only run in the browser.
    if (typeof document === 'undefined') return;

    // __session is httpOnly, so we use a companion flag cookie set by /api/auth/session.
    const hasActiveServerSession = document.cookie.split('; ').some((c) => c.startsWith('__session_is_active=true'));
    if (hasActiveServerSession) return;

    // Prevent concurrent calls (onIdTokenChanged can fire multiple times).
    if (isEnsuringServerSessionRef.current) return;
    isEnsuringServerSessionRef.current = true;

    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        credentials: 'include',
      });

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        logger.warn('[FirebaseProvider] Failed to create server session cookie', {
          status: response.status,
          details: details?.slice?.(0, 200) || details,
        });
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.warn('[FirebaseProvider] Failed to ensure server session cookie', error);
    } finally {
      isEnsuringServerSessionRef.current = false;
    }
  };

  useEffect(() => {
    if (!auth) {
      setIsUserLoading(false);
      return;
    }

    const unsubscribe = onIdTokenChanged(
      auth,
      async (user) => {
        try {
          if (user) {
            // Ensure the server-side session cookie exists so Server Components/Actions don't
            // unexpectedly redirect authenticated users to login when the cookie expires.
            await ensureServerSessionCookie(user);

            // Don't force refresh on initial token change - can cause auth/internal-error
            // with custom tokens immediately after login
            let idTokenResult;
            try {
              idTokenResult = await getIdTokenResult(user, false);
            } catch (refreshError: any) {
              // Token refresh failed - this can happen with invalid/expired tokens
              // or when the token service returns 400
              const errorCode = refreshError?.code || '';
              const errorMessage = refreshError?.message || '';

              // Handle invalid token errors gracefully - treat as signed out
              if (errorCode === 'auth/invalid-user-token' ||
                  errorCode === 'auth/user-token-expired' ||
                  errorCode === 'auth/user-disabled' ||
                  errorMessage.includes('400') ||
                  errorMessage.includes('INVALID_REFRESH_TOKEN') ||
                  errorMessage.includes('TOKEN_EXPIRED')) {
                console.warn('[FirebaseProvider] Invalid token, clearing user state:', errorCode || errorMessage);
                setUser(null);
                setIsUserLoading(false);
                return;
              }

              // For other transient errors, log but don't block - use user without claims
              console.warn('[FirebaseProvider] Token refresh failed, using basic user:', errorCode);
              setUser(user as any);
              setIsUserLoading(false);
              return;
            }

            const claims = idTokenResult.claims;
            // Add custom claims to the user object for easier access
            const userWithClaims = { ...user, ...claims } as any;
            setUser(userWithClaims);

            // Sync favorite retailer ID from claims to Zustand store
            if (claims.favoriteRetailerId) {
              setFavoriteRetailerId(claims.favoriteRetailerId as string);
            }

          } else {
            setUser(null);
          }
        } catch (error: any) {
          // Don't set error for transient auth issues - just log them and clear user
          const errorCode = error?.code || '';
          if (errorCode === 'auth/internal-error' ||
              errorCode === 'auth/network-request-failed') {
            console.warn('[FirebaseProvider] Transient auth error, clearing user:', errorCode);
            setUser(null);
          } else {
            logger.error('Error getting ID token result:', error instanceof Error ? error : new Error(String(error)));
            setUserError(error instanceof Error ? error : new Error('An unknown authentication error occurred.'));
          }
        } finally {
          setIsUserLoading(false);
        }
      },
      (error: any) => {
        // Auth state listener error - log but don't crash
        console.warn('[FirebaseProvider] Auth state listener error:', error?.code || error?.message);
        setUser(null);
        setIsUserLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth, setFavoriteRetailerId]);


  const contextValue = useMemo((): FirebaseServices => ({
    firebaseApp,
    firestore,
    auth,
    user,
    isUserLoading,
    userError,
  }), [firebaseApp, firestore, auth, user, isUserLoading, userError]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServices => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export const useAuth = (): Auth | null => useFirebase().auth;
export const useFirestore = (): Firestore | null => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp | null => useFirebase().firebaseApp;
