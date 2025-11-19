
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DevLoginButton from '@/components/dev-login-button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { sendSignInLinkToEmail } from 'firebase/auth';

export default function BrandLoginPage() {
  const router = useRouter();
  const { auth } = useFirebase();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLinkSent, setIsLinkSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email) return;

    setIsSubmitting(true);
    const actionCodeSettings = {
      url: `${window.location.origin}/dashboard`, // Redirect to dashboard after sign-in
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Brand Login</CardTitle>
          <CardDescription>
            Access your dashboard to manage your brand and products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLinkSent ? (
            <div className="text-center" data-testid="magic-link-sent-card">
              <h2 className="text-xl font-semibold">Check Your Inbox!</h2>
              <p className="mt-2 text-muted-foreground">
                We've sent a magic sign-in link to <strong>{email}</strong>. Click the link in the email to access your dashboard.
              </p>
            </div>
          ) : (
            <form onSubmit={handleMagicLinkSignIn} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Send Magic Link
              </Button>
            </form>
          )}

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
          {/* The DevLoginButton is a convenience for local development */}
          <DevLoginButton />
        </CardContent>
      </Card>
    </div>
  );
}
