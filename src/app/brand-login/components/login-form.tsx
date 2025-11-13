
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, Sparkles, ChevronDown } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { useUser } from '@/firebase/auth/use-user';
import { sendSignInLinkToEmail } from 'firebase/auth';
import Logo from '@/components/logo';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Suspense } from 'react';
import { doc, getDoc } from 'firebase/firestore';

const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.011 36.686 44 32.68 44 28c0-2.782-.488-5.4-1.35-7.892l-1.039-3.025z" />
    </svg>
);


function LoginFormContent() {
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const { auth, firestore } = useFirebase();
    const { user } = useUser();
    const router = useRouter();


    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            toast({
                variant: 'destructive',
                title: 'Authentication Error',
                description: decodeURIComponent(error),
            });
        }
    }, [searchParams, toast]);

    // Redirect if user is already logged in
    useEffect(() => {
        if (user) {
             if (firestore) {
                const userDocRef = doc(firestore, 'users', user.uid);
                getDoc(userDocRef).then(userDoc => {
                     if (userDoc.exists() && userDoc.data().role === 'dispensary') {
                        router.replace('/dashboard/orders');
                    } else if (userDoc.exists() && userDoc.data().onboardingCompleted) {
                        router.replace('/dashboard');
                    } else {
                        // User exists but hasn't completed onboarding or has no role yet
                        router.replace('/onboarding');
                    }
                })
             } else {
                router.replace('/account');
             }
        }
    }, [user, router, firestore]);


    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        window.location.href = '/api/auth/google/login';
    };

    const handleMagicLinkSignIn = useCallback(async (e: React.FormEvent, targetEmail?: string) => {
        e.preventDefault();
        const finalEmail = targetEmail || email;
        if (!finalEmail) {
            toast({
                variant: 'destructive',
                title: 'Email is required',
                description: 'Please enter your email address to receive a magic link.',
            });
            return;
        }

        if (!auth) {
            toast({ variant: 'destructive', title: 'Initialization Error', description: 'Firebase not ready.' });
            return;
        }

        setIsMagicLinkLoading(true);
        setIsLoading(true);
        try {
            const host = process.env.NODE_ENV === 'development'
                ? 'http://localhost:3000'
                : 'https://brands.bakedbot.ai';
            const actionCodeSettings = {
                handleCodeInApp: true,
                url: `${host}/auth/callback`,
            };

            window.localStorage.setItem('emailForSignIn', finalEmail);
            await sendSignInLinkToEmail(auth, finalEmail, actionCodeSettings);

            setMagicLinkSent(true);
            setEmail(finalEmail);
            toast({
                title: 'Magic Link Sent!',
                description: `A sign-in link has been sent to ${finalEmail}. Check your inbox!`,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            toast({
                variant: 'destructive',
                title: 'Failed to send link',
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
            setIsMagicLinkLoading(false);
        }
    }, [email, toast, auth]);
    
    if (magicLinkSent) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="items-center text-center">
                        <Sparkles className="mx-auto h-12 w-12 text-primary" />
                        <CardTitle className="mt-4 text-2xl">Check Your Inbox!</CardTitle>
                        <CardDescription>
                            A magic sign-in link has been sent to <strong>{email}</strong>. Click the link in the email to log in.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                         <Button variant="link" className="w-full" onClick={() => setMagicLinkSent(false)}>Back to Login</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return <LoginPageFallback />;
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="items-center space-y-4 text-center">
                    <Logo height={32} />
                    <div className="space-y-1">
                        <CardTitle className="text-2xl">Customer Login</CardTitle>
                        <CardDescription>Sign in or create an account to get started.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleSignIn}
                        disabled={isGoogleLoading || isMagicLinkLoading}
                    >
                        {isGoogleLoading ? <Loader2 className="animate-spin" /> : <><GoogleIcon /> Continue with Google</>}
                    </Button>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or with magic link</span>
                        </div>
                    </div>
                    <form onSubmit={(e) => handleMagicLinkSignIn(e, email)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isGoogleLoading || isMagicLinkLoading}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isGoogleLoading || isMagicLinkLoading || !email}>
                            {isMagicLinkLoading ? <Loader2 className="animate-spin" /> : <><KeyRound className="mr-2" /> Send Magic Link</>}
                        </Button>
                    </form>
                </CardContent>
                {process.env.NODE_ENV === 'development' && (
                    <CardFooter className="flex-col gap-2">
                        <div className="relative w-full">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">For Devs</span>
                            </div>
                        </div>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" className="w-full">
                                    Dev Magic Login <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-80">
                                <DropdownMenuItem onClick={(e) => handleMagicLinkSignIn(e, 'martez@bakedbot.ai')}>
                                    Login as martez@bakedbot.ai
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => handleMagicLinkSignIn(e, 'rishabh@bakedbot.ai')}>
                                    Login as rishabh@bakedbot.ai
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}


export default function LoginForm() {
    return (
        <Suspense fallback={<LoginPageFallback />}>
            <LoginFormContent />
        </Suspense>
    );
}

function LoginPageFallback() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
             <Card className="w-full max-w-md">
                <CardHeader className="items-center space-y-4 text-center">
                    <Logo height={32} />
                     <div className="space-y-1">
                        <CardTitle className="text-2xl">Welcome Back</CardTitle>
                        <CardDescription>Sign in to manage your BakedBot AI</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Loading...</p>
                </CardContent>
            </Card>
        </div>
    )
}
