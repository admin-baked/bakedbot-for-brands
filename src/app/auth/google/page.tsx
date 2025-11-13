'use client';

import { useEffect } from 'react';
import { GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
import { Loader2 } from 'lucide-react';

export default function GoogleAuthRedirectPage() {
  const { auth } = useFirebase();

  useEffect(() => {
    if (auth) {
      const provider = new GoogleAuthProvider();
      // This initiates the redirect to Google's sign-in page.
      // After the user signs in, they will be redirected back to the app,
      // where the onAuthStateChanged listener will pick up the session.
      signInWithRedirect(auth, provider);
    }
  }, [auth]);

  // Display a loading message while the redirect is in progress.
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Redirecting to Google...</p>
    </div>
  );
}
