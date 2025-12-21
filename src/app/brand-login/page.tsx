'use client';

// Standard library imports
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

// Thrid-party library imports
import {
    Building2,
    Mail,
    Lock,
    ArrowRight,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Internal imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { auth } from '@/firebase/client';
import { DevLoginButton } from '@/components/auth/dev-login-button';
import { playSound } from '@/lib/utils'; // Assuming you have a playSound utility

export default function BrandLoginPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <BrandLoginContent />
        </Suspense>
    );
}

function BrandLoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const { toast } = useToast();

    const isProd = process.env.NODE_ENV === 'production';

    const handleAuthSuccess = async (user: any) => {
        try {
            // Get the ID token
            const idToken = await user.getIdToken();

            // Create session cookie via server action
            const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ idToken }),
            });

            if (!response.ok) {
                throw new Error('Failed to create session');
            }

            // Add a small delay to ensure cookie is set
            await new Promise(resolve => setTimeout(resolve, 1000));

            playSound('success');
            toast({
                title: "Welcome back!",
                description: "Successfully signed in.",
            });

            // Redirect based on role/status
            // In a real app, you'd check the user's role from a DB or custom claim
            // For now, we assume if they login here, they go to dashboard
            // Note: We use window.location.href to force a full reload and ensure cookies are sent
            if (user.metadata.creationTime === user.metadata.lastSignInTime) {
                window.location.href = '/onboarding';
            } else {
                window.location.href = '/dashboard';
            }

        } catch (error) {
            console.error('Session creation failed:', error);
            toast({
                variant: "destructive",
                title: "Session Error",
                description: "Failed to create session. Please try again.",
            });
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isSignUp) {
                // Sign up logic (simplified - typically you'd allow sign up here or redirect to a register page)
                // For brands, we might want to gate this or allow it.
                // Assuming we allow it for now via Firebase
                const userCredential = await import('firebase/auth').then(module =>
                    module.createUserWithEmailAndPassword(auth, email, password)
                );
                await handleAuthSuccess(userCredential.user);
            } else {
                // Sign in
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                await handleAuthSuccess(userCredential.user);
            }
        } catch (error: any) {
            console.error('Auth error:', error);
            let errorMessage = 'Authentication failed';
            if (error.code === 'auth/invalid-credential') {
                errorMessage = 'Invalid email or password';
            }
            toast({
                variant: "destructive",
                title: "Error",
                description: errorMessage,
            });
            playSound('error');
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setIsLoading(true);
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            await handleAuthSuccess(result.user);
        } catch (error: any) {
            console.error('Google auth error:', error);
            toast({
                variant: "destructive",
                title: "Google Login Error",
                description: error.message,
            });
            setIsLoading(false);
        }
    };


    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="relative h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        {isSignUp ? 'Create Brand Account' : 'Brand Portal'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {isSignUp
                            ? 'Join the network of premium cannabis brands'
                            : 'Enter your credentials to access your dashboard'}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Image src="/google.svg" width={16} height={16} alt="Google" className="mr-2" />}
                        Continue with Google
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or continue with email
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                startIcon={<Mail className="h-4 w-4 text-muted-foreground" />}
                            />
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                startIcon={<Lock className="h-4 w-4 text-muted-foreground" />}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSignUp ? 'Sign Up' : 'Login'}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                    <Button type="button" variant="link" size="sm" onClick={() => setIsSignUp(!isSignUp)}>
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </Button>
                    {!isProd && (
                        <>
                            <div className="relative w-full">
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
                        </>
                    )}

                    {/* Super Admin Access */}
                    <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Internal
                            </span>
                        </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => router.push('/super-admin')}>
                        🔐 Super Admin Access
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
