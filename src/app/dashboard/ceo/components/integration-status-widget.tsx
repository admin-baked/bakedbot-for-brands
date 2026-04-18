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
}

export function IntegrationStatusWidget() {
    const [checks, setChecks] = useState<ConnectionCheck[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkedAt, setCheckedAt] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/integration-status');
            if (res.ok) {
                const data = await res.json();
                setChecks(data.checks ?? []);
                setCheckedAt(data.checkedAt ?? null);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const broken = checks.filter(c => c.status !== 'connected');
    const allGood = !loading && broken.length === 0 && checks.length > 0;

    function StatusIcon({ status }: { status: ConnectionCheck['status'] }) {
        if (status === 'connected') return <CheckCircle className="h-4 w-4 text-green-500" />;
        if (status === 'broken') return <XCircle className="h-4 w-4 text-red-500" />;
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Plug className="h-4 w-4" />
                        Integration Status
                        {!loading && (
                            allGood
                                ? <Badge variant="outline" className="text-green-600 border-green-300 text-xs">All Connected</Badge>
                                : <Badge variant="destructive" className="text-xs">{broken.length} Issue{broken.length !== 1 ? 's' : ''}</Badge>
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
            <CardContent className="pt-0">
                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {checks.map(c => (
                            <div key={c.id} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0">
                                <div className="flex items-center gap-2 min-w-0">
                                    <StatusIcon status={c.status} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium leading-none">{c.name}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.detail}</p>
                                    </div>
                                </div>
                                {c.status !== 'connected' && c.reconnectUrl && (
                                    <Link href={c.reconnectUrl}>
                                        <Button variant="outline" size="sm" className="h-7 text-xs shrink-0 gap-1">
                                            <ExternalLink className="h-3 w-3" />
                                            Reconnect
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        ))}
                        {checks.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-2">No integration data</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
