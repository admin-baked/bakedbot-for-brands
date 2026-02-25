'use client';

/**
 * Google Sheets Connection Component
 *
 * Allows users to connect their Google account for Sheets access —
 * import customer lists, export campaign results, sync data.
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, Check, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface SheetsConnectionProps {
    redirectPath?: string;
}

export function SheetsConnection({ redirectPath = '/dashboard/settings?tab=integrations' }: SheetsConnectionProps) {
    const searchParams = useSearchParams();
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const success = searchParams.get('success');
    const error = searchParams.get('error');

    useEffect(() => {
        async function checkStatus() {
            try {
                const res = await fetch('/api/integrations/sheets/status');
                if (res.ok) {
                    const data = await res.json();
                    setIsConnected(data.connected);
                }
            } catch {
                // silently fail
            } finally {
                setIsLoading(false);
            }
        }
        checkStatus();
    }, [success]);

    const handleConnect = () => {
        const encodedRedirect = encodeURIComponent(redirectPath);
        window.location.href = `/api/auth/google?service=sheets&redirect=${encodedRedirect}`;
    };

    const handleDisconnect = async () => {
        try {
            const res = await fetch('/api/integrations/sheets/disconnect', { method: 'POST' });
            if (res.ok) {
                setIsConnected(false);
            }
        } catch {
            // silently fail
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Sheet className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Google Sheets</CardTitle>
                            <CardDescription>
                                Import customer lists and export campaign data to Sheets
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
                                    : 'Failed to connect Google Sheets. Please try again.'}
                            </p>
                        </div>
                    </div>
                )}

                {success === 'sheets_connected' && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-green-800">Google Sheets Connected!</p>
                            <p className="text-xs text-green-600">
                                You can now import and export data with Google Sheets.
                            </p>
                        </div>
                    </div>
                )}

                <div className="text-sm text-muted-foreground space-y-2">
                    <p>When connected, BakedBot agents can:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Import customer lists from your spreadsheets</li>
                        <li>Export campaign results and analytics</li>
                        <li>Sync segment data for reporting</li>
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
                        Connect Google Sheets
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
