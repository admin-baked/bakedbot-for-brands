'use client';

/**
 * Gmail Connection Component
 *
 * Allows users to connect their Gmail/Google Workspace account
 * for sending emails via BakedBot agents.
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Check, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface GmailConnectionProps {
    redirectPath?: string;
}

export function GmailConnection({ redirectPath = '/dashboard/settings?tab=integrations' }: GmailConnectionProps) {
    const searchParams = useSearchParams();
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [connectedEmail, setConnectedEmail] = useState<string | null>(null);

    // Check for success/error from OAuth callback
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    useEffect(() => {
        // Check if Gmail is connected by calling a status endpoint
        async function checkGmailStatus() {
            try {
                const res = await fetch('/api/integrations/gmail/status');
                if (res.ok) {
                    const data = await res.json();
                    setIsConnected(data.connected);
                    setConnectedEmail(data.email || null);
                }
            } catch (e) {
                console.error('Failed to check Gmail status:', e);
            } finally {
                setIsLoading(false);
            }
        }

        checkGmailStatus();
    }, [success]); // Re-check after OAuth success

    const handleConnect = () => {
        // Redirect to Google OAuth flow
        const encodedRedirect = encodeURIComponent(redirectPath);
        window.location.href = `/api/auth/google?service=gmail&redirect=${encodedRedirect}`;
    };

    const handleDisconnect = async () => {
        try {
            const res = await fetch('/api/integrations/gmail/disconnect', { method: 'POST' });
            if (res.ok) {
                setIsConnected(false);
                setConnectedEmail(null);
            }
        } catch (e) {
            console.error('Failed to disconnect Gmail:', e);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Gmail / Google Workspace</CardTitle>
                            <CardDescription>
                                Send emails from your personal or work Gmail account
                            </CardDescription>
                        </div>
                    </div>
                    {isConnected ? (
                        <Badge className="bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            Connected
                        </Badge>
                    ) : (
                        <Badge variant="outline">Not Connected</Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Connection Failed</p>
                            <p className="text-xs text-red-600">
                                {error === 'oauth_config_error'
                                    ? 'OAuth credentials are not configured. Contact support.'
                                    : 'Failed to connect Gmail. Please try again.'}
                            </p>
                        </div>
                    </div>
                )}

                {success === 'gmail_connected' && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-green-800">Gmail Connected!</p>
                            <p className="text-xs text-green-600">
                                Your agents can now send emails from your account.
                            </p>
                        </div>
                    </div>
                )}

                {isConnected && connectedEmail && (
                    <p className="text-sm text-muted-foreground mb-4">
                        Connected as: <span className="font-medium text-foreground">{connectedEmail}</span>
                    </p>
                )}

                <div className="text-sm text-muted-foreground space-y-2">
                    <p>When connected, BakedBot agents can:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Send emails on your behalf (with your approval)</li>
                        <li>Read your inbox to help with responses</li>
                        <li>List recent emails for context</li>
                    </ul>
                </div>
            </CardContent>

            <CardFooter className="border-t pt-4">
                {isLoading ? (
                    <Button disabled>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Checking...
                    </Button>
                ) : isConnected ? (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleDisconnect}>
                            Disconnect
                        </Button>
                        <Button variant="ghost" onClick={handleConnect}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reconnect
                        </Button>
                    </div>
                ) : (
                    <Button onClick={handleConnect}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Connect Gmail
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
