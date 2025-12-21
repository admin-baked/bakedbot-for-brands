'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/provider';
import { doc, onSnapshot } from 'firebase/firestore';
import type { DomainUserProfile } from '@/types/domain';

export function useUser() {
    const { user, isUserLoading } = useFirebase();
    const { firestore } = useFirebase();
    const [userData, setUserData] = useState<DomainUserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isUserLoading) return;

        if (!user || !firestore) {
            setUserData(null);
            setIsLoading(false);
            return;
        }

        // Subscribe to user profile changes
        const unsubscribe = onSnapshot(doc(firestore, 'users', user.uid), (doc) => {
            if (doc.exists()) {
                setUserData(doc.data() as DomainUserProfile);
            } else {
                setUserData(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error('Error fetching user profile:', error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, firestore, isUserLoading]);

    return {
        user,
        userData,
        isLoading: isUserLoading || isLoading,
        isAuthenticated: !!user
    };
}
