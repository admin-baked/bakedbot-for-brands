
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { useState } from 'react';

export default function DispensaryLoginPage() {
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
          <CardTitle className="text-2xl">Dispensary Login</CardTitle>
          <CardDescription>
            Manage your location's orders and settings.
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
                <Label htmlFor="email">Work Email Address</Label>
                <Input
                    id="email"
                    name="email" // for e2e test
                    type="email"
                    placeholder="manager@dispensary.com"
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
        </CardContent>
      </Card>
    </div>
  );
}



