'use client';

// src/components/super-admin-login.tsx
/**
 * Magic login button for super admin access
 * Only allows whitelisted emails to access CEO dashboard
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Sparkles, AlertCircle } from 'lucide-react';
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { SUPER_ADMIN_EMAILS } from '@/lib/super-admin-config';

export default function SuperAdminLogin() {
    const router = useRouter();
    const { login, isSuperAdmin, superAdminEmail, logout } = useSuperAdmin();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 500));

        const result = login(email);

        if (result.success) {
            router.push('/dashboard/ceo');
        } else {
            setError(result.error || 'Access denied.');
        }

        setIsSubmitting(false);
    };

    const handleLogout = () => {
        logout();
        setEmail('');
    };

    // Already logged in as super admin
    if (isSuperAdmin) {
        return (
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <Shield className="h-6 w-6 text-green-600" />
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
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Super Admin Access</CardTitle>
                <CardDescription>
                    Enter your authorized email to access the CEO Dashboard
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="yourname@bakedbot.ai"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting || !email}
                    >
                        {isSubmitting ? (
                            <>Verifying...</>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Access Dashboard
                            </>
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center text-xs text-muted-foreground">
                    <p>Authorized emails only</p>
                </div>
            </CardContent>
        </Card>
    );
}
