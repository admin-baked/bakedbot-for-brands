'use client';

import DevLoginButton from '@/components/dev-login-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const isProd = process.env.NODE_ENV === 'production';

export default function CustomerLoginPage() {
  const { auth } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLinkSent, setIsLinkSent] = useState(false);
  const [isCompletingSignIn, setIsCompletingSignIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // This effect runs on the client after the component mounts.
    // It checks if the user is returning from the magic link email.
    if (auth && isSignInWithEmailLink(auth, window.location.href)) {
      let emailForSignIn = window.localStorage.getItem('emailForSignIn');
      if (!emailForSignIn) {
        // This can happen if the user opens the link on a different device.
        emailForSignIn = window.prompt('Please provide your email for confirmation');
      }

      if (emailForSignIn) {
        setIsCompletingSignIn(true);
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then((result) => {
            window.localStorage.removeItem('emailForSignIn');
            toast({ title: 'Success!', description: 'You have been signed in.' });
            router.push('/account'); // Redirect to account page after successful login
          })
          .catch((error) => {
            toast({ variant: 'destructive', title: 'Sign-in Failed', description: 'The sign-in link is invalid or has expired.' });
            setIsCompletingSignIn(false);
          });
      }
    }
  }, [auth, router, toast]);
  
  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: 'Signed In!', description: 'You have successfully signed in with Google.' });
      router.push('/account');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Google Sign-In Error', description: error.message });
    }
  };

  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email) return;

    setIsSubmitting(true);
    const actionCodeSettings = {
        // The URL to redirect to after the user clicks the link in the email.
        // It's important this is the same page so we can complete the sign-in.
        url: window.location.href, 
        handleCodeInApp: true,
    };

    try {
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
        setIsLinkSent(true);
        toast({ title: 'Magic Link Sent!', description: `A sign-in link has been sent to ${email}.` });
    } catch (error: any) {
        console.error('Magic link error', error);
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isCompletingSignIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <CardTitle>Completing Sign-In</CardTitle>
                <CardDescription>Please wait while we securely sign you in...</CardDescription>
            </CardHeader>
            <CardContent>
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Customer Login</CardTitle>
          <CardDescription>
            Sign in to view your order history and manage preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
                <Image src="https://storage.googleapis.com/stedi-assets/misc/google-icon.svg" alt="Google icon" width={16} height={16} className="mr-2"/>
                 Sign in with Google
            </Button>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    Or with email
                    </span>
                </div>
            </div>

          {isLinkSent ? (
            <div className="text-center" data-testid="magic-link-sent-card">
              <h2 className="text-xl font-semibold">Check Your Inbox!</h2>
              <p className="mt-2 text-muted-foreground">
                We've sent a magic sign-in link to <strong>{email}</strong>. Click the link in the email to complete your login.
              </p>
            </div>
          ) : (
            <form onSubmit={handleMagicLinkSignIn} className="space-y-4">
               <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
               </div>
               <Button type="submit" className="w-full" disabled={isSubmitting}>
                   Send Magic Link
               </Button>
            </form>
          )}
           {!isProd && (
            <>
                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                        Or for development
                        </span>
                    </div>
                </div>
                <DevLoginButton />
            </>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
