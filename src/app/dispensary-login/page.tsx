'use client';

import DevLoginButton from '@/components/dev-login-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const isProd = process.env.NODE_ENV === 'production';

export default function DispensaryLoginPage() {
  const { auth } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompletingSignIn, setIsCompletingSignIn] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);


  useEffect(() => {
    if (auth && isSignInWithEmailLink(auth, window.location.href)) {
      let emailForSignIn = window.localStorage.getItem('emailForSignIn');
      if (!emailForSignIn) {
        emailForSignIn = window.prompt('Please provide your email for confirmation');
      }
      if (emailForSignIn) {
        setIsCompletingSignIn(true);
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then((result) => {
            window.localStorage.removeItem('emailForSignIn');
            toast({ title: 'Success!', description: 'You have been signed in.' });
            router.push('/dashboard');
          })
          .catch((error) => {
            toast({ variant: 'destructive', title: 'Sign-in Failed', description: 'The sign-in link is invalid or has expired.' });
            setIsCompletingSignIn(false);
          });
      }
    }
  }, [auth, router, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email || !password) return;

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: 'Account Created!', description: 'Redirecting you to onboarding...' });
        router.push('/onboarding');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'Login Successful!', description: 'Redirecting to your dashboard...' });
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error(`${isSignUp ? 'Sign up' : 'Login'} error`, error);
      const friendlyMessage = error.message.includes('auth/invalid-credential') 
        ? 'Invalid email or password.'
        : error.message;
      toast({ variant: 'destructive', title: 'Authentication Error', description: friendlyMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      
      toast({ title: 'Signed In!', description: 'Welcome to BakedBot AI.' });
      
      if (additionalUserInfo?.isNewUser) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Google Sign-In Error', description: error.message });
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
          <CardTitle className="text-2xl">{isSignUp ? 'Create a Dispensary Account' : 'Dispensary Login'}</CardTitle>
          <CardDescription>
            {isSignUp ? 'Sign up to manage your location.' : "Manage your location's orders and settings."}
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
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="email">Work Email Address</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="manager@dispensary.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSignUp ? 'Sign Up' : 'Login'}
                </Button>
            </form>
        </CardContent>
        <CardFooter className="flex-col gap-4">
            <Button type="button" variant="link" size="sm" onClick={() => setIsSignUp(!isSignUp)}>
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Button>
            {!isProd && (
                <>
                    <div className="relative w-full">
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
        </CardFooter>
      </Card>
    </div>
  );
}
