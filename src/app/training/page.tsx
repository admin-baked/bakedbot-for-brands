/**
 * Public Training Landing Page
 *
 * Standalone page for BakedBot Builder Bootcamp signup/login
 * Accessible at bakedbot.ai/training
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    type UserCredential
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { GraduationCap, Code, Zap, Users, CheckCircle2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { selfEnrollInTraining } from '@/server/actions/training';

export default function TrainingLandingPage() {
    const router = useRouter();
    const { auth } = useFirebase();
    const { toast } = useToast();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [isLoading, setIsLoading] = useState(false);
    const [showAuthForm, setShowAuthForm] = useState(false);

    const toggleMode = () => setMode(mode === 'signin' ? 'signup' : 'signin');

    const handleAuthSuccess = async (userCredential: UserCredential, isNewUser = false) => {
        try {
            // Create server session
            const idToken = await userCredential.user.getIdToken(true);
            const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });

            if (!response.ok) {
                throw new Error('Failed to create server session');
            }

            // Wait for cookie propagation
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get user role
            const idTokenResult = await userCredential.user.getIdTokenResult(true);
            let role = idTokenResult.claims.role as string | undefined;

            logger.info('Training Login Success', { role, uid: userCredential.user.uid, isNewUser });

            // Auto-enroll new users or users without a role
            if (isNewUser || !role) {
                logger.info('Auto-enrolling user in training', { uid: userCredential.user.uid });

                toast({
                    title: "Setting up your account...",
                    description: "Enrolling you in the training program",
                });

                const enrollResult = await selfEnrollInTraining(userCredential.user.uid);

                if (!enrollResult.success) {
                    logger.error('Auto-enrollment failed', { error: enrollResult.error });
                    toast({
                        variant: 'destructive',
                        title: "Enrollment Failed",
                        description: enrollResult.error,
                    });
                    setIsLoading(false);
                    return;
                }

                // Force token refresh to get new custom claims
                await userCredential.user.getIdToken(true);
                const updatedToken = await userCredential.user.getIdTokenResult(true);
                role = updatedToken.claims.role as string | undefined;

                logger.info('Auto-enrollment completed', {
                    uid: userCredential.user.uid,
                    cohortId: enrollResult.data.cohortId,
                    newRole: role,
                });

                toast({
                    title: "Welcome to BakedBot Training!",
                    description: "You've been enrolled in the bootcamp. Let's get started!",
                    duration: 3000,
                });

                // Wait a bit for token propagation
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Route based on role
            if (role === 'intern' || role === 'super_user') {
                window.location.href = '/dashboard/training';
            } else {
                // Fallback - shouldn't happen after auto-enrollment
                toast({
                    title: "Access Required",
                    description: "Training access requires intern role. Please sign out and back in.",
                    variant: "destructive",
                    duration: 5000
                });
                window.location.href = '/dashboard';
            }
        } catch (error) {
            logger.error('Auth success handling failed', error instanceof Error ? error : new Error(String(error)));
            setIsLoading(false);
            toast({
                variant: 'destructive',
                title: "Session Error",
                description: "Failed to create session. Please try again."
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) return;

        if (password.length < 6) {
            toast({
                variant: 'destructive',
                title: "Invalid Password",
                description: "Password must be at least 6 characters long."
            });
            return;
        }

        setIsLoading(true);

        try {
            let cred: UserCredential;
            let isNewUser = false;

            if (mode === 'signup') {
                cred = await createUserWithEmailAndPassword(auth, email, password);
                isNewUser = true;
                toast({
                    title: "Account Created",
                    description: "Welcome to BakedBot Builder Bootcamp!"
                });
            } else {
                cred = await signInWithEmailAndPassword(auth, email, password);
                toast({
                    title: "Welcome back",
                    description: "Signing you in..."
                });
            }

            await handleAuthSuccess(cred, isNewUser);
        } catch (error: any) {
            logger.error('Training auth error', error);

            // Auto-fallback: If sign up fails because email exists, try login
            if (mode === 'signup' && error.code === 'auth/email-already-in-use') {
                try {
                    const cred = await signInWithEmailAndPassword(auth, email, password);
                    toast({ title: "Account Exists", description: "Logged you in instead!" });
                    await handleAuthSuccess(cred, false);
                    return;
                } catch (loginErr) {
                    // Password didn't match
                }
            }

            toast({
                variant: 'destructive',
                title: "Authentication Failed",
                description: error.message.replace('Firebase:', '').trim()
            });
            setIsLoading(false);
        }
    };

    const handleGoogle = async () => {
        if (!auth) return;
        setIsLoading(true);
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            // Check if this is a new user via the result metadata
            const isNewUser = (result as any)._tokenResponse?.isNewUser || false;
            await handleAuthSuccess(result, isNewUser);
        } catch (error: any) {
            if (error.code !== 'auth/popup-closed-by-user') {
                toast({ variant: 'destructive', title: "Google Sign-In Failed", description: error.message });
            }
            setIsLoading(false);
        }
    };

    if (showAuthForm) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-xl">
                    <CardHeader className="text-center space-y-2">
                        <div className="mx-auto mb-4">
                            <GraduationCap className="h-12 w-12 text-emerald-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold">
                            {mode === 'signin' ? 'Welcome Back' : 'Join the Bootcamp'}
                        </CardTitle>
                        <CardDescription>
                            {mode === 'signin'
                                ? 'Sign in to continue your learning journey'
                                : 'Create your account to start building with BakedBot AI'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleGoogle}
                            disabled={isLoading}
                        >
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or with email</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {mode === 'signup' && (
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="John Doe"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required={mode === 'signup'}
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
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
                                    placeholder="Minimum 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                                type="submit"
                                disabled={isLoading}
                            >
                                {isLoading && <Spinner className="mr-2 h-4 w-4" />}
                                {mode === 'signin' ? 'Sign In' : 'Create Account'}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button variant="link" size="sm" onClick={toggleMode} disabled={isLoading}>
                            {mode === 'signin'
                                ? "Don't have an account? Sign up"
                                : "Already have an account? Sign in"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowAuthForm(false)}>
                            ← Back to info
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* Hero Section */}
            <div className="container mx-auto px-4 py-16">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
                        <Zap className="h-4 w-4" />
                        8-Week Intensive Program
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                        BakedBot Builder Bootcamp
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                        Learn to build agentic AI systems with Next.js, Firebase, and cutting-edge AI tools.
                        From zero to shipping production code in 8 weeks.
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Button
                            size="lg"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                            onClick={() => setShowAuthForm(true)}
                        >
                            <GraduationCap className="mr-2 h-5 w-5" />
                            Get Started
                        </Button>
                        <Button size="lg" variant="outline" asChild>
                            <a href="#curriculum">View Curriculum</a>
                        </Button>
                    </div>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-3 gap-8 mb-16">
                    <Card className="border-2">
                        <CardHeader>
                            <Code className="h-10 w-10 text-emerald-600 mb-4" />
                            <CardTitle>Hands-On Challenges</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Build real features with guided challenges, starter code, and AI-powered code reviews.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2">
                        <CardHeader>
                            <Users className="h-10 w-10 text-blue-600 mb-4" />
                            <CardTitle>Peer Learning</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Collaborate with fellow interns, review code together, and learn from each other.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2">
                        <CardHeader>
                            <Zap className="h-10 w-10 text-purple-600 mb-4" />
                            <CardTitle>Production Ready</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Ship real code to production, contribute to BakedBot, and build your portfolio.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Curriculum Preview */}
                <div id="curriculum" className="mb-16">
                    <h2 className="text-3xl font-bold text-center mb-12">8-Week Curriculum</h2>
                    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {[
                            { week: 1, title: "Foundations & Setup", desc: "Codebase navigation, Server Actions, TypeScript standards" },
                            { week: 2, title: "Firestore & Data Modeling", desc: "CRUD operations, queries, validation with Zod" },
                            { week: 3, title: "React Components & UI", desc: "ShadCN components, forms, animations, state management" },
                            { week: 4, title: "API Routes & Integrations", desc: "Next.js APIs, webhooks, external services" },
                            { week: 5, title: "Testing & Quality", desc: "Jest tests, E2E testing, code quality" },
                            { week: 6, title: "AI Agents", desc: "Genkit, Claude API, agent architecture" },
                            { week: 7, title: "Advanced Patterns", desc: "Letta memory, browser automation, scheduling" },
                            { week: 8, title: "Capstone Project", desc: "Build and ship a complete feature end-to-end" }
                        ].map((item) => (
                            <Card key={item.week} className="relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full" />
                                <CardHeader>
                                    <div className="text-sm font-semibold text-emerald-600 mb-1">Week {item.week}</div>
                                    <CardTitle className="text-lg">{item.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* What You'll Learn */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 md:p-12 shadow-xl mb-16">
                    <h2 className="text-3xl font-bold text-center mb-8">What You'll Master</h2>
                    <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                        {[
                            "Next.js 15 with App Router",
                            "Firebase (Firestore, Auth, Hosting)",
                            "TypeScript best practices",
                            "React Server Components",
                            "AI agent architecture with Genkit",
                            "Claude API integration",
                            "ShadCN UI & Tailwind CSS",
                            "Git workflow & PR process",
                            "Testing with Jest",
                            "Production deployment"
                        ].map((skill, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{skill}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center">
                    <h2 className="text-3xl font-bold mb-4">Ready to Start Building?</h2>
                    <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                        Join the next cohort and learn the BakedBot AI way. Get hands-on experience building
                        production-grade agentic systems.
                    </p>
                    <Button
                        size="lg"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                        onClick={() => setShowAuthForm(true)}
                    >
                        <GraduationCap className="mr-2 h-5 w-5" />
                        Sign Up Now
                    </Button>
                    <p className="text-sm text-muted-foreground mt-4">
                        Already enrolled?{' '}
                        <button
                            onClick={() => setShowAuthForm(true)}
                            className="text-emerald-600 hover:underline font-medium"
                        >
                            Sign in here
                        </button>
                    </p>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t py-8">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    <p>© 2026 BakedBot AI. Built with Next.js, Firebase, and Claude.</p>
                </div>
            </footer>
        </div>
    );
}
