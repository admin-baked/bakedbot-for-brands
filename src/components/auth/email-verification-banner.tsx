/**
 * Email Verification Banner Component
 * Prompts user to verify their email if they haven't already
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { resendVerificationEmail } from '@/lib/auth/customer-auth';
import { useToast } from '@/hooks/use-toast';

export function EmailVerificationBanner() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    if (!user || user.emailVerified || !isVisible) {
        return null;
    }

    const handleResend = async () => {
        setIsLoading(true);
        try {
            await resendVerificationEmail(user);
            toast({
                title: 'Email sent',
                description: 'Verification email has been resent. Please check your inbox.',
            });
            setIsVisible(false); // Hide after sending to prevent spamming
        } catch (error) {
            toast({
                title: 'Failed to send',
                description: 'Could not send verification email. Please try again later.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Alert variant="default" className="mb-6 border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Verify your email address</AlertTitle>
            <AlertDescription className="flex items-center justify-between mt-2">
                <span>
                    Please verify your email address to access all features.
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResend}
                    disabled={isLoading}
                    className="bg-background/50 border-yellow-600/20 hover:bg-background/80"
                >
                    {isLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    Resend Email
                </Button>
            </AlertDescription>
        </Alert>
    );
}
