'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import type { FirestorePermissionError } from '@/firebase/errors';
import GlobalError from '@/app/global-error';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It catches the error and renders the global error boundary without crashing the app.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Set the error in state to trigger the boundary render.
      setError(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  // If an error exists, render the GlobalError component directly.
  // This replaces the app's content with the error UI but doesn't crash the root.
  if (error) {
    // The `reset` function will simply clear the error state, allowing the
    // user to attempt to re-render the child components (e.g., after logging out).
    return <GlobalError error={error} reset={() => setError(null)} />;
  }

  // This component normally renders nothing.
  return null;
}
