
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { doc, getDoc } from 'firebase/firestore';


export function CallbackClientInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { auth, firestore } = useFirebase();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('Verifying your sign-in…');

  useEffect(() => {
    const run = async () => {
        const href = window.location.href;

        if (!auth || !firestore) {
            // This can happen on first render if Firebase isn't initialized yet.
            // The hook will re-run once auth is available.
            return;
        }
        
        // Fast-fail if URL is missing required params
        const hasOob = !!params.get("oobCode");
        const hasMode = !!params.get("mode");
        if (!hasOob || !hasMode) {
          throw new Error("missing-params");
        }
        
        if (!isSignInWithEmailLink(auth, href)) {
          throw new Error("not-email-link");
        }
        
        let email = window.localStorage.getItem('emailForSignIn') || '';
        if (!email) {
            // As a fallback, try getting it from the URL
            email = params.get('email') || '';
        }
        if (!email) {
            // Cross-device flow: prompt for email
            email = window.prompt('Please provide your email to complete the sign-in.') || '';
        }
        if (!email) {
            throw new Error('email-required');
        }

        try {
            const userCredential = await signInWithEmailLink(auth, email, href);
            window.localStorage.removeItem('emailForSignIn');
            setStatus('success');
            setMessage('Signed in successfully! Redirecting...');
            
            // Check user role and redirect accordingly
            const userDocRef = doc(firestore, 'users', userCredential.user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists() && userDoc.data().role === 'dispensary') {
                router.replace('/dashboard/orders');
            } else if (userDoc.exists() && userDoc.data().onboardingCompleted) {
                router.replace('/dashboard');
            } else {
                router.replace('/onboarding');
            }

        } catch (error) {
            // This catch is for signInWithEmailLink specific errors (e.g. expired link)
            throw error;
        }
    };
    
    run().catch(err => {
        const code = (err?.code || err?.message || '').toString();
        let friendly = "Invalid or expired sign-in link. Please request a new one.";

        if (code.includes("expired") || code.includes("invalid-action-code")) {
            friendly = "This sign-in link has expired or was already used. Request a new link.";
        } else if (code.includes("missing-params") || code.includes("not-email-link")) {
            friendly = "This URL is missing required information. Try the newest email you received.";
        } else if (code.includes("email-required")) {
            friendly = "Email confirmation is required to finish sign-in.";
        }
        
        setStatus('error');
        setMessage(friendly);
        setTimeout(() => router.replace('/brand-login?error=' + encodeURIComponent(friendly)), 2500);
    });

  }, [auth, firestore, params, router]);

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
