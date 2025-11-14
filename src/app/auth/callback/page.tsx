
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/logo';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function AuthCallbackPage() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'need-email'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { auth, firestore } = useFirebase();
    const { toast } = useToast();

    useEffect(() => {
        if (!auth) {
            console.log('⏳ Callback: Waiting for Firebase auth to initialize...');
            return;
        }

        const handleMagicLinkSignIn = async () => {
            const url = window.location.href;
            
            console.log('🔗 Callback URL:', url);
            console.log('🔍 Checking if this is a valid sign-in link...');

            if (!isSignInWithEmailLink(auth, url)) {
                console.log('❌ Not a valid email sign-in link');
                setStatus('error');
                setErrorMessage('Invalid sign-in link. Please request a new one.');
                return;
            }

            console.log('✅ Valid sign-in link detected');

            let emailForSignIn = window.localStorage.getItem('emailForSignIn');
            
            console.log('📧 Stored email:', emailForSignIn);

            if (!emailForSignIn) {
                console.log('⚠️ No email found in localStorage, asking user...');
                setStatus('need-email');
                return;
            }

            try {
                console.log('🔐 Attempting to sign in with email link...');
                const result = await signInWithEmailLink(auth, emailForSignIn, url);
                
                console.log('✅ Sign-in successful!', result.user.email);
                
                window.localStorage.removeItem('emailForSignIn');
                
                // ✅ CREATE USER DOCUMENT IF IT DOESN'T EXIST
                if (firestore) {
                    try {
                        const userDocRef = doc(firestore, 'users', result.user.uid);
                        const userDoc = await getDoc(userDocRef);
                        
                        if (!userDoc.exists()) {
                            console.log('🆕 Creating new user document...');
                            
                            // Create new user document with default values
                            await setDoc(userDocRef, {
                                uid: result.user.uid,
                                email: result.user.email,
                                displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
                                photoURL: result.user.photoURL || null,
                                role: 'customer', // Default role
                                onboardingCompleted: false, // Start the onboarding flow
                            });
                            
                            console.log('✅ User document created successfully');
                        } else {
                            console.log('✅ User document already exists');
                        }
                    } catch (firestoreError) {
                        console.error('⚠️ Error creating user document:', firestoreError);
                        // Don't block login if user doc creation fails
                    }
                }

                setStatus('success');
                
                toast({
                    title: 'Welcome!',
                    description: `Successfully signed in as ${result.user.email}`,
                });

                console.log('🎉 Magic link sign-in complete. Redirecting to dashboard...');
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Redirect based on role
                if (firestore) {
                    try {
                        const userDocRef = doc(firestore, 'users', result.user.uid);
                        const userDoc = await getDoc(userDocRef);
                        
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            if (userData.onboardingCompleted === false) {
                                router.replace('/onboarding');
                            } else if (userData.role === 'dispensary') {
                                router.replace('/dashboard/orders');
                            } else if (userData.role === 'brand' || userData.role === 'owner') {
                                router.replace('/dashboard');
                            } else {
                                router.replace('/account/dashboard');
                            }
                        } else {
                            router.replace('/onboarding');
                        }
                    } catch {
                        router.replace('/account/dashboard');
                    }
                } else {
                    router.replace('/account/dashboard');
                }

            } catch (error: any) {
                console.error('❌ Sign-in error:', error);
                setStatus('error');
                
                if (error.code === 'auth/invalid-action-code') {
                    setErrorMessage('This sign-in link has expired or has already been used. Please request a new one.');
                } else if (error.code === 'auth/invalid-email') {
                    setErrorMessage('The email address is invalid. Please try again.');
                } else {
                    setErrorMessage(error.message || 'An error occurred during sign-in.');
                }

                toast({
                    variant: 'destructive',
                    title: 'Sign-in Failed',
                    description: errorMessage,
                });
            }
        };

        handleMagicLinkSignIn();
    }, [auth, router, toast, firestore, errorMessage]);

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!auth || !email) return;

        setIsSubmitting(true);
        const url = window.location.href;

        try {
            console.log('🔐 Attempting to sign in with provided email:', email);
            const result = await signInWithEmailLink(auth, email, url);
            
            console.log('✅ Sign-in successful!', result.user.email);
            
            window.localStorage.setItem('emailForSignIn', email);

             // ✅ CREATE USER DOCUMENT IF IT DOESN'T EXIST
            if (firestore) {
                try {
                    const userDocRef = doc(firestore, 'users', result.user.uid);
                    const userDoc = await getDoc(userDocRef);
                    
                    if (!userDoc.exists()) {
                        console.log('🆕 Creating new user document...');
                        
                        await setDoc(userDocRef, {
                            uid: result.user.uid,
                            email: result.user.email,
                            displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
                            photoURL: result.user.photoURL || null,
                            role: 'customer', // Default role
                            onboardingCompleted: false, // Start the onboarding flow
                        });
                        
                        console.log('✅ User document created successfully');
                    } else {
                        console.log('✅ User document already exists');
                    }
                } catch (firestoreError) {
                    console.error('⚠️ Error creating user document:', firestoreError);
                }
            }
            
            setStatus('success');
            
            toast({
                title: 'Welcome!',
                description: `Successfully signed in as ${result.user.email}`,
            });

            await new Promise(resolve => setTimeout(resolve, 1000));

            if (firestore) {
                try {
                    const userDocRef = doc(firestore, 'users', result.user.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        
                        if (userData.onboardingCompleted === false) {
                            router.replace('/onboarding');
                        } else if (userData.role === 'dispensary') {
                            router.replace('/dashboard/orders');
                        } else if (userData.role === 'brand' || userData.role === 'owner') {
                            router.replace('/dashboard');
                        } else {
                            router.replace('/account/dashboard');
                        }
                    } else {
                        router.replace('/onboarding');
                    }
                } catch {
                    router.replace('/account/dashboard');
                }
            } else {
                router.replace('/account/dashboard');
            }

        } catch (error: any) {
            console.error('❌ Sign-in error:', error);
            
            let errorMsg = 'An error occurred during sign-in.';
            
            if (error.code === 'auth/invalid-action-code') {
                errorMsg = 'This sign-in link has expired or has already been used.';
            } else if (error.code === 'auth/invalid-email') {
                errorMsg = 'The email address is invalid.';
            } else if (error.message) {
                errorMsg = error.message;
            }
            
            setErrorMessage(errorMsg);
            
            toast({
                variant: 'destructive',
                title: 'Sign-in Failed',
                description: errorMsg,
            });
            
            setIsSubmitting(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="items-center text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <CardTitle className="mt-4">Signing you in...</CardTitle>
                        <CardDescription>Please wait while we complete your sign-in.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (status === 'need-email') {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="items-center space-y-4 text-center">
                        <Logo height={32} />
                        <div className="space-y-1">
                            <CardTitle>Confirm Your Email</CardTitle>
                            <CardDescription>
                                Please enter the email address where you received the sign-in link.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isSubmitting}
                                    required
                                    autoFocus
                                />
                            </div>
                            <Button 
                                type="submit" 
                                className="w-full" 
                                disabled={isSubmitting || !email}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Continue'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="items-center text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                        <CardTitle className="mt-4">Sign-in Successful!</CardTitle>
                        <CardDescription>
                            Redirecting you now...
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="items-center text-center">
                        <XCircle className="h-12 w-12 text-destructive" />
                        <CardTitle className="mt-4">Sign-in Failed</CardTitle>
                        <CardDescription className="text-destructive">
                            {errorMessage}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            className="w-full" 
                            onClick={() => router.push('/customer-login')}
                        >
                            Back to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}

    