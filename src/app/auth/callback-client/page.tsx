'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// This is the fix. By exporting this variable, we tell Next.js to always
// render this page on the client and not to pre-render it during the build.
export const dynamic = 'force-dynamic';

export default function AuthCallbackClientPage() {
  const { auth } = useFirebase();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This effect should only run once on component mount.
    // Ensure auth is initialized on the client before proceeding.
    if (!auth || typeof window === 'undefined') {
      return;
    }

    const href = window.location.href;
    const email = window.localStorage.getItem('emailForSignIn');

    // If the link is not a valid sign-in link, or if the email is missing,
    // redirect to login with an error.
    if (!isSignInWithEmailLink(auth, href) || !email) {
      router.replace('/brand-login?error=' + encodeURIComponent('Invalid or expired sign-in link. Please try again.'));
      return;
    }

    // Now we can complete the sign-in.
    signInWithEmailLink(auth, email, href)
      .then((result) => {
        window.localStorage.removeItem('emailForSignIn');
        // The onAuthStateChanged listener in FirebaseProvider will detect the user
        // and the layout will redirect to /account.
        // We can just redirect to the account page optimistically.
        router.replace('/account');
      })
      .catch((err) => {
        console.error('Magic Link sign-in error:', err);
        // Map common Firebase errors to user-friendly messages.
        let errorMessage = 'An unknown error occurred. Please try again.';
        if (err.code === 'auth/invalid-email') {
          errorMessage = 'The email address is not valid.';
        } else if (err.code === 'auth/user-disabled') {
          errorMessage = 'This user account has been disabled.';
        } else if (err.code === 'auth/invalid-action-code') {
           errorMessage = 'The sign-in link is invalid or has expired. Please request a new one.';
        }
        
        setError(errorMessage);
        // For a better UX, redirect back to login with the error message
        // instead of just showing it on a blank page.
        router.replace('/brand-login?error=' + encodeURIComponent(errorMessage));
      });

  }, [auth, router]);

  // Display a loading state while the sign-in process is in progress.
  if (!auth) {
    // Render a loading state if auth is not available yet (e.g., during initial render)
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
           <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>Authenticating...</CardTitle>
                    <CardDescription>Finalizing your secure sign-in.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
       <Card className="w-full max-w-md text-center">
            <CardHeader>
                <CardTitle>Signing In...</CardTitle>
                <CardDescription>Please wait while we securely sign you in.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            </CardContent>
        </Card>
    </div>
  );
}
