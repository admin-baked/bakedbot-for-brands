
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
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const isProd = process.env.NODE_ENV === 'production';

export default function BrandLoginPage() {
  const router = useRouter();
  const { auth } = useFirebase();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email || !password) return;

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        // Handle user registration
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: 'Account Created!', description: 'Redirecting you to onboarding...' });
        // After sign-up, user is auto-logged in, redirect to onboarding
        router.push('/onboarding');
      } else {
        // Handle user login
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{isSignUp ? 'Create a Brand Account' : 'Brand Login'}</CardTitle>
          <CardDescription>
            {isSignUp ? 'Sign up to manage your brand and products.' : 'Access your dashboard to manage your brand.'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSignUp ? 'Sign Up' : 'Login'}
            </Button>
            <Button type="button" variant="link" size="sm" onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Button>
          </CardFooter>
        </form>

        {!isProd && (
          <CardContent>
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
          </CardContent>
        )}
      </Card>
    </div>
  );
}
