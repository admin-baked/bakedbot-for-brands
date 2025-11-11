
'use client';

import { useEffect, useState } from 'react';
import { onSnapshot, Query, DocumentData } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { FirebaseError } from 'firebase/app';

type UseCollectionResult<T> = {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
};

function getPathFromQuery(input: unknown): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = input;

    // Collection-group query? Return helpful wildcard
    const group = q?._query?.collectionGroup;
    if (group) return `**/${group}`;

    // Regular collection/query: try to read canonicalString
    const p = q?._query?.path?.canonicalString
      ?? q?._path?.canonicalString
      ?? q?.path?.canonicalString;
    if (typeof p === "string" && p.length > 0) return p;
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
        setIsLoading(false);
        // Special handling for permission errors to avoid crashing the page
        if (err instanceof FirebaseError && err.code === "permission-denied") {
          const permissionError = new FirestorePermissionError({
              path: getPathFromQuery(query),
              operation: 'list',
          });
          setError(permissionError); // Set error state for the component to handle
          errorEmitter.emit('permission-error', permissionError); // Also emit for global listeners
          return; // Stop further execution
        }
        // For other errors, re-throw to be caught by a higher-level boundary if needed
        console.error(`Unhandled error fetching collection:`, err);
        setError(err);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, isLoading, error };
}
