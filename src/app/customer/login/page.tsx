/**
 * Customer Login Page
 */

import { Suspense } from 'react';
import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerLoginForm } from '@/components/auth/customer-login-form';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Sign In | BakedBot',
    description: 'Sign in to your BakedBot customer account',
};

export default function CustomerLoginPage() {
    return (
        <div className="container max-w-lg mx-auto px-4 py-16">
            <Card>
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
                    <CardDescription>
                        Sign in to your account to continue shopping
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}>
                        <CustomerLoginForm />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
