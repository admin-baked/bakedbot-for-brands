'use client';

/**
 * Driver Login Page
 *
 * Authentication page for delivery drivers
 * Uses email + password authentication
 * Redirects to /driver/dashboard after successful login
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DriverLoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Sign in with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Get ID token with claims
            const idTokenResult = await user.getIdTokenResult();

            // Check if user has delivery_driver role
            if (!idTokenResult.claims.role || idTokenResult.claims.role !== 'delivery_driver') {
                setError('Access denied. You must be registered as a delivery driver.');
                await auth.signOut();
                setLoading(false);
                return;
            }

            // Success - redirect to driver dashboard
            toast({
                title: 'Welcome back!',
                description: 'Redirecting to your dashboard...',
            });

            router.push('/driver/dashboard');
        } catch (err: any) {
            console.error('Login error:', err);
            let errorMessage = 'Invalid email or password';

            if (err.code === 'auth/user-not-found') {
                errorMessage = 'No driver account found with this email';
            } else if (err.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password';
            } else if (err.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address';
            } else if (err.code === 'auth/user-disabled') {
                errorMessage = 'This account has been disabled';
            }

            setError(errorMessage);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex items-center justify-center mb-4">
                        <div className="bg-primary rounded-full p-3">
                            <Truck className="h-8 w-8 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center">Driver Login</CardTitle>
                    <CardDescription className="text-center">
                        Sign in to access your delivery dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="driver@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                        </Button>

                        <p className="text-xs text-center text-muted-foreground mt-4">
                            Need help? Contact your dispatch manager
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
