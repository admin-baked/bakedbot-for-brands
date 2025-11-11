
'use client';

import { useEffect, useState } from 'react';
import { onSnapshot, Query, DocumentData } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type UseCollectionResult<T> = {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
};

/**
 * A hook to fetch a Firestore collection or collection group in real-time.
 * @param {Query | null} query - The Firestore query to execute.
 */
export function useCollection<T = DocumentData>(
  query: Query<T> | null
): UseCollectionResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!query);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const getPathFromQuery = (q: Query) => {
        try {
            // This is an internal property, but it's the most reliable way to get the path
            const path = (q as any)._query?.path?.segments?.join('/');
            if (path) return path;

            // Fallback for collection group queries
            const collectionId = (q as any)._query?.collectionGroup;
            if (collectionId) return `**/${collectionId}`;
            
            return 'unknown/path'; // Final fallback
        } catch (e) {
            return 'unknown/path';
        }
    }

    const unsubscribe = onSnapshot(
      query,
      (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T);
        setData(data);
        setIsLoading(false);
        setError(null);
      },
      async (err) => {
        console.error(`Error fetching collection`, err);
        setError(err);
        setIsLoading(false);

        const permissionError = new FirestorePermissionError({
            path: getPathFromQuery(query),
            operation: 'list',
        });
  
        errorEmitter.emit('permission-error', permissionError);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, isLoading, error };
}
