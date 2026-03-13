'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Check, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type GoogleIntegrationMode = 'oauth' | 'service_account' | 'disconnected';

interface SearchConsoleStatus {
    connected: boolean;
    mode: GoogleIntegrationMode;
    siteUrl: string | null;
    siteConfigured: boolean;
}

interface SearchConsoleConnectionProps {
    redirectPath?: string;
}

export function SearchConsoleConnection({
    redirectPath = '/dashboard/settings?tab=integrations',
}: SearchConsoleConnectionProps) {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<SearchConsoleStatus>({
        connected: false,
        mode: 'disconnected',
        siteUrl: null,
        siteConfigured: false,
    });
    const [isLoading, setIsLoading] = useState(true);

    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const connect = searchParams.get('connect');

    useEffect(() => {
        async function checkStatus() {
            try {
                const res = await fetch('/api/integrations/search-console/status');
                if (res.ok) {
                    const data = await res.json();
                    setStatus({
                        connected: Boolean(data.connected),
                        mode: (data.mode as GoogleIntegrationMode) || 'disconnected',
                        siteUrl: data.siteUrl || null,
                        siteConfigured: Boolean(data.siteConfigured),
                    });
                }
            } finally {
                setIsLoading(false);
            }
        }

        checkStatus();
    }, [success]);

    const handleConnect = () => {
        const encodedRedirect = encodeURIComponent(redirectPath);
        window.location.href = `/api/auth/google?service=google_search_console&redirect=${encodedRedirect}`;
    };

    useEffect(() => {
        if ((connect === 'google_search_console' || connect === 'search_console') && status.mode === 'disconnected') {
            const encodedRedirect = encodeURIComponent(redirectPath);
            window.location.href = `/api/auth/google?service=google_search_console&redirect=${encodedRedirect}`;
        }
    }, [connect, redirectPath, status.mode]);

    const handleDisconnect = async () => {
        const res = await fetch('/api/integrations/search-console/disconnect', { method: 'POST' });
        if (res.ok) {
            setStatus((current) => ({
                ...current,
                connected: false,
                mode: current.siteConfigured ? 'service_account' : 'disconnected',
            }));
        }
    };

    const badge = (() => {
        if (status.mode === 'oauth') {
            return (
                <Badge className="bg-green-100 text-green-800">
                    <Check className="mr-1 h-3 w-3" />
                    Connected
                </Badge>
            );
        }

        if (status.mode === 'service_account') {
            return <Badge className="bg-blue-100 text-blue-800">Platform Connected</Badge>;
        }

        return <Badge variant="outline">Not Connected</Badge>;
    })();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                            <Search className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Google Search Console</CardTitle>
                            <CardDescription>
                                Power SEO opportunity discovery, rankings, and search demand reporting
                            </CardDescription>
                        </div>
                    </div>
                    {!isLoading && badge}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {error && !success && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Connection Failed</p>
                            <p className="text-xs text-red-600">
                                {error === 'oauth_config_error'
                                    ? 'Google OAuth credentials are not configured for Search Console access.'
                                    : 'Failed to connect Google Search Console. Please try again.'}
                            </p>
                        </div>
                    </div>
                )}

                {success === 'google_search_console_connected' && (
                    <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                        <Check className="mt-0.5 h-5 w-5 text-green-600" />
                        <div>
                            <p className="text-sm font-medium text-green-800">Search Console Connected</p>
                            <p className="text-xs text-green-600">
                                BakedBot can now pull live search demand, clicks, and optimization opportunities.
                            </p>
                        </div>
                    </div>
                )}

                {status.mode === 'oauth' && (
                    <p className="text-sm text-muted-foreground">
                        Connected with your Google account{status.siteUrl ? ` for ${status.siteUrl}` : ''}.
                    </p>
                )}

                {status.mode === 'service_account' && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                        Platform credentials are active{status.siteUrl ? ` for ${status.siteUrl}` : ''}. Connect your own Google account if you want user OAuth to back Search Console queries.
                    </div>
                )}

                {!status.siteConfigured && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        `SEARCH_CONSOLE_SITE_URL` is not configured yet. The dashboard needs a verified site URL to query.
                    </div>
                )}

                <div className="space-y-2 text-sm text-muted-foreground">
                    <p>When connected, BakedBot can:</p>
                    <ul className="ml-2 list-inside list-disc space-y-1">
                        <li>Track impressions, clicks, CTR, and average position</li>
                        <li>Identify SEO opportunities for comparison and market pages</li>
                        <li>Feed Content Engine topics with real search demand</li>
                    </ul>
                </div>
            </CardContent>

            <CardFooter className="gap-2">
                {status.mode === 'oauth' ? (
                    <Button variant="outline" size="sm" onClick={handleDisconnect}>
                        Disconnect
                    </Button>
                ) : (
                    <Button size="sm" onClick={handleConnect}>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Connect Search Console
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
