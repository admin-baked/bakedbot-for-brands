'use client';

/**
 * NotebookLM Authentication Component
 *
 * Provides one-click authentication flow for NotebookLM integration:
 * 1. Opens NotebookLM in new tab
 * 2. User logs in with their Google account
 * 3. Extracts cookies from browser
 * 4. Sends to backend for import to sidecar
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw, BookOpen, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserRole } from '@/hooks/use-user-role';

interface NotebookLMStatus {
    authenticated: boolean;
    session_id?: string;
    notebook_id?: string;
    error?: string;
}

const NOTEBOOK_URL = 'https://notebooklm.google.com/notebook/59f47d3e-9e5c-4adc-9254-bd78f076898c';

export function NotebookLMAuth() {
    const { isSuperUser } = useUserRole();
    const [status, setStatus] = useState<NotebookLMStatus | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    console.log('[NotebookLMAuth] Rendering. isSuperUser:', isSuperUser);

    const checkStatus = async () => {
        setIsChecking(true);
        try {
            const response = await fetch('/api/sidecar/notebooklm/status');
            const data = await response.json();
            setStatus(data);
        } catch (error) {
            setStatus({
                authenticated: false,
                error: 'Failed to check NotebookLM status',
            });
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        if (isSuperUser) {
            checkStatus();
            // Check every 30 seconds
            const interval = setInterval(checkStatus, 30000);
            return () => clearInterval(interval);
        }
    }, [isSuperUser]);

    const handleAuthenticate = async () => {
        setIsAuthenticating(true);
        setAuthMessage(null);

        try {
            // Open NotebookLM in new tab
            const authWindow = window.open(NOTEBOOK_URL, '_blank');

            // Wait for user to log in and return
            setAuthMessage({
                type: 'success',
                message: 'NotebookLM opened in new tab. Please log in, then click "I\'ve Logged In" below.',
            });

            // Show button to continue after manual login
            setTimeout(() => {
                setIsAuthenticating(false);
            }, 2000);
        } catch (error) {
            setAuthMessage({
                type: 'error',
                message: 'Failed to open NotebookLM. Please check your pop-up blocker.',
            });
            setIsAuthenticating(false);
        }
    };

    const handleExtractCookies = async () => {
        setIsAuthenticating(true);
        setAuthMessage(null);

        try {
            // Get all cookies
            const cookiesString = document.cookie;

            // Parse cookies into EditThisCookie format
            const cookies = cookiesString.split(';').map(cookie => {
                const [name, value] = cookie.trim().split('=');
                return {
                    name,
                    value,
                    domain: window.location.hostname,
                };
            });

            // For NotebookLM, we need to extract cookies from the google.com domain
            // This requires a different approach since we can't access cross-origin cookies directly
            // Instead, we'll ask the user to install a browser extension or manually export

            setAuthMessage({
                type: 'error',
                message: 'Cookie extraction requires a browser extension. Please use the manual method below.',
            });

        } catch (error) {
            setAuthMessage({
                type: 'error',
                message: 'Failed to extract cookies.',
            });
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleManualImport = async () => {
        setIsAuthenticating(true);
        setAuthMessage(null);

        try {
            // Show instructions
            const cookiesInput = prompt(
                'Please paste the cookies JSON from EditThisCookie extension:\n\n' +
                '1. Install EditThisCookie extension\n' +
                '2. Visit NotebookLM and log in\n' +
                '3. Click the extension icon > Export > Copy to clipboard\n' +
                '4. Paste below:'
            );

            if (!cookiesInput) {
                setIsAuthenticating(false);
                return;
            }

            // Validate JSON
            const cookies = JSON.parse(cookiesInput);

            // Send to backend
            const response = await fetch('/api/sidecar/notebooklm/import-cookies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cookies }),
            });

            const result = await response.json();

            if (result.success) {
                setAuthMessage({
                    type: 'success',
                    message: `Successfully imported ${result.cookieCount} cookies. Service is restarting...`,
                });

                // Wait for service to restart, then check status
                setTimeout(() => {
                    checkStatus();
                }, 15000);
            } else {
                setAuthMessage({
                    type: 'error',
                    message: result.error || 'Failed to import cookies',
                });
            }
        } catch (error) {
            setAuthMessage({
                type: 'error',
                message: error instanceof Error ? error.message : 'Invalid cookies format',
            });
        } finally {
            setIsAuthenticating(false);
        }
    };

    // Only show to super users
    if (!isSuperUser) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            NotebookLM Integration
                            {status && (
                                status.authenticated ? (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Authenticated
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Not Authenticated
                                    </Badge>
                                )
                            )}
                        </CardTitle>
                        <CardDescription>
                            Connect to Google NotebookLM for AI research capabilities
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={checkStatus}
                        disabled={isChecking}
                    >
                        {isChecking ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {!status ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : status.authenticated ? (
                    <div className="space-y-3">
                        {status.notebook_id && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Notebook ID</span>
                                <span className="font-mono text-xs">{status.notebook_id}</span>
                            </div>
                        )}
                        {status.session_id && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Session</span>
                                <span className="font-mono text-xs">{status.session_id.substring(0, 16)}...</span>
                            </div>
                        )}
                        <div className="flex items-start gap-2 p-3 rounded-md bg-green-500/10 border border-green-500/20">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                            <div className="text-sm text-green-700">
                                <p className="font-medium">NotebookLM is connected</p>
                                <p className="text-green-600/80">
                                    AI agents can now query your research notebook.
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.open(NOTEBOOK_URL, '_blank')}
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open NotebookLM
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                            <div className="text-sm text-amber-700">
                                <p className="font-medium">NotebookLM not authenticated</p>
                                <p className="text-amber-600/80">
                                    {status.error || 'Connect your Google account to enable research features'}
                                </p>
                            </div>
                        </div>

                        {authMessage && (
                            <Alert variant={authMessage.type === 'error' ? 'destructive' : 'default'}>
                                <AlertDescription>{authMessage.message}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-3">
                            <div className="text-sm font-medium">Authentication Methods:</div>

                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">
                                    <strong>Recommended:</strong> Manual Cookie Import
                                </div>
                                <ol className="text-xs text-muted-foreground space-y-1 ml-4 list-decimal">
                                    <li>Install <a href="https://chrome.google.com/webstore/detail/editthiscookie" target="_blank" className="text-blue-600 hover:underline">EditThisCookie</a> extension</li>
                                    <li>Visit NotebookLM and log in with your Google account</li>
                                    <li>Click the extension icon → Export → Copy to clipboard</li>
                                    <li>Click "Import Cookies" below and paste the JSON</li>
                                </ol>
                                <Button
                                    onClick={handleManualImport}
                                    disabled={isAuthenticating}
                                    className="w-full"
                                >
                                    {isAuthenticating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        'Import Cookies'
                                    )}
                                </Button>
                            </div>

                            <div className="pt-2 border-t">
                                <div className="text-xs text-muted-foreground mb-2">
                                    Or open NotebookLM in a new tab:
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={handleAuthenticate}
                                    disabled={isAuthenticating}
                                    className="w-full"
                                >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Open NotebookLM
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
