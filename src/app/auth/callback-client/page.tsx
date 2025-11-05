
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { isSignInWithEmailLink, signInWithEmailLink, getRedirectResult } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCallbackClientPage() {
  const router = useRouter();
  const { auth } = useFirebase();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
        // Firebase auth instance might not be ready on first render.
        return;
    }

    const fullUrl = window.location.href;

    const processAuth = async () => {
        setIsLoading(true);
        try {
            // Check for a redirect result from an OAuth provider (e.g., Google) first.
            const result = await getRedirectResult(auth);
            if (result && result.user) {
                // User successfully signed in via redirect.
                router.push('/dashboard');
                return; // Stop processing
            }

            // If no redirect result, check if it's a magic link sign-in.
            if (isSignInWithEmailLink(auth, fullUrl)) {
                let email = window.localStorage.getItem('emailForSignIn');
                if (!email) {
                    // If the email is not in localStorage, we must ask the user for it.
                    // This can happen if they open the link on a different device.
                    email = window.prompt('Please provide your email for confirmation');
                }

                if (email) {
                    await signInWithEmailLink(auth, email, fullUrl);
                    window.localStorage.removeItem('emailForSignIn');
                    router.push('/dashboard');
                } else {
                    // User cancelled the prompt or email was not available
                    throw new Error('Email address not found or not provided. Please try signing in again.');
                }
                return; // Stop processing
            }
            
            // If we reach here, it means this page was likely loaded without a pending
            // auth action (e.g., user bookmarked it or navigated directly).
            // We can just redirect them to the dashboard where the auth state will be checked.
            setIsLoading(false);
            router.push('/dashboard');

        } catch (err: any) {
            console.error('Authentication callback error:', err);
            const friendlyMessage = err.code === 'auth/invalid-action-code'
                ? 'The sign-in link is invalid or has expired. It may have already been used. Please try signing in again.'
                : err.message || 'An unknown error occurred during sign-in.';
            setError(friendlyMessage);
            setIsLoading(false);
        }
    };

    processAuth();

  }, [auth, router]);

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

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Finalizing authentication, please wait...</p>
        </div>
      </div>
    );
  }

  // This part should ideally not be seen, as the user is redirected.
  return null; 
}
