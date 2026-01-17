
// src/app/brand-login/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import DevLoginButton from '@/components/dev-login-button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo, type UserCredential } from 'firebase/auth';
import Image from 'next/image';
import { Spinner } from '@/components/ui/spinner';

import { logger } from '@/lib/logger';
const isProd = process.env.NODE_ENV === 'production';

// Force dynamic rendering to avoid hydration errors with Firebase hooks
export const dynamic = 'force-dynamic';

export default function BrandLoginPage() {
  const router = useRouter();
  const { auth } = useFirebase();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Auto-redirect if already logged in (enhancement)
  // Note: We use a separate useEffect/check here or integrate into the main flow?
  // Existing code uses 'auth' from useFirebase.

  const handleAuthSuccess = async (userCredential: UserCredential) => {
    // Force token refresh to get latest custom claims
    const idToken = await userCredential.user.getIdToken(true);

    // Create server session
    try {
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to create session');
      }
    } catch (error) {
      logger.error('Failed to create session', error instanceof Error ? error : new Error(String(error)));
      toast({ variant: 'destructive', title: 'Session Error', description: 'Failed to create server session.' });
      return;
    }

    // Small delay to ensure cookie propagation before redirect
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get fresh token result with updated claims
    const idTokenResult = await userCredential.user.getIdTokenResult(true);
    const isNewUser = getAdditionalUserInfo(userCredential)?.isNewUser;
    const userRole = idTokenResult.claims.role as string | undefined;

    console.log('Auth success - User role:', userRole, 'Is new user:', isNewUser);
    console.log('ID token claims:', idTokenResult.claims);

    // Use window.location.href for full page reload to ensure session cookie is picked up
    // VALIDATION: Trust the role claim if present. 'isNewUser' can be true for existing users logging in via provider for the first time.
    if (!userRole) {
      console.log('No role found. Redirecting to onboarding...');
      window.location.href = '/onboarding';
      return;
    }

    // Check if user has appropriate role for brand login
    if (userRole === 'owner') {
      console.log('Redirecting to CEO dashboard for owner...');
      window.location.href = '/dashboard/ceo';
    } else if (userRole === 'brand') {
      console.log('Redirecting to dashboard for brand...');
      window.location.href = '/dashboard';
    } else if (userRole === 'dispensary') {
      console.log('Redirecting to dashboard for dispensary...');
      toast({
        variant: 'default',
        title: 'Redirecting...',
        description: 'You have a dispensary account. Redirecting to dashboard.'
      });
      window.location.href = '/dashboard';
    } else if (userRole === 'customer') {
      console.log('Redirecting to account for customer...');
      toast({
        variant: 'default',
        title: 'Customer Account',
        description: 'Redirecting to your account page.'
      });
      window.location.href = '/account';
    } else {
      console.log('Redirecting to dashboard (default)...');
      window.location.href = '/dashboard';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email || !password) return;

    if (password.length < 6) {
      toast({ variant: 'destructive', title: 'Invalid Password', description: 'Password must be at least 6 characters long.' });
      return;
    }

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
      logger.error(`${isSignUp ? 'Sign up' : 'Login'} error`, error);
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{isSignUp ? 'Create a Brand Account' : 'Brand Login'}</CardTitle>
          <CardDescription>
            {isSignUp ? 'Sign up to manage your brand and products.' : 'Access your dashboard to manage your brand.'}
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
              <Label htmlFor="email">Business Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="manager@yourbrand.com"
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
              {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
              {isSignUp ? 'Sign Up' : 'Login'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
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

          {/* Super Admin Access */}
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Internal
              </span>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => router.push('/super-admin')}>
            🔐 Super Admin Access
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
