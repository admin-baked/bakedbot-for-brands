'use client';

/**
 * ServiceConnectionCard
 *
 * Generic connection UI for any RTRVR-authenticated service.
 * Tries auto-login first (RTRVR fills credentials); falls back to manual cookie paste.
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import {
    connectServiceAuto,
    connectServiceManual,
    getServiceSessionStatus,
    disconnectService,
} from '@/server/actions/service-session';
import type { ServiceId } from '@/server/services/rtrvr/service-registry';

interface ServiceConnectionCardProps {
    serviceId: ServiceId;
    displayName: string;
    loginUrl: string;
    /** Primary cookie name(s) needed for manual entry */
    sessionCookies: string[];
    agents: string[];
    capabilities: string[];
}

type ConnectState = 'idle' | 'connecting' | 'success' | 'error';

export function ServiceConnectionCard({
    serviceId,
    displayName,
    loginUrl,
    sessionCookies,
    agents,
    capabilities,
}: ServiceConnectionCardProps) {
    const [status, setStatus] = useState<{ connected: boolean; capturedAt?: string; captureMethod?: string } | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [connectState, setConnectState] = useState<ConnectState>('idle');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showManual, setShowManual] = useState(false);
    const [manualCookies, setManualCookies] = useState<Record<string, string>>({});

    useEffect(() => {
        getServiceSessionStatus(serviceId).then(setStatus).catch(() => setStatus({ connected: false }));
    }, [serviceId]);

    async function handleAutoConnect() {
        if (!email || !password) return;
        setConnectState('connecting');
        setMessage(null);

        const result = await connectServiceAuto(serviceId, email, password);
        if (result.success) {
            setConnectState('success');
            setMessage({ type: 'success', text: `${displayName} connected successfully. Your agents are ready.` });
            setEmail('');
            setPassword('');
            const updated = await getServiceSessionStatus(serviceId);
            setStatus(updated);
        } else {
            setConnectState('error');
            setMessage({ type: 'error', text: result.error ?? 'Connection failed' });
        }
    }

    async function handleManualConnect() {
        const result = await connectServiceManual(serviceId, manualCookies);
        if (result.success) {
            setMessage({ type: 'success', text: `${displayName} connected via manual cookie.` });
            setShowManual(false);
            const updated = await getServiceSessionStatus(serviceId);
            setStatus(updated);
        } else {
            setMessage({ type: 'error', text: result.error ?? 'Failed to save cookies' });
        }
    }

    async function handleDisconnect() {
        await disconnectService(serviceId);
        setStatus({ connected: false });
        setMessage({ type: 'success', text: `${displayName} disconnected.` });
    }

    const isConnecting = connectState === 'connecting';

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                    <span>{displayName}</span>
                    {status?.connected ? (
                        <Badge variant="default" className="bg-green-600 text-white gap-1 text-xs">
                            <CheckCircle className="h-3 w-3" /> Connected
                            {status.captureMethod === 'auto' ? ' (auto)' : ' (manual)'}
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="gap-1 text-muted-foreground text-xs">
                            <XCircle className="h-3 w-3" /> Not connected
                        </Badge>
                    )}
                </CardTitle>
                <CardDescription className="text-xs">
                    {agents.join(', ')} · {capabilities.join(' · ')}
                </CardDescription>
                {status?.capturedAt && (
                    <p className="text-xs text-muted-foreground">
                        Connected {new Date(status.capturedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                )}
            </CardHeader>

            <CardContent className="space-y-4">
                {status?.connected ? (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Session active. Reconnect if agents report authentication errors.
                        </p>
                        <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                            Disconnect
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Auto login */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-xs">Email / Username</Label>
                                    <Input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        disabled={isConnecting}
                                        className="text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Password</Label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        disabled={isConnecting}
                                        className="text-sm"
                                        onKeyDown={e => e.key === 'Enter' && handleAutoConnect()}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handleAutoConnect}
                                    disabled={isConnecting || !email || !password}
                                    size="sm"
                                    className="gap-2"
                                >
                                    {isConnecting && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {isConnecting ? 'Logging in...' : `Connect ${displayName}`}
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    Credentials used once — never stored.
                                </p>
                            </div>

                            {connectState === 'error' && (
                                <div className="rounded-md bg-amber-50 border border-amber-200 p-2 flex gap-2 text-xs text-amber-800">
                                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                    <span>Auto-login failed. Try the manual method below if you have 2FA enabled.</span>
                                </div>
                            )}
                        </div>

                        {/* Manual fallback */}
                        <div className="border-t pt-3">
                            <button
                                onClick={() => setShowManual(v => !v)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showManual ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                Manual cookie entry (for 2FA accounts)
                            </button>

                            {showManual && (
                                <div className="mt-3 space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        Log in to{' '}
                                        <a href={loginUrl} target="_blank" rel="noopener noreferrer" className="underline">
                                            {displayName}
                                        </a>
                                        , open DevTools → Application → Cookies, and paste the values below.
                                    </p>
                                    {sessionCookies.map(name => (
                                        <div key={name} className="space-y-1">
                                            <Label className="text-xs font-mono">{name}</Label>
                                            <Input
                                                type="password"
                                                placeholder={`Paste ${name} value...`}
                                                value={manualCookies[name] ?? ''}
                                                onChange={e => setManualCookies(prev => ({ ...prev, [name]: e.target.value }))}
                                                className="font-mono text-xs"
                                            />
                                        </div>
                                    ))}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleManualConnect}
                                        disabled={sessionCookies.every(n => !manualCookies[n])}
                                    >
                                        Save cookies
                                    </Button>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {message && (
                    <p className={`text-xs ${message.type === 'success' ? 'text-green-700' : 'text-destructive'}`}>
                        {message.text}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
