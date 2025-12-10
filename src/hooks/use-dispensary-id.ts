'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useOptionalFirebase } from '@/firebase/use-optional-firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export function useDispensaryId() {
    const { user, isUserLoading } = useUser();
    const firebase = useOptionalFirebase();
    const [dispensaryId, setDispensaryId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isUserLoading) return;

        const fetchDispensaryId = async () => {
            if (!user) {
                setDispensaryId(null);
                setLoading(false);
                return;
            }

            // 1. Check Custom Claims
            if ((user as any).dispensaryId) {
                setDispensaryId((user as any).dispensaryId);
                setLoading(false);
                return;
            }

            // 2. Query Firestore if firebase is available
            if (firebase?.firestore) {
                try {
                    // Try finding dispensary owned by user
                    const dispensariesRef = collection(firebase.firestore, 'dispensaries');
                    const q = query(dispensariesRef, where('ownerId', '==', user.uid), limit(1));
                    const snapshot = await getDocs(q);

                    if (!snapshot.empty) {
                        setDispensaryId(snapshot.docs[0].id);
                    } else {
                        // Logic if no dispensary found?
                    }
                } catch (error) {
                    console.error('Error fetching dispensary ID:', error);
                }
            }

            setLoading(false);
        };

        fetchDispensaryId();
    }, [user, isUserLoading, firebase]);

    return { dispensaryId, loading };
}
