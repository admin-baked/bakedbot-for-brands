
'use client';

/**
 * Hook specifically for accessing the authenticated user's state.
 * This is a STUB that always returns a logged-out state for now.
 */
export const useUser = () => {
  return { 
    user: null, 
    isUserLoading: false, 
    userError: null 
  };
};
