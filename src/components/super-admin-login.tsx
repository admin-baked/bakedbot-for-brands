'use client';

// src/components/super-admin-login.tsx
/**
 * Super Admin Login
 * Uses Firebase Auth + Server Session Cookie to satisfy middleware protection.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Sparkles, AlertCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { useFirebase } from '@/firebase/provider';
import { GoogleAuthProvider, signInWithPopup, signOut, signInWithCustomToken } from 'firebase/auth';
import { isSuperAdminEmail } from '@/lib/super-admin-config';
import { createDevLoginToken } from '@/app/actions/dev-login';

const isProd = process.env.NODE_ENV === 'production';

export default function SuperAdminLogin() {
    const router = useRouter();
    const { login, isSuperAdmin, superAdminEmail, logout } = useSuperAdmin();
    const { auth } = useFirebase();
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleGoogleLogin = async () => {
        if (!auth) {
            setError('Authentication service not ready. Please refresh.');
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const provider = new GoogleAuthProvider();
            // Force account selection to avoid auto-login to wrong account
            provider.setCustomParameters({ prompt: 'select_account' });

            const result = await signInWithPopup(auth, provider);
            const email = result.user.email?.toLowerCase();

            // 1. Verify Whitelist
            if (!email || !isSuperAdminEmail(email)) {
                await signOut(auth);
                setError('Access Denied: This email is not authorized for Super Admin access.');
                setIsSubmitting(false);
                return;
            }

            // 2. Set Server Session Cookie (Critical for Middleware)
            const idToken = await result.user.getIdToken(true);
            const sessionRes = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });

            if (!sessionRes.ok) {
                const sessionError = await sessionRes.text();
                let errorMessage = 'Failed to establish secure session.';
                try {
                    const errorJson = JSON.parse(sessionError);
                    errorMessage = errorJson.error || sessionError;
                    if (errorJson.details) errorMessage += `: ${errorJson.details}`;
                } catch (e) {
                     errorMessage = sessionError;
                }
                throw new Error(errorMessage);
            }

            // 3. Set Client State (Legacy hook support)
            login(email);

            // 4. Redirect
            router.push('/dashboard/ceo');

        } catch (err: any) {
            console.error('Super Admin Login Error:', err);
            setError(err.message || 'Login failed. Please try again.');
            setIsSubmitting(false);
            // Ensure we clean up partial states if needed
            if (auth.currentUser && !isSuperAdminEmail(auth.currentUser.email)) {
                await signOut(auth);
            }
        }
    };

    const handleLogout = async () => {
        if (auth) await signOut(auth);
        logout();
        // Clear server cookie
        await fetch('/api/auth/session', { method: 'DELETE' });
    };

    const handleDevLogin = async () => {
        if (!auth) {
            setError('Authentication service not ready. Please refresh.');
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            console.log('[DevLogin] Step 1: Creating dev token...');
            // 1. Create dev token for owner persona
            const result = await createDevLoginToken('owner');
            if ('error' in result) {
                throw new Error(result.error);
            }
            console.log('[DevLogin] Step 2: Token created, signing in...');

            // 2. Sign in with custom token
            const userCredential = await signInWithCustomToken(auth, result.token);
            console.log('[DevLogin] Step 3: Signed in, getting ID token...');

            // 3. Set Server Session Cookie
            const idToken = await userCredential.user.getIdToken(true);
            console.log('[DevLogin] Step 4: Got ID token, setting session...');

            const sessionRes = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });

            if (!sessionRes.ok) {
                const sessionError = await sessionRes.text();
                console.error('[DevLogin] Session error:', sessionError);
                let errorMessage = 'Failed to establish secure session.';
                try {
                    const errorJson = JSON.parse(sessionError);
                    errorMessage = errorJson.error || sessionError;
                    if (errorJson.details) errorMessage += `: ${errorJson.details}`;
                } catch (e) {
                    errorMessage = sessionError; // Fallback to raw text
                }
                throw new Error(errorMessage);
            }
            console.log('[DevLogin] Step 5: Session set, redirecting...');

            // 4. Set Client State (Super Admin localStorage)
            login('owner@bakedbot.ai');

            // 5. Redirect
            router.push('/dashboard/ceo');

        } catch (err: any) {
            console.error('[DevLogin] Error:', err);
            console.error('[DevLogin] Error code:', err.code);
            console.error('[DevLogin] Error message:', err.message);

            // Provide more specific error messages
            let errorMessage = 'Dev login failed. Please try again.';
            if (err.code === 'auth/internal-error') {
                errorMessage = 'Firebase authentication failed. This may be a temporary issue - please try again or check the console for details.';
            } else if (err.code === 'auth/invalid-custom-token') {
                errorMessage = 'Invalid authentication token. Please check service account configuration.';
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
            setIsSubmitting(false);
        }
    };

    const [quote, setQuote] = useState('');

    useEffect(() => {
        const quotes = [
            "We ain't got no sugar.",
            "You got knocked the f*** out!",
            "Friday is the day you get paid.",
            "I know you don't smoke weed, I know this...",
            "Every time I come in the kitchen, you in the kitchen.",
            "Bye Felicia.",
            "Daaaaamn!",
            "It's Friday, you ain't got no job, and you ain't got sh*t to do.",
            "Don't nobody go in the bathroom for about 35, 45 minutes.",
            "You win some, you lose some, but you live to fight another day."
        ];
        // Select random quote only on client-side mount
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, []);

    // Already logged in as super admin
    if (isSuperAdmin) {
        return (
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center">
                        <Spinner size="lg" />
                    </div>
                    <CardTitle className="text-2xl">Super Admin Active</CardTitle>
                    <CardDescription>
                        Logged in as <span className="font-semibold">{superAdminEmail}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        onClick={() => router.push('/dashboard/ceo')}
                        className="w-full"
                    >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Go to CEO Dashboard
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleLogout}
                        className="w-full"
                    >
                        Logout
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center">
                    <Spinner size="xl" />
                </div>
                <CardTitle className="text-2xl">Restricted Access</CardTitle>
                <CardDescription>
                    {isSubmitting ? quote : "Authorized Personnel Only"}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Button
                    onClick={handleGoogleLogin}
                    className="w-full py-6 text-lg"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Spinner size="sm" className="mr-2" />
                            Verifying Credentials...
                        </>
                    ) : (
                        <>
                            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Login with Google
                        </>
                    )}
                </Button>

                {!isProd && (
                    <>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or for development
                                </span>
                            </div>
                        </div>
                        <Button
                            onClick={handleDevLogin}
                            variant="outline"
                            className="w-full py-6 text-lg"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Spinner size="sm" className="mr-2" />
                                    Checking ID...
                                </>
                            ) : (
                                <>
                                    🔧 Dev Login (Owner)
                                </>
                            )}
                        </Button>
                    </>
                )}

                <div className="text-center text-xs text-muted-foreground mt-4">
                    <p className="opacity-70">"You ain't got to lie to kick it."</p>
                </div>
            </CardContent>
        </Card>
    );
}
