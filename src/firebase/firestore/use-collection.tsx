
'use client';

import { useEffect, useState, useMemo } from 'react';
import { onSnapshot, Query, DocumentData, collectionGroup, query as fbQuery } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useFirebase } from '../provider';

type UseCollectionResult<T> = {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
};

/**
 * A hook to fetch a Firestore collection or collection group in real-time.
 * @param {Query | null} query - The Firestore query to execute.
 * @param {boolean} [isCollectionGroup=false] - Set to true if querying a collection group.
 */
export function useCollection<T = DocumentData>(
  query: Query<T> | null,
  isCollectionGroup: boolean = false
): UseCollectionResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!query);
  const [error, setError] = useState<Error | null>(null);
  const { firestore } = useFirebase();

  const finalQuery = useMemo(() => {
    if (!query || !firestore) return null;

    // The 'query' object passed in is already a complete query,
    // whether it's for a collection or a collection group.
    // No need to re-create it here.
    return query;
    
  }, [query, firestore]);

  useEffect(() => {
    if (!finalQuery) {
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
      finalQuery,
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
            path: getPathFromQuery(finalQuery),
            operation: 'list',
        });
  
        errorEmitter.emit('permission-error', permissionError);
      }
    );

    return () => unsubscribe();
  }, [finalQuery]);

  return { data, isLoading, error };
}
