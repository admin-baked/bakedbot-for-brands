'use client';

/**
 * QuickEmailVerification Connection Component
 *
 * API key-based integration for email verification before sending outreach.
 * Follows the same Card pattern as Gmail/Sheets/Drive connections.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Check, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export function QEVConnection() {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const checkStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/integrations/qev/status');
            if (res.ok) {
                const data = await res.json();
                setIsConnected(data.connected);
                setRemainingCredits(data.remainingCredits ?? null);
            }
        } catch {
            // Silently fail — user just sees "not connected"
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    const handleSave = async () => {
        if (!apiKey.trim()) {
            setError('API key is required');
            return;
        }
        setIsSaving(true);
        setError(null);
        setSuccessMsg(null);
        try {
            const res = await fetch('/api/integrations/qev/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: apiKey.trim() }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to save');
            }
            setIsConnected(true);
            setRemainingCredits(data.remainingCredits ?? null);
            setApiKey('');
            setSuccessMsg('API key verified and saved successfully');
        } catch (err: unknown) {
            const e = err as Error;
            setError(e.message || 'Failed to save API key');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            const res = await fetch('/api/integrations/qev/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: '' }),
            });
            if (res.ok) {
                setIsConnected(false);
                setRemainingCredits(null);
                setSuccessMsg(null);
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
                            <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">QuickEmailVerification</CardTitle>
                            <CardDescription>
                                Verify email addresses before sending outreach campaigns
                            </CardDescription>
                        </div>
                    </div>
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : isConnected ? (
                        <Badge className="bg-emerald-100 text-emerald-800">
                            <Check className="h-3 w-3 mr-1" />
                            Connected
                        </Badge>
                    ) : (
                        <Badge variant="outline">Not Connected</Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {isConnected ? (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-600">
                            Email verification is active. All outreach emails will be verified before sending.
                        </p>
                        {remainingCredits !== null && (
                            <div className="text-sm text-slate-500">
                                Remaining credits: <strong>{remainingCredits.toLocaleString()}</strong>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Connect your QuickEmailVerification account to verify email addresses
                            before sending outreach. This reduces bounces and protects sender reputation.
                        </p>
                        <div className="space-y-2">
                            <Label htmlFor="qev-api-key">API Key</Label>
                            <div className="relative">
                                <Input
                                    id="qev-api-key"
                                    type={showKey ? 'text' : 'password'}
                                    placeholder="Enter your QuickEmailVerification API key"
                                    value={apiKey}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                                    disabled={isSaving}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}
                        {successMsg && (
                            <div className="flex items-center gap-2 text-sm text-emerald-600">
                                <Check className="h-4 w-4" />
                                {successMsg}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
            <CardFooter>
                {isConnected ? (
                    <Button variant="outline" size="sm" onClick={handleDisconnect}>
                        Disconnect
                    </Button>
                ) : (
                    <Button onClick={handleSave} disabled={isSaving || !apiKey.trim()}>
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Connect
                            </>
                        )}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
