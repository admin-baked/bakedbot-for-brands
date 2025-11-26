
'use client';

import DevLoginButton from '@/components/dev-login-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo, type UserCredential } from 'firebase/auth';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const isProd = process.env.NODE_ENV === 'production';

// Force dynamic rendering to avoid hydration errors with Firebase hooks
export const dynamic = 'force-dynamic';

export default function CustomerLoginPage() {
  const { auth } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuthSuccess = async (userCredential: UserCredential) => {
    const idTokenResult = await userCredential.user.getIdTokenResult();
    const isNewUser = getAdditionalUserInfo(userCredential)?.isNewUser;
    const userRole = idTokenResult.claims.role as string | undefined;

    // If user has no role or is brand new, send to onboarding.
    if (!userRole || isNewUser) {
      router.push('/onboarding');
      return;
    }

    // Check if user has appropriate role for customer login
    if (userRole === 'customer') {
      router.push('/account');
    } else if (userRole === 'brand' || userRole === 'dispensary' || userRole === 'owner') {
      toast({
        variant: 'default',
        title: 'Business Account',
        description: 'Redirecting to your dashboard.'
      });
      router.push('/dashboard');
    } else {
      router.push('/account');
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      toast({ title: 'Signed In!', description: 'Welcome to BakedBot AI.' });
      await handleAuthSuccess(result);
    } catch (error: any) {
      // Don't show an error toast if the user simply closes the popup
      if (error.code === 'auth/popup-closed-by-user') {
        return;
      }
      toast({ variant: 'destructive', title: 'Google Sign-In Error', description: error.message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email || !password) return;

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: 'Account Created!', description: 'Redirecting you to onboarding...' });
        await handleAuthSuccess(userCredential);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'Login Successful!', description: 'Redirecting...' });
        await handleAuthSuccess(userCredential);
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


  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{isSignUp ? 'Create an Account' : 'Customer Login'}</CardTitle>
          <CardDescription>
            {isSignUp ? 'Sign up to get started.' : 'Sign in to view your order history and manage preferences.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
            <Image src="https://storage.googleapis.com/stedi-assets/misc/google-icon.svg" alt="Google icon" width={16} height={16} className="mr-2" />
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
