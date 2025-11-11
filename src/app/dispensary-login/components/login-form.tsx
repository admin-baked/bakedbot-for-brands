
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, Sparkles } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { useUser } from '@/firebase/auth/use-user';
import { sendSignInLinkToEmail } from 'firebase/auth';
import Logo from '@/components/logo';

export default function DispensaryLoginForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const { auth } = useFirebase();
    const { user } = useUser();
    const router = useRouter();

    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            toast({
                variant: 'destructive',
                title: 'Authentication Error',
                description: decodeURIComponent(error),
            });
        }
    }, [searchParams, toast]);

    useEffect(() => {
        if (user) {
            router.replace('/dashboard/orders');
        }
    }, [user, router]);


    const handleMagicLinkSignIn = useCallback(async (e: React.FormEvent, targetEmail?: string) => {
        e.preventDefault();
        const finalEmail = targetEmail || email;
        if (!finalEmail) {
            toast({
                variant: 'destructive',
                title: 'Email is required',
                description: 'Please enter your email address to receive a magic link.',
            });
            return;
        }

        if (!auth) {
            toast({ variant: 'destructive', title: 'Initialization Error', description: 'Firebase not ready.' });
            return;
        }

        setIsMagicLinkLoading(true);
        try {
            const host = window.location.origin;
            const actionCodeSettings = {
                handleCodeInApp: true,
                url: `${host}/auth/callback`,
            };

            window.localStorage.setItem('emailForSignIn', finalEmail);
            await sendSignInLinkToEmail(auth, finalEmail, actionCodeSettings);

            setMagicLinkSent(true);
            setEmail(finalEmail);
            toast({
                title: 'Magic Link Sent!',
                description: `A sign-in link has been sent to ${finalEmail}. Check your inbox!`,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            toast({
                variant: 'destructive',
                title: 'Failed to send link',
                description: errorMessage,
            });
        } finally {
            setIsMagicLinkLoading(false);
        }
    }, [email, toast, auth]);
    
    if (magicLinkSent) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="items-center text-center">
                        <Sparkles className="mx-auto h-12 w-12 text-primary" />
                        <CardTitle className="mt-4 text-2xl">Check Your Inbox!</CardTitle>
                        <CardDescription>
                            A magic sign-in link has been sent to <strong>{email}</strong>. Click the link in the email to log in.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                         <Button variant="link" className="w-full" onClick={() => setMagicLinkSent(false)}>Back to Login</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="items-center space-y-4 text-center">
                    <Logo height={32} />
                    <div className="space-y-1">
                        <CardTitle className="text-2xl">Dispensary Portal</CardTitle>
                        <CardDescription>Sign in to manage your orders</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={(e) => handleMagicLinkSignIn(e, email)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@dispensary.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading || isMagicLinkLoading}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading || isMagicLinkLoading || !email}>
                            {isMagicLinkLoading ? <Loader2 className="animate-spin" /> : <><KeyRound className="mr-2" /> Send Magic Link</>}
                        </Button>
                    </form>
                </CardContent>
                {process.env.NODE_ENV === 'development' && (
                    <CardFooter className="flex-col gap-2">
                        <div className="relative w-full">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">For Devs</span>
                            </div>
                        </div>
                        <Button variant="secondary" className="w-full" onClick={(e) => handleMagicLinkSignIn(e, 'dispensary@bakedbot.ai')}>
                           Dev Magic Button (dispensary@bakedbot.ai)
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
