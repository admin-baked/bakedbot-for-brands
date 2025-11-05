
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { isSignInWithEmailLink, signInWithEmailLink, getRedirectResult } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCallbackClientPage() {
  const router = useRouter();
  const { auth } = useFirebase();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    if (!auth) {
        // Firebase auth instance might not be ready on first render.
        return;
    }

    const fullUrl = window.location.href;

    // This function will be called for both Google redirect and magic link.
    const processAuth = async () => {
        try {
            // First, check for magic link sign-in.
            if (isSignInWithEmailLink(auth, fullUrl)) {
                let email = window.localStorage.getItem('emailForSignIn');
                if (!email) {
                    email = window.prompt('Please provide your email for confirmation');
                }

                if (email) {
                    await signInWithEmailLink(auth, email, fullUrl);
                    window.localStorage.removeItem('emailForSignIn');
                    router.push('/dashboard');
                } else {
                    throw new Error('Email address not found. Please try signing in again.');
                }
                return; // Stop processing
            }

            // If not a magic link, check for a redirect result from Google.
            const result = await getRedirectResult(auth);
            if (result && result.user) {
                // User successfully signed in via redirect.
                router.push('/dashboard');
                return; // Stop processing
            }
            
            // If we reach here, it means this page was likely loaded without a pending
            // auth action (e.g., user bookmarked it or navigated directly).
            // We can just redirect them to the dashboard where the middleware will
            // handle auth state.
            router.push('/dashboard');

        } catch (err: any) {
            console.error('Authentication callback error:', err);
            const friendlyMessage = err.message || 'An unknown error occurred during sign-in. The link may have expired or been used already.';
            setError(friendlyMessage);
        } finally {
            setIsProcessing(false);
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

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Finalizing authentication...</p>
      </div>
    </div>
  );
}
