/**
 * Server-Rendered Age Verification Page
 *
 * This page enforces age verification at the server level, preventing bypass
 * via JavaScript disabling. Works without any client-side JavaScript.
 *
 * Flow:
 * 1. Middleware redirects here if age_verified cookie is missing
 * 2. User clicks "I'm 21 or older" (HTML form submit)
 * 3. Server action sets HTTP-only cookie
 * 4. Redirects back to original destination
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { setAgeVerificationCookie } from '@/server/actions/age-verification';
import { AlertCircle, PartyPopper, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PageProps {
    searchParams: Promise<{
        return_to?: string;
    }>;
}

async function verifyAgeAction(formData: FormData) {
    'use server';

    const confirmed = formData.get('confirmed');
    const returnTo = formData.get('return_to') as string || '/';

    if (confirmed === 'yes') {
        // Set HTTP-only age verification cookie
        await setAgeVerificationCookie();

        // Redirect to original destination
        redirect(returnTo);
    } else {
        // User indicated they're under 21
        redirect('/verify-age?underage=1');
    }
}

export default async function VerifyAgePage({ searchParams }: PageProps) {
    const params = await searchParams;
    const returnTo = params.return_to || '/';
    const isUnderage = params.return_to === undefined && 'underage' in params;

    // Underage screen
    if (isUnderage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
                <Card className="w-full max-w-md mx-4">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                            <X className="h-6 w-6 text-destructive" />
                        </div>
                        <CardTitle className="text-2xl">Access Restricted</CardTitle>
                        <CardDescription>
                            You must be 21 or older to access this site
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm text-muted-foreground mb-4">
                            We appreciate your honesty. Please come back when you're of legal age.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            By law, cannabis products are only available to adults 21 and older.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Age verification screen
    return (
        <div className="min-h-screen flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md mx-4">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <AlertCircle className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Age Verification Required</CardTitle>
                    <CardDescription>
                        You must be 21 or older to access this site
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-center text-sm font-semibold mb-4">
                        Are you 21 years of age or older?
                    </p>

                    <form action={verifyAgeAction} className="space-y-3">
                        <input type="hidden" name="return_to" value={returnTo} />

                        <Button
                            type="submit"
                            name="confirmed"
                            value="yes"
                            className="w-full h-14 text-lg font-semibold"
                            size="lg"
                        >
                            <PartyPopper className="mr-2 h-5 w-5" />
                            Yes, I'm 21 or older
                        </Button>

                        <Button
                            type="submit"
                            name="confirmed"
                            value="no"
                            variant="outline"
                            className="w-full h-14 text-lg"
                            size="lg"
                        >
                            <X className="mr-2 h-5 w-5" />
                            No, I'm under 21
                        </Button>
                    </form>

                    <p className="text-xs text-center text-muted-foreground pt-4">
                        By entering this site, you agree to our Terms of Service and Privacy Policy
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
