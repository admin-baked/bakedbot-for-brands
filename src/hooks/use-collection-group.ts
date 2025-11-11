
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase } from '@/firebase/provider';
import { collectionGroup, query, onSnapshot, DocumentData, orderBy, Query, where } from 'firebase/firestore';

type UseCollectionGroupResult<T> = {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
};

// A stable, empty array to avoid re-renders
const EMPTY_ARRAY: any[] = [];

/**
 * A reusable hook to subscribe to a Firestore collection group in real-time.
 * @param collectionId The ID of the collection group to query (e.g., 'reviews').
 * @returns An object containing the data, loading state, and any errors.
 */
export function useCollectionGroup<T = DocumentData>(collectionId: string, q?: Query): UseCollectionGroupResult<T> {
  const { firestore } = useFirebase();
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const groupQuery = useMemo(() => {
    if (!firestore || !collectionId) return null;

    // If an external query is provided, use it. Otherwise, create a default one.
    return q || query(collectionGroup(firestore, collectionId), orderBy('createdAt', 'desc'));
  }, [firestore, collectionId, q]);


  useEffect(() => {
    if (!groupQuery) {
      setData(EMPTY_ARRAY);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

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
  }, [groupQuery, collectionId]);

  return { data, isLoading, error };
}
