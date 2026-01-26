'use client';

import { useContext } from 'react';
import { useFirebase, FirebaseContext } from '@/firebase/provider';
import { logger } from '@/lib/logger';

/**
 * A safe wrapper around useFirebase that never throws an error.
 * If the FirebaseProvider is missing, it returns a "null" version of the
 * services object instead of crashing the app. This is ideal for components
 * that have optional Firebase functionality (like showing a "Login" button
 * if logged out vs. a user menu if logged in) but can still render safely
 * on public marketing pages without a provider.
 */
export function useOptionalFirebase() {
  const context = useFirebaseContext();

  if (context === undefined) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn(
        `[useOptionalFirebase] FirebaseContext is missing. Components using this hook will fall back to a non-authenticated state.`,
      );
    }
    // Return a safe, "null" version of the context value with a consistent shape.
    return {
      user: null,
      isUserLoading: false,
      userError: null,
      firestore: null,
      auth: null,
      firebaseApp: null,
    };
  }

  return context;
}

// Helper to access context directly without throwing
function useFirebaseContext() {
  return useContext(FirebaseContext);
}
