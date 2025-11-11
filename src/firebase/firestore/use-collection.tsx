
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

function getPathFromQuery(input: unknown): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = input;
    const group = q?._query?.collectionGroup;
    if (group) return `**/${group}`;
    const p = q?._query?.path?.canonicalString
             ?? q?._path?.canonicalString
             ?? q?.path?.canonicalString;
    if (typeof p === "string" && p) return p;
  } catch {}
  return "unknown/path";
}


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

    const unsubscribe = onSnapshot(
      query,
      (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T);
        setData(data);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
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
