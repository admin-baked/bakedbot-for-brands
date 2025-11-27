/**
 * Firebase Auth Hook
 * Provides access to current authenticated user
 */

'use client';

import { useEffect, useState } from 'react';
import { User, onAuthStateChanged, getAuth } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const { firebaseApp } = initializeFirebase();
        const auth = getAuth(firebaseApp);

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, loading };
}
