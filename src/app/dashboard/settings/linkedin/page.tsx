'use client';

/**
 * LinkedIn Settings — Super User Only
 *
 * Lets Super Users connect their LinkedIn account by pasting their li_at
 * session cookie. Once connected, Craig can post to their feed and Leo can
 * send messages on their behalf.
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Linkedin, CheckCircle, XCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { saveLinkedInSession, getLinkedInSessionStatus, disconnectLinkedIn } from '@/server/actions/linkedin-session';

export default function LinkedInSettingsPage() {
    const [status, setStatus] = useState<{ connected: boolean; connectedAt?: string } | null>(null);
    const [liAt, setLiAt] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        getLinkedInSessionStatus().then(setStatus).catch(() => setStatus({ connected: false }));
    }, []);

    async function handleSave() {
        if (!liAt.trim()) return;
        setSaving(true);
        setMessage(null);
        const result = await saveLinkedInSession(liAt.trim());
        if (result.success) {
            setMessage({ type: 'success', text: 'LinkedIn connected successfully. Craig and Leo can now act on your behalf.' });
            setLiAt('');
            const updated = await getLinkedInSessionStatus();
            setStatus(updated);
        } else {
            setMessage({ type: 'error', text: result.error ?? 'Failed to connect' });
        }
        setSaving(false);
    }

    async function handleDisconnect() {
        await disconnectLinkedIn();
        setStatus({ connected: false });
        setMessage({ type: 'success', text: 'LinkedIn disconnected.' });
    }

    return (
        <div className="max-w-2xl space-y-6 p-6">
            <div className="flex items-center gap-3">
                <Linkedin className="h-6 w-6 text-[#0A66C2]" />
                <div>
                    <h1 className="text-xl font-semibold">LinkedIn</h1>
                    <p className="text-sm text-muted-foreground">Connect your LinkedIn so Craig can post and Leo can message leads on your behalf.</p>
                </div>
            </div>

            {/* Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        Status
                        {status?.connected ? (
                            <Badge variant="default" className="bg-green-600 text-white gap-1">
                                <CheckCircle className="h-3 w-3" /> Connected
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="gap-1 text-muted-foreground">
                                <XCircle className="h-3 w-3" /> Not connected
                            </Badge>
                        )}
                    </CardTitle>
                    {status?.connectedAt && (
                        <CardDescription>
                            Connected {new Date(status.connectedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </CardDescription>
                    )}
                </CardHeader>
                {status?.connected && (
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Craig can publish posts to your LinkedIn feed. Leo can message your connections. Sessions expire when you log out of LinkedIn — reconnect if agents report errors.
                        </p>
                        <Button variant="destructive" size="sm" onClick={handleDisconnect}>Disconnect LinkedIn</Button>
                    </CardContent>
                )}
            </Card>

            {/* Connect */}
            {!status?.connected && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Connect your LinkedIn account</CardTitle>
                        <CardDescription>
                            We use your session cookie to act on your behalf — no password stored. Sessions expire when you log out of LinkedIn.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 flex gap-2 text-sm text-amber-800">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>Keep automation under ~100 actions/day to avoid LinkedIn rate limits.</span>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium">How to get your session cookie:</p>
                            <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-4">
                                <li>Log into LinkedIn in your browser</li>
                                <li>Open DevTools → Application → Cookies → <code className="bg-muted px-1 rounded">www.linkedin.com</code></li>
                                <li>Find the cookie named <code className="bg-muted px-1 rounded">li_at</code> and copy its value</li>
                            </ol>
                            <a
                                href="https://www.linkedin.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            >
                                Open LinkedIn <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>

                        <div className="flex gap-2">
                            <Input
                                type="password"
                                placeholder="Paste li_at cookie value..."
                                value={liAt}
                                onChange={e => setLiAt(e.target.value)}
                                className="font-mono text-sm"
                            />
                            <Button onClick={handleSave} disabled={saving || !liAt.trim()}>
                                {saving ? 'Connecting...' : 'Connect'}
                            </Button>
                        </div>

                        {message && (
                            <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-destructive'}`}>
                                {message.text}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Capabilities */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">What your agents can do</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex gap-3">
                        <span className="font-medium w-12 shrink-0">Craig</span>
                        <span className="text-muted-foreground">Publish posts to your LinkedIn feed — thought leadership, product drops, brand content</span>
                    </div>
                    <div className="flex gap-3">
                        <span className="font-medium w-12 shrink-0">Leo</span>
                        <span className="text-muted-foreground">Message dispensary leads and partners · Enrich lead profiles with LinkedIn data</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
