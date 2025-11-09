
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from './errors';
import { useStore } from '@/hooks/use-store';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  // User authentication state
  user: User | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null; // Error from auth listener
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { // Renamed from UserAuthHookResult for consistency if desired, or keep as UserAuthHookResult
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
  });

  const { setIsCeoMode } = useStore();

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth || !firestore) { 
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth or Firestore service not provided.") });
      return;
    }

    setUserAuthState({ user: null, isUserLoading: true, userError: null });

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          const userDocRef = doc(firestore, 'users', user.uid);
          const isCEO = user.uid === 'GrRRe2YR4zY0MT0PEfMPrPCsR5A3';
          setIsCeoMode(isCEO);

          // Check if the user document already exists
          const userDocSnap = await getDoc(userDocRef).catch(err => {
              console.error("Error fetching user document:", err);
              // Don't throw, allow app to continue. The creation might fail too but we'll handle that.
              return null;
          });

          if (userDocSnap && !userDocSnap.exists()) {
            // Only create if document doesn't exist
            const displayNameParts = user.displayName?.split(' ') || [];
            const newUser = {
              id: user.uid,
              email: user.email || '',
              firstName: displayNameParts[0] || '',
              lastName: displayNameParts.slice(1).join(' ') || '',
              onboardingCompleted: isCEO ? true : false, // Skip onboarding for CEO
              role: isCEO ? 'ceo' : null, // Auto-assign CEO role
            };

            // Use set with merge to create or update the user document.
            setDoc(userDocRef, newUser, { merge: true }).catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                  path: userDocRef.path,
                  operation: 'write', 
                  requestResourceData: newUser,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
          }
        } else {
          // No user, ensure CEO mode is off
          setIsCeoMode(false);
        }
        
        setUserAuthState({ user: user, isUserLoading: false, userError: null });
      },
      (error) => { // Auth listener error
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setIsCeoMode(false); // Ensure CEO mode is off on error
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe(); // Cleanup
  }, [auth, firestore, setIsCeoMode]);

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    // During a server-side build, the context might be undefined initially.
    // Return a safe, non-functional default instead of throwing an error.
    if (typeof window === 'undefined') {
      return {
        firebaseApp: null,
        firestore: null,
        auth: null,
        user: null,
        isUserLoading: true,
        userError: null
      };
    }
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable) {
    // Similar to above, provide a safe default during server build if services aren't ready
    if (typeof window === 'undefined') {
       return {
        firebaseApp: null,
        firestore: null,
        auth: null,
        user: null,
        isUserLoading: true,
        userError: null
      };
    }
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth | null => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore | null => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp | null => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};
