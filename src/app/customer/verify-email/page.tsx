/**
 * Email Verification Handler Page
 * Handles Firebase email verification action links
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';

// Get auth instance
const { auth } = typeof window !== 'undefined'
    ? initializeFirebase()
    : { auth: null as any };
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

import { logger } from '@/lib/logger';
function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = searchParams?.get('mode');
    const oobCode = searchParams?.get('oobCode');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your email...');

    useEffect(() => {
        const verifyEmail = async () => {
            if (!oobCode) {
                setStatus('error');
                setMessage('Invalid verification link.');
                return;
            }

            try {
                // Verify the code
                await applyActionCode(auth, oobCode);
                setStatus('success');
                setMessage('Your email has been verified successfully!');
            } catch (error: any) {
                logger.error('Verification error:', error);
                setStatus('error');
                setMessage(error.message || 'Failed to verify email. The link may have expired.');
            }
        };

        if (mode === 'verifyEmail') {
            verifyEmail();
        } else {
            setStatus('error');
            setMessage('Invalid action mode.');
        }
    }, [mode, oobCode]);

    return (
        <div className="container max-w-md mx-auto px-4 py-16">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle>Email Verification</CardTitle>
                    <CardDescription>Verifying your account</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-6">
                    {status === 'loading' && (
                        <>
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-muted-foreground">{message}</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <CheckCircle className="h-12 w-12 text-green-500" />
                            <p className="text-center font-medium">{message}</p>
                            <Button onClick={() => router.push('/customer/profile')} className="w-full">
                                Go to Profile
                            </Button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <XCircle className="h-12 w-12 text-destructive" />
                            <p className="text-center text-destructive">{message}</p>
                            <Button onClick={() => router.push('/customer/login')} variant="outline" className="w-full">
                                Back to Login
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-16"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <VerifyEmailContent />
        </Suspense>
    );
}
