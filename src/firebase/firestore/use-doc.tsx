
'use client';

import { useEffect, useState } from 'react';
import { onSnapshot, DocumentReference, DocumentData } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { FirebaseError } from 'firebase/app';
import { getAuth } from 'firebase/auth';

import { logger } from '@/lib/logger';
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
        setError(null);
      },
      (err) => {
        setIsLoading(false);

        if (err instanceof FirebaseError && err.code === 'permission-denied') {
          try {
            const auth = getAuth();
            logger.info('🔍 Doc query failed:', {
              path: ref.path,
              isAuthenticated: !!auth?.currentUser,
              userId: auth?.currentUser?.uid,
              email: auth?.currentUser?.email,
              errorCode: err.code,
              errorMessage: err.message
            });
          } catch (e) {
             logger.info('🔍 Doc query failed (unauthenticated context):', {
              path: ref.path,
              isAuthenticated: false,
              errorCode: err.code,
              errorMessage: err.message
            });
          }

          const permissionError = new FirestorePermissionError({
            path: ref.path,
            operation: 'get',
          });
          
          setError(permissionError);
          errorEmitter.emit('permission-error', permissionError);
          return;
        }

        logger.error(`Unhandled error fetching doc: ${ref.path}`, err);
        setError(err);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, isLoading, error };
}
