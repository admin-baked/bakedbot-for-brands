
'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/provider';
import { collectionGroup, query, onSnapshot, DocumentData, orderBy } from 'firebase/firestore';

type UseCollectionGroupResult<T> = {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
};

/**
 * A reusable hook to subscribe to a Firestore collection group in real-time.
 * @param collectionId The ID of the collection group to query (e.g., 'reviews').
 * @returns An object containing the data, loading state, and any errors.
 */
export function useCollectionGroup<T = DocumentData>(collectionId: string): UseCollectionGroupResult<T> {
  const { firestore } = useFirebase();
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firestore || !collectionId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Create a query against the collection group.
    // Ordering by a field (like a timestamp) is a common pattern.
    const groupQuery = query(collectionGroup(firestore, collectionId), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(groupQuery, 
      (snapshot) => {
        const result = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        setData(result);
        setIsLoading(false);
      },
      (err) => {
        console.error(`Error fetching collection group '${collectionId}':`, err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, collectionId]);

  return { data, isLoading, error };
}
