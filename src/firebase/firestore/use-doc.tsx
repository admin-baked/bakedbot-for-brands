'use client';

import { useEffect, useState } from 'react';
import { onSnapshot, DocumentReference, DocumentData } from 'firebase/firestore';

type UseDocResult<T> = {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
};

export function useDoc<T = DocumentData>(ref: DocumentReference<T> | null): UseDocResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!ref);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ref) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = onSnapshot(
      ref,
      (docSnap) => {
        if (docSnap.exists()) {
          setData({ id: docSnap.id, ...docSnap.data() } as T);
        } else {
          setData(null);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error(`Error fetching doc: ${ref.path}`, err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, isLoading, error };
}
