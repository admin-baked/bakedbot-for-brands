'use client';

/**
 * ServiceConnectionCard
 *
 * Generic connection UI for any RTRVR-authenticated service.
 * Tries auto-login first: streams live browser screenshots via SSE while Puppeteer
 * drives the login flow. Falls back to manual cookie paste for 2FA accounts.
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import {
    connectServiceManual,
    getServiceSessionStatus,
    disconnectService,
} from '@/server/actions/service-session';
import type { ServiceId } from '@/server/services/rtrvr/service-registry';

interface ServiceConnectionCardProps {
    serviceId: ServiceId;
    displayName: string;
    loginUrl: string;
    sessionCookies: string[];
    agents: string[];
    capabilities: string[];
}

type ConnectState = 'idle' | 'connecting' | 'success' | 'error' | '2fa';

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
    const [stepLabel, setStepLabel] = useState('');
    const [liveImage, setLiveImage] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warn'; text: string } | null>(null);
    const [showManual, setShowManual] = useState(false);
    const [manualCookies, setManualCookies] = useState<Record<string, string>>({});
    const abortRef = useRef<AbortController | null>(null);

    function clearLiveView() {
        setLiveImage(null);
        setStepLabel('');
    }

    useEffect(() => {
        getServiceSessionStatus(serviceId).then(setStatus).catch(() => setStatus({ connected: false }));
    }, [serviceId]);

    async function handleAutoConnect() {
        if (!email || !password) return;
        setConnectState('connecting');
        setMessage(null);
        setLiveImage(null);
        setStepLabel('Starting browser...');

        // Abort any previous request
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const res = await fetch(`/api/browser/session-capture/${serviceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                signal: controller.signal,
            });

            if (!res.ok || !res.body) {
                setConnectState('error');
                setMessage({ type: 'error', text: 'Failed to start browser session' });
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                // Parse SSE lines
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const event = JSON.parse(line.slice(6)) as {
                            type: string;
                            step?: string;
                            image?: string;
                            cookies?: Record<string, string>;
                            message?: string;
                        };

                        if (event.type === 'step') {
                            setStepLabel(event.step ?? '');
                            if (event.image) setLiveImage(event.image);

                        } else if (event.type === 'complete' && event.cookies) {
                            const saved = await connectServiceManual(serviceId, event.cookies, 'auto');
                            if (saved.success) {
                                setConnectState('success');
                                setMessage({ type: 'success', text: `${displayName} connected successfully. Your agents are ready.` });
                                setEmail('');
                                setPassword('');
                                clearLiveView();
                                const updated = await getServiceSessionStatus(serviceId);
                                setStatus(updated);
                            } else {
                                setConnectState('error');
                                setMessage({ type: 'error', text: saved.error ?? 'Failed to save session' });
                            }

                        } else if (event.type === '2fa') {
                            setConnectState('2fa');
                            clearLiveView();
                            setMessage({ type: 'warn', text: event.message ?? '2FA detected — use manual cookie method.' });
                            setShowManual(true);

                        } else if (event.type === 'error') {
                            setConnectState('error');
                            clearLiveView();
                            setMessage({ type: 'error', text: event.message ?? 'Connection failed' });
                        }
                    } catch {
                        // malformed SSE line — skip
                    }
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') return;
            setConnectState('error');
            setMessage({ type: 'error', text: 'Connection interrupted' });
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
        abortRef.current?.abort();
        await disconnectService(serviceId);
        setStatus({ connected: false });
        setConnectState('idle');
        setLiveImage(null);
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

                            {/* Live browser view */}
                            {isConnecting && (
                                <div className="rounded-md border bg-muted/30 overflow-hidden space-y-0">
                                    {liveImage ? (
                                        <img
                                            src={`data:image/png;base64,${liveImage}`}
                                            alt="Live browser view"
                                            className="w-full object-cover rounded-t-md"
                                            style={{ maxHeight: 280 }}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-40 text-muted-foreground text-xs">
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Starting browser...
                                        </div>
                                    )}
                                    {stepLabel && (
                                        <p className="px-3 py-2 text-xs text-muted-foreground border-t bg-background/80">
                                            {stepLabel}
                                        </p>
                                    )}
                                </div>
                            )}

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
                    <p className={`text-xs ${message.type === 'success' ? 'text-green-700' : message.type === 'warn' ? 'text-amber-700' : 'text-destructive'}`}>
                        {message.text}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
