'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, XCircle, RefreshCcw, ExternalLink, Plug } from 'lucide-react';
import Link from 'next/link';

interface ConnectionCheck {
    id: string;
    name: string;
    status: 'connected' | 'broken' | 'not_configured';
    detail: string;
    reconnectUrl?: string;
    agents?: string[];
}

function StatusIcon({ status }: { status: ConnectionCheck['status'] }) {
    if (status === 'connected') return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
    if (status === 'broken') return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    return <AlertCircle className="h-4 w-4 text-yellow-400 shrink-0" />;
}

function ConnectionRow({ c }: { c: ConnectionCheck }) {
    return (
        <div className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0">
            <div className="flex items-center gap-2 min-w-0">
                <StatusIcon status={c.status} />
                <div className="min-w-0">
                    <p className="text-sm font-medium leading-none">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.detail}</p>
                </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                {c.agents && c.agents.length > 0 && (
                    <span className="text-xs text-muted-foreground hidden sm:block">{c.agents.slice(0, 2).join(', ')}</span>
                )}
                {c.status !== 'connected' && c.reconnectUrl && (
                    <Link href={c.reconnectUrl}>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            <ExternalLink className="h-3 w-3" />
                            Connect
                        </Button>
                    </Link>
                )}
            </div>
        </div>
    );
}

function Section({ title, checks, loading }: { title: string; checks: ConnectionCheck[]; loading: boolean }) {
    const broken = checks.filter(c => c.status !== 'connected').length;
    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
                {!loading && broken > 0 && (
                    <Badge variant="destructive" className="text-xs h-4 px-1">{broken}</Badge>
                )}
            </div>
            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
                </div>
            ) : (
                <div>
                    {checks.map(c => <ConnectionRow key={c.id} c={c} />)}
                    {checks.length === 0 && <p className="text-xs text-muted-foreground py-2">No integrations configured</p>}
                </div>
            )}
        </div>
    );
}

export function IntegrationStatusWidget() {
    const [googleChecks, setGoogleChecks] = useState<ConnectionCheck[]>([]);
    const [socialChecks, setSocialChecks] = useState<ConnectionCheck[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkedAt, setCheckedAt] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        try {
            const [gRes, sRes] = await Promise.all([
                fetch('/api/admin/integration-status'),
                fetch('/api/admin/social-status'),
            ]);
            if (gRes.ok) {
                const d = await gRes.json();
                setGoogleChecks(d.checks ?? []);
                setCheckedAt(d.checkedAt ?? null);
            }
            if (sRes.ok) {
                const d = await sRes.json();
                setSocialChecks(d.checks ?? []);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const allChecks = [...googleChecks, ...socialChecks];
    const totalBroken = allChecks.filter(c => c.status !== 'connected').length;
    const allGood = !loading && totalBroken === 0 && allChecks.length > 0;

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Plug className="h-4 w-4" />
                        Integrations
                        {!loading && (
                            allGood
                                ? <Badge variant="outline" className="text-green-600 border-green-300 text-xs">All Connected</Badge>
                                : <Badge variant="destructive" className="text-xs">{totalBroken} Issue{totalBroken !== 1 ? 's' : ''}</Badge>
                        )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {checkedAt && (
                            <span className="text-xs text-muted-foreground">
                                {new Date(checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-7 w-7 p-0">
                            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
                <Section title="Google" checks={googleChecks} loading={loading} />
                <Section title="Social & Ads" checks={socialChecks} loading={loading} />
            </CardContent>
        </Card>
    );
}
