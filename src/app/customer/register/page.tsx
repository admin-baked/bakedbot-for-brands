/**
 * Customer Registration Page
 */

import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerRegisterForm } from '@/components/auth/customer-register-form';

export const metadata: Metadata = {
    title: 'Create Account | BakedBot',
    description: 'Create your BakedBot customer account to start shopping',
};

export default function CustomerRegisterPage() {
    return (
        <div className="container max-w-lg mx-auto px-4 py-16">
            <Card>
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
                    <CardDescription>
                        Enter your information to create your customer account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CustomerRegisterForm />
                </CardContent>
            </Card>

            {/* Age Notice */}
            <p className="mt-4 text-center text-sm text-muted-foreground">
                You must be 21 or older to create an account and purchase cannabis products.
            </p>
        </div>
    );
}
