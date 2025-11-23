
'use client';
import { useFirebase } from '@/firebase/provider';

/**
 * Hook specifically for accessing the authenticated user's state.
 * This is a STUB that always returns a logged-out state for now.
 */
export const useUser = () => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
