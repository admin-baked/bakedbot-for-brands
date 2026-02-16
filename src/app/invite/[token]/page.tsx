'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { acceptInvitationAction, validateInvitationAction } from '@/server/actions/invitations';
import { Loader2, ArrowRight, XCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Invitation } from '@/types/invitation';
import { useToast } from '@/hooks/use-toast';

export default function JoinPage({ params }: { params?: { token: string } }) {
    const router = useRouter();
    const { user, isUserLoading: authLoading } = useUser();
    const { toast } = useToast();
    
    const [status, setStatus] = useState<'validating' | 'valid' | 'invalid' | 'accepting' | 'success'>('validating');
    const [invitation, setInvitation] = useState<Invitation | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 1. Validate Token on Load
    useEffect(() => {
        async function checkToken() {
            try {
                const res = await validateInvitationAction(params.token);
                if (res.valid && res.invitation) {
                    setInvitation(res.invitation as Invitation);
                    setStatus('valid');
                } else {
                    setStatus('invalid');
                    setError(res.message || 'Invalid or expired invitation.');
                }
            } catch (err) {
                setStatus('invalid');
                setError('Failed to validate invitation.');
            }
        }
        checkToken();
    }, [params.token]);

    // 2. Handle Acceptance
    const handleAccept = async () => {
        if (!user) {
            // Redirect to login with return URL
            // Assuming your auth flow supports ?redirect=... or similar
            // For now, simple redirect to auth page
            router.push(`/auth?redirect=/join/${params.token}`);
            return;
        }

        setStatus('accepting');
        try {
            const res = await acceptInvitationAction(params.token);
            if (res.success) {
                setStatus('success');
                toast({ title: 'Welcome!', description: 'Invitation accepted successfully.' });
                
                // Delay redirect slightly for UX
                setTimeout(() => {
                    router.push('/dashboard');
                }, 1500);
            } else {
                setStatus('valid'); // Revert to valid so they can try again? Or invalid?
                toast({ title: 'Error', description: res.message, variant: 'destructive' });
                setError(res.message || 'Failed to accept invitation.');
            }
        } catch (err) {
             setStatus('valid');
             toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
        }
    };

    if (authLoading || status === 'validating') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-muted/20">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Verifying invitation...</p>
                </div>
            </div>
        );
    }

    if (status === 'invalid') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-muted/20">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                            <XCircle className="h-6 w-6 text-destructive" />
                        </div>
                        <CardTitle>Invalid Invitation</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button onClick={() => router.push('/')} variant="outline">
                            Return Home
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (status === 'success') {
         return (
            <div className="flex h-screen w-full items-center justify-center bg-muted/20">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <CardTitle>Welcome Aboard!</CardTitle>
                        <CardDescription>Redirecting you to the dashboard...</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </CardContent>
                </Card>
            </div>
        );       
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/20">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Join Team</CardTitle>
                    <CardDescription>
                        You have been invited to join as a <span className="font-bold capitalize">{invitation?.role.replace('_', ' ')}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg bg-muted p-4 text-center text-sm">
                        <p className="text-muted-foreground">Invitation for</p>
                        <p className="font-medium text-foreground">{invitation?.email}</p>
                    </div>

                    {!user ? (
                        <div className="space-y-3">
                             <Button onClick={handleAccept} className="w-full" size="lg">
                                Login to Accept
                                <ArrowRight className="ml-2 h-4 w-4" />
                             </Button>
                             <p className="text-center text-xs text-muted-foreground">
                                You will be asked to log in or create an account.
                             </p>
                        </div>
                    ) : (
                         <div className="space-y-3">
                             <div className="text-center text-sm mb-4">
                                Logged in as <span className="font-medium">{user.email}</span>
                             </div>
                             <Button onClick={handleAccept} className="w-full" size="lg" disabled={status === 'accepting'}>
                                {status === 'accepting' ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Accepting...
                                    </>
                                ) : (
                                    <>Accept Invitation</>
                                )}
                             </Button>
                             <Button variant="ghost" className="w-full" onClick={() => router.push('/dashboard')}>
                                Cancel
                             </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

