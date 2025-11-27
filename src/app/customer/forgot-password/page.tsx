/**
 * Forgot Password Page
 */

import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Forgot Password | BakedBot',
    description: 'Reset your BakedBot password',
};

export default function ForgotPasswordPage() {
    return (
        <div className="container max-w-lg mx-auto px-4 py-16">
            <Card>
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
                    <CardDescription>
                        Enter your email and we'll send you a reset link
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ForgotPasswordForm />

                    <div className="mt-6 text-center text-sm">
                        Remember your password?{' '}
                        <Link href="/customer/login" className="text-primary underline">
                            Back to login
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
