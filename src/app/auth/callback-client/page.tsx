
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { isSignInWithEmailLink, signInWithEmailLink, getRedirectResult } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackClientPage() {
  const router = useRouter();
  const { auth } = useFirebase();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;

    const fullUrl = window.location.href;

    // Handle Magic Link
    if (isSignInWithEmailLink(auth, fullUrl)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        // If email is not in storage, prompt user for it
        email = window.prompt('Please provide your email for confirmation');
      }

      if (email) {
        signInWithEmailLink(auth, email, fullUrl)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            router.push('/dashboard');
          })
          .catch((err) => {
            console.error(err);
            setError('Failed to sign in with magic link. The link may have expired or been used already.');
          });
      } else {
        setError('Email address not found. Please try signing in again.');
      }
    } else {
        // Handle Google Redirect
        getRedirectResult(auth)
            .then((result) => {
                if (result && result.user) {
                    router.push('/dashboard');
                } else {
                    // This can happen if the page is visited directly without a pending redirect.
                    // Or if there was an error during the redirect sign-in.
                    const errorCode = searchParams.get('error_code'); // Check for Firebase error params
                    if (errorCode) {
                        const errorMessage = searchParams.get('error_message') || 'An unknown error occurred during sign-in.';
                        setError(decodeURIComponent(errorMessage));
                    } else {
                        // No user from redirect, and not a magic link. Just go to dashboard, middleware will protect it.
                        router.push('/dashboard');
                    }
                }
            })
            .catch((err) => {
                console.error('getRedirectResult error:', err);
                setError(err.message || 'An error occurred during sign-in.');
            });
    }

  }, [auth, router, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <h1 className="text-2xl font-bold text-destructive">Authentication Failed</h1>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <Button variant="link" onClick={() => router.push('/login')} className="mt-4">
          Return to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Finalizing authentication...</p>
      </div>
    </div>
  );
}
