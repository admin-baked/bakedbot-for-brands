'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CallbackClient() {
  const { auth } = useFirebase();
  const router = useRouter();
  const search = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('Verifying your sign-in…');

  useEffect(() => {
    if (!auth) {
        // Firebase auth might not be initialized on first render.
        return;
    }
    
    const run = async () => {
      try {
        const href = window.location.href;

        const hasOob = !!search.get('oobCode');
        const hasMode = !!search.get('mode');
        if (!hasOob || !hasMode) {
          throw new Error('missing-params');
        }

        if (!isSignInWithEmailLink(auth, href)) {
          throw new Error('not-email-link');
        }

        let email = window.localStorage.getItem('emailForSignIn') || '';
        if (!email) {
          email = window.prompt('Confirm your email to finish sign-in') || '';
        }
        if (!email) {
          throw new Error('email-required');
        }

        await signInWithEmailLink(auth, email, href);

        window.localStorage.removeItem('emailForSignIn');
        setStatus('success');
        setMessage('Signed in! Redirecting…');
        router.replace('/account');
      } catch (err: any) {
        const code = (err?.code || err?.message || '').toString();

        let friendly = 'Invalid or expired sign-in link. Please request a new one.';
        if (code.includes('expired') || code.includes('invalid-action-code')) {
          friendly = 'This sign-in link has expired or was already used. Request a new link.';
        } else if (code.includes('missing-params') || code.includes('not-email-link')) {
          friendly = 'This URL is missing required information. Try the newest email you received.';
        } else if (code.includes('email-required')) {
          friendly = 'Email confirmation is required to finish sign-in.';
        } else if (code.includes('auth/tenant-id-mismatch')) {
          friendly = 'This link belongs to a different environment. Use the latest email from this site.';
        }

        setStatus('error');
        setMessage(friendly);
        setTimeout(() => router.replace('/brand-login?error=' + encodeURIComponent(friendly)), 2500);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]); // Rerun when auth is available

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <CardTitle>
                    {status === 'verifying' && 'Authenticating...'}
                    {status === 'success' && 'Success!'}
                    {status === 'error' && 'Authentication Failed'}
                </CardTitle>
                 <CardDescription>{message}</CardDescription>
            </CardHeader>
            <CardContent>
                {status === 'verifying' && <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />}
                {status === 'success' && <CheckCircle className="mx-auto h-12 w-12 text-green-500" />}
                {status === 'error' && <AlertCircle className="mx-auto h-12 w-12 text-destructive" />}
            </CardContent>
        </Card>
    </div>
  );
}
