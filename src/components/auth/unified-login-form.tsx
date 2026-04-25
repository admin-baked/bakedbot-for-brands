'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner'; // Assuming this exists based on previous file usage
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    getAdditionalUserInfo,
    type UserCredential
} from 'firebase/auth';
import { logger } from '@/lib/logger';
import Link from 'next/link';

export function UnifiedLoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { auth } = useFirebase();
    const { toast } = useToast();

    // State
    const [mounted, setMounted] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [isLoading, setIsLoading] = useState(false);

    // Stable ref so the redirect-result effect can call the latest handleAuthSuccess
    // without needing it in the dep array (it changes every render).
    const handleAuthSuccessRef = React.useRef<((cred: UserCredential) => Promise<void>) | null>(null);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Handle Google redirect result — fires when the user returns from a
    // signInWithRedirect flow (mobile browsers that block popups).
    React.useEffect(() => {
        if (!auth) return;
        getRedirectResult(auth)
            .then((result) => {
                if (result && handleAuthSuccessRef.current) {
                    setIsLoading(true);
                    handleAuthSuccessRef.current(result).catch(() => setIsLoading(false));
                }
            })
            .catch((error: unknown) => {
                const code = (error as { code?: string })?.code;
                // 'auth/no-current-user' just means no redirect was in progress — ignore.
                if (code && code !== 'auth/no-current-user') {
                    toast({
                        variant: 'destructive',
                        title: 'Google Sign-In Failed',
                        description: mapFirebaseError(error),
                    });
                }
            });
        // auth is stable (Firebase singleton). mapFirebaseError is pure (no state deps)
        // so stale-closure risk is zero. toast ref from useToast is also stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth]);

    const toggleMode = () => setMode(mode === 'signin' ? 'signup' : 'signin');
    const mapFirebaseError = (error: any): string => {
        const code = typeof error?.code === 'string' ? error.code : '';

        if (code === 'auth/invalid-api-key') {
            return 'Firebase API key is invalid. Please contact support.';
        }
        if (code === 'auth/unauthorized-domain') {
            return 'This domain is not authorized for Google sign-in.';
        }
        if (code === 'auth/popup-blocked') {
            return 'Popup was blocked. We will try redirect sign-in instead.';
        }
        if (code === 'auth/popup-closed-by-user') {
            return 'Sign-in was canceled.';
        }
        if (code === 'auth/network-request-failed') {
            return 'Network error during sign-in. Please check your connection.';
        }

        return String(error?.message || 'Authentication failed.')
            .replace('Firebase:', '')
            .trim();
    };

    const getSafeNextPath = (): string | null => {
        const next = searchParams?.get('next');
        if (!next || typeof next !== 'string') return null;
        if (!next.startsWith('/')) return null;
        if (next.startsWith('//')) return null;
        return next;
    };

    const handleAuthSuccess = async (userCredential: UserCredential) => {
        // Overall timeout: if anything in session+routing takes > 15s, force redirect
        const safetyTimeout = setTimeout(() => {
            logger.warn('Auth success flow timed out — forcing redirect');
            window.location.href = getSafeNextPath() || '/dashboard';
        }, 15000);

        try {
            await createSession(userCredential.user);
            await routeUser(userCredential);
        } catch (error) {
            logger.error('Auth success handling failed', { error });
            toast({ variant: 'destructive', title: 'Sign-in slow', description: 'Redirecting you now...' });
            // Still redirect on failure — the session cookie may have been set
            setTimeout(() => {
                window.location.href = getSafeNextPath() || '/dashboard';
            }, 1500);
        } finally {
            clearTimeout(safetyTimeout);
        }
    };

    const createSession = async (user: any) => {
        const idToken = await user.getIdToken(true);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        try {
            const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const detail = await response.text().catch(() => '');
                throw new Error(`Session creation failed (${response.status}): ${detail.slice(0, 200)}`);
            }
        } catch (err: any) {
            if (err?.name === 'AbortError') {
                throw new Error('Session creation timed out — please try again');
            }
            throw err;
        } finally {
            clearTimeout(timeout);
        }
    };

    const routeUser = async (userCredential: UserCredential) => {
        try {
            // Force refresh to ensure we have latest claims, with timeout protection
            let idTokenResult;

            // createSession already force-refreshed the token via getIdToken(true),
            // so the cached result already has the latest claims — no second refresh needed.
            idTokenResult = await userCredential.user.getIdTokenResult(false);

            const role = idTokenResult.claims.role as string | undefined;
            const isNewUser = getAdditionalUserInfo(userCredential)?.isNewUser;
            const safeNextPath = getSafeNextPath();

            logger.info('Unified Login Routing', { role, isNewUser, uid: userCredential.user.uid });

            if (safeNextPath) {
                window.location.href = safeNextPath;
                return;
            }

            if (!role) {
                // No role -> Onboarding
                window.location.href = '/onboarding';
                return;
            }

            switch (role) {
                case 'owner':
                case 'super_user':
                case 'super_admin':
                    window.location.href = '/dashboard/ceo';
                    break;
                case 'brand':
                case 'brand_admin':
                case 'brand_member':
                case 'dispensary':
                case 'dispensary_admin':
                case 'dispensary_staff':
                case 'budtender':
                    window.location.href = '/dashboard';
                    break;
                case 'customer':
                    window.location.href = '/account';
                    break;
                default:
                    // Fallback for unknown roles
                    window.location.href = '/dashboard';
            }
        } catch (error: any) {
            logger.error('Routing after login failed:', error);
            // Don't block — redirect immediately to dashboard as fallback
            window.location.href = getSafeNextPath() || '/dashboard';
        }
    };

    // Keep ref current on every render so the redirect-result effect always
    // calls the latest handleAuthSuccess closure without stale deps.
    handleAuthSuccessRef.current = handleAuthSuccess;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth || isLoading) return;

        setIsLoading(true);

        try {
            let cred: UserCredential;

            if (mode === 'signup') {
                cred = await createUserWithEmailAndPassword(auth, email, password);
                toast({ title: "Account Created", description: "Welcome to BakedBot!" });
            } else {
                cred = await signInWithEmailAndPassword(auth, email, password);
                toast({ title: "Welcome back", description: "Signing you in..." });
            }

            await handleAuthSuccess(cred);
        } catch (error: any) {
            logger.error('Auth error', error);

            // Auto-fallback: If sign up fails because email exists, try login
            if (mode === 'signup' && error.code === 'auth/email-already-in-use') {
                try {
                    const cred = await signInWithEmailAndPassword(auth, email, password);
                    toast({ title: "Account Exists", description: "Logged you in instead!" });
                    await handleAuthSuccess(cred);
                    return;
                } catch (loginErr) {
                    // Password didn't match or other error
                }
            }

            toast({ variant: 'destructive', title: "Authentication Failed", description: mapFirebaseError(error) });
            setIsLoading(false);
        }
    };

    const handleGoogle = async () => {
        if (!auth || isLoading) return;
        setIsLoading(true);
        const provider = new GoogleAuthProvider();

        // Mobile browsers (iOS Safari, Android Chrome) handle popups unreliably.
        // Use redirect flow directly on mobile — getRedirectResult handles the return.
        const isMobile = /Mobi|Android|iPhone|iPad/i.test(
            typeof navigator !== 'undefined' ? navigator.userAgent : ''
        );
        if (isMobile) {
            await signInWithRedirect(auth, provider);
            return;
        }

        try {
            const result = await signInWithPopup(auth, provider);
            await handleAuthSuccess(result);
        } catch (error: any) {
            if (error?.code === 'auth/popup-closed-by-user') {
                setIsLoading(false);
                return;
            }

            if (error?.code === 'auth/popup-blocked') {
                // Popup blocked on desktop — fall back to redirect.
                await signInWithRedirect(auth, provider);
                return;
            }

            toast({ variant: 'destructive', title: "Google Sign-In Failed", description: mapFirebaseError(error) });
            setIsLoading(false);
        }
    };


    if (!mounted) {
        return (
            <Card className="glass-card w-full max-w-md border-white/10 shadow-2xl">
                <CardHeader className="text-center space-y-2">
                    <div className="flex justify-center py-8">
                        <Spinner className="h-8 w-8 text-emerald-500" />
                    </div>
                </CardHeader>
            </Card>
        );
    }


    if (!auth) {
        return (
            <Card className="glass-card w-full max-w-md border-white/10 shadow-2xl">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-2xl font-bold font-teko tracking-wide">Authentication unavailable</CardTitle>
                    <CardDescription>
                        Firebase client credentials are missing or invalid in this environment. Add a valid <code>NEXT_PUBLIC_FIREBASE_API_KEY</code> to enable sign-in.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="glass-card w-full max-w-md border-white/10 shadow-2xl">
            <CardHeader className="text-center space-y-2">
                <CardTitle className="text-2xl font-bold font-teko tracking-wide">
                    {mode === 'signin' ? 'Human Access' : 'Join the Agent Network'}
                </CardTitle>
                <CardDescription>
                    {mode === 'signin'
                        ? 'Log in to manage your AI workforce.'
                        : 'Create your account to start automating.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button variant="outline" className="w-full relative" onClick={handleGoogle} disabled={isLoading}>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </Button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-transparent px-2 text-muted-foreground backdrop-blur-sm">Or with email</span></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Work Email</Label>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="name@company.com"
                            className="bg-white/5 border-white/10 text-base"
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
                            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                            className="bg-white/5 border-white/10 text-base"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20" type="submit" disabled={isLoading}>
                        {isLoading && <Spinner className="mr-2 h-4 w-4" />}
                        {mode === 'signin' ? 'Log In' : 'Create Account'}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex justify-center">
                <Button variant="link" size="sm" onClick={toggleMode} className="text-muted-foreground hover:text-white">
                    {mode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                </Button>
            </CardFooter>
        </Card>
    );
}
