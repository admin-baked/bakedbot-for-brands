'use client';

import { useEffect, useState } from 'react';
import { onSnapshot, Query, DocumentData } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { FirebaseError } from 'firebase/app';
import { getPathFromQuery } from './query-path';

type UseCollectionResult<T> = {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
};

type UseCollectionOpts = {
  debugPath?: string; // optional hint from caller
  onDenied?: (e: FirestorePermissionError) => void; // optional hook
};


/**
 * A hook to fetch a Firestore collection or collection group in real-time.
 * @param {Query | null} query - The Firestore query to execute.
 */
export function useCollection<T = DocumentData>(
  query: Query<T> | null,
  opts: UseCollectionOpts = {}
): UseCollectionResult<T> {
  const { debugPath, onDenied } = opts;
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

    const unsubscribe = onSnapshot(
      query,
      (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T);
        setData(data);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setIsLoading(false);
        
        if (err instanceof FirebaseError && err.code === "permission-denied") {
          const inferredPath = getPathFromQuery(query);
          const path = inferredPath === "unknown/path" && debugPath ? debugPath : inferredPath;

          const permissionError = new FirestorePermissionError({
              path: path,
              operation: 'list',
          });

          setError(permissionError); // Set error state for the component to handle
          onDenied?.(permissionError);
          errorEmitter.emit('permission-error', permissionError); // Also emit for global listeners
          return; // Stop further execution
        }

        console.error(`Unhandled error fetching collection:`, err);
        setError(err);
      }
    );

    return () => unsubscribe();
  }, [query, debugPath, onDenied]);

  return { data, isLoading, error };
}
