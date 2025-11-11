
import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import LoginForm from './components/login-form';
import Image from 'next/image';

function LoginPageFallback() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
             <Card className="w-full max-w-md">
                <CardHeader className="items-center space-y-4 text-center">
                    <Image src="https://storage.googleapis.com/stedi-assets/misc/bakedbot-logo-horizontal.png" alt="BakedBot AI Logo" width={128} height={32} />
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

export default function BrandLoginPage() {

    return (
        <Suspense fallback={<LoginPageFallback />}>
            <LoginForm />
        </Suspense>
    );
}
