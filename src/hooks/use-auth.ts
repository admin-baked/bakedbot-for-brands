/**
 * Firebase Auth Hook
 * Provides access to current authenticated user
 */

'use client';

import { useContext } from 'react';
import { FirebaseContext } from '@/firebase/provider';

export function useAuth() {
    const firebase = useContext(FirebaseContext);

    // Graceful fallback for surfaces rendered outside FirebaseClientProvider.
    if (!firebase) {
        return { user: null, loading: false };
    }

    return {
        user: firebase.user,
        loading: firebase.isUserLoading,
    };
}
