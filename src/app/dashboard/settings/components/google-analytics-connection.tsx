'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart3, Check, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

type GoogleIntegrationMode = 'oauth' | 'service_account' | 'disconnected';

interface GoogleAnalyticsStatus {
    connected: boolean;
    mode: GoogleIntegrationMode;
    propertyId: string | null;
    propertyConfigured: boolean;
}

interface GoogleAnalyticsConnectionProps {
    redirectPath?: string;
}

export function GoogleAnalyticsConnection({
    redirectPath = '/dashboard/settings?tab=integrations',
}: GoogleAnalyticsConnectionProps) {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<GoogleAnalyticsStatus>({
        connected: false,
        mode: 'disconnected',
        propertyId: null,
        propertyConfigured: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const connect = searchParams.get('connect');

    useEffect(() => {
        async function checkStatus() {
            try {
                const res = await fetch('/api/integrations/google-analytics/status');
                if (res.ok) {
                    const data = await res.json();
                    setStatus({
                        connected: Boolean(data.connected),
                        mode: (data.mode as GoogleIntegrationMode) || 'disconnected',
                        propertyId: data.propertyId || null,
                        propertyConfigured: Boolean(data.propertyConfigured),
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
        window.location.href = `/api/auth/google?service=google_analytics&redirect=${encodedRedirect}`;
    };

    const handleSavePropertyId = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/integrations/google-analytics/configure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ propertyId: inputValue })
            });
            if (res.ok) {
                setStatus(prev => ({ ...prev, propertyId: inputValue, propertyConfigured: true }));
                setInputValue('');
            }
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (connect === 'google_analytics' && status.mode === 'disconnected') {
            const encodedRedirect = encodeURIComponent(redirectPath);
            window.location.href = `/api/auth/google?service=google_analytics&redirect=${encodedRedirect}`;
        }
    }, [connect, redirectPath, status.mode]);

    const handleDisconnect = async () => {
        const res = await fetch('/api/integrations/google-analytics/disconnect', { method: 'POST' });
        if (res.ok) {
            setStatus((current) => ({
                ...current,
                connected: false,
                mode: current.propertyConfigured ? 'service_account' : 'disconnected',
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                            <BarChart3 className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Google Analytics</CardTitle>
                            <CardDescription>
                                Power CEO analytics, content attribution, and blog performance reporting
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
                                    ? 'Google OAuth credentials are not configured for analytics access.'
                                    : 'Failed to connect Google Analytics. Please try again.'}
                            </p>
                        </div>
                    </div>
                )}

                {success === 'google_analytics_connected' && (
                    <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                        <Check className="mt-0.5 h-5 w-5 text-green-600" />
                        <div>
                            <p className="text-sm font-medium text-green-800">Google Analytics Connected</p>
                            <p className="text-xs text-green-600">
                                Super User analytics and content reporting can now use your Google access.
                            </p>
                        </div>
                    </div>
                )}

                {status.mode === 'oauth' && (
                    <p className="text-sm text-muted-foreground">
                        Connected with your Google account{status.propertyId ? ` for property ${status.propertyId}` : ''}.
                    </p>
                )}

                {status.mode === 'service_account' && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                        Platform credentials are active{status.propertyId ? ` for property ${status.propertyId}` : ''}. You can still connect your own Google account if you want the dashboard to use user OAuth.
                    </div>
                )}

                {!status.propertyConfigured ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        <p className="mb-2 font-medium">GA4 Property is not configured.</p>
                        <form onSubmit={handleSavePropertyId} className="flex gap-2 items-center">
                            <Input 
                                value={inputValue} 
                                onChange={(e) => setInputValue(e.target.value)} 
                                placeholder="properties/..." 
                                className="bg-white h-8 text-xs" 
                                disabled={isSaving}
                            />
                            <Button type="submit" size="sm" className="h-8" disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                        </form>
                    </div>
                ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 flex flex-col gap-2">
                        <p>GA4 Target Profile: <strong className="font-mono text-xs">{status.propertyId}</strong></p>
                        <form onSubmit={handleSavePropertyId} className="flex gap-2 items-center">
                            <Input 
                                value={inputValue} 
                                onChange={(e) => setInputValue(e.target.value)} 
                                placeholder="Update property ID..." 
                                className="bg-white h-8 text-xs" 
                                disabled={isSaving}
                            />
                            <Button type="submit" variant="secondary" size="sm" className="h-8 shadow-none" disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Update'}
                            </Button>
                        </form>
                    </div>
                )}

                <div className="space-y-2 text-sm text-muted-foreground">
                    <p>When connected, BakedBot can:</p>
                    <ul className="ml-2 list-inside list-disc space-y-1">
                        <li>Track site sessions and content performance</li>
                        <li>Measure acquisition sources for BakedBot.ai</li>
                        <li>Feed the Content Engine and Blog tool with live traffic signals</li>
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
                        Connect Google Analytics
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
