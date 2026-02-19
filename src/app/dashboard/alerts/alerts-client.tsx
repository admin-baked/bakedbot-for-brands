'use client';

import { useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Info, XCircle, Check, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
    id: string;
    type: string;
    title: string;
    body: string;
    severity?: 'info' | 'warning' | 'critical';
    read: boolean;
    actionUrl?: string;
    actionLabel?: string;
    createdAt: string;
}

interface AlertsClientProps {
    alerts: Alert[];
    orgId: string;
}

function SeverityIcon({ severity }: { severity?: string }) {
    if (severity === 'critical') return <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />;
    if (severity === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />;
    return <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
}

const TYPE_LABELS: Record<string, string> = {
    playbook_failure: 'Playbook',
    usage_threshold_80: 'Usage',
    competitor_price_alert: 'Intel',
    compliance_flag: 'Compliance',
    system_alert: 'System',
    se_application_received: 'Social Equity',
    playbook_delivery: 'Playbook',
};

export function AlertsClient({ alerts: initialAlerts, orgId }: AlertsClientProps) {
    const [alerts, setAlerts] = useState(initialAlerts);
    const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
    const [, startTransition] = useTransition();

    const filtered = alerts.filter((a) => {
        if (filter === 'unread') return !a.read;
        if (filter === 'critical') return a.severity === 'critical';
        return true;
    });

    async function markRead(id: string) {
        setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
        // Fire-and-forget server update
        void fetch(`/api/alerts/${id}/read`, { method: 'POST' });
    }

    async function markAllRead() {
        startTransition(() => {
            setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
        });
        void fetch(`/api/alerts/mark-all-read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orgId }),
        });
    }

    const unreadCount = alerts.filter((a) => !a.read).length;

    return (
        <div className="space-y-4">
            {/* Filter + mark all read */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                    {(['all', 'unread', 'critical'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 text-sm rounded-lg transition-colors capitalize ${
                                filter === f
                                    ? 'bg-primary text-primary-foreground font-medium'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            {f}
                            {f === 'unread' && unreadCount > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary/20 rounded-full">{unreadCount}</span>
                            )}
                        </button>
                    ))}
                </div>
                {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs">
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        Mark all read
                    </Button>
                )}
            </div>

            {/* Alert list */}
            <div className="space-y-2">
                {filtered.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No alerts match this filter</p>
                ) : (
                    filtered.map((alert) => (
                        <Card
                            key={alert.id}
                            className={`transition-all duration-200 ${
                                !alert.read ? 'border-primary/20 bg-primary/[0.02]' : 'border-border/50 opacity-80'
                            }`}
                        >
                            <CardContent className="py-4 px-5">
                                <div className="flex items-start gap-3">
                                    <SeverityIcon severity={alert.severity} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="font-semibold text-sm text-foreground">{alert.title}</span>
                                            <Badge variant="outline" className="text-xs px-2 py-0">
                                                {TYPE_LABELS[alert.type] ?? alert.type}
                                            </Badge>
                                            {!alert.read && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{alert.body}</p>
                                        <div className="flex items-center gap-4 mt-3">
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                                            </span>
                                            {alert.actionUrl && (
                                                <a
                                                    href={alert.actionUrl}
                                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                                >
                                                    {alert.actionLabel ?? 'View'}
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                            {!alert.read && (
                                                <button
                                                    onClick={() => markRead(alert.id)}
                                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    Mark read
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
