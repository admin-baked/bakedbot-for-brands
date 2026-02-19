import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, AlertTriangle, CheckCircle2, Info, XCircle, RefreshCw } from 'lucide-react';
import { AlertsClient } from './alerts-client';

interface Alert {
    id: string;
    type: string;
    title: string;
    body: string;
    severity?: 'info' | 'warning' | 'critical';
    read: boolean;
    actionUrl?: string;
    actionLabel?: string;
    createdAt: string; // ISO string for client serialization
}

function severityIcon(severity?: string) {
    switch (severity) {
        case 'critical': return <XCircle className="w-4 h-4 text-red-500" />;
        case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
        default: return <Info className="w-4 h-4 text-blue-500" />;
    }
}

function severityBadge(severity?: string) {
    switch (severity) {
        case 'critical': return <Badge variant="destructive">Critical</Badge>;
        case 'warning': return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">Warning</Badge>;
        default: return <Badge variant="secondary">Info</Badge>;
    }
}

function typeLabel(type: string): string {
    const labels: Record<string, string> = {
        playbook_failure: 'Playbook',
        usage_threshold_80: 'Usage Alert',
        competitor_price_alert: 'Competitor Intel',
        compliance_flag: 'Compliance',
        system_alert: 'System',
        se_application_received: 'Social Equity',
        playbook_delivery: 'Playbook',
    };
    return labels[type] ?? type.replace(/_/g, ' ');
}

export default async function AlertsPage() {
    const user = await requireUser();
    const orgId = user.currentOrgId;
    if (!orgId) redirect('/dashboard');

    const firestore = getAdminFirestore();

    const now = new Date();
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days

    const snap = await firestore
        .collection('inbox_notifications')
        .where('orgId', '==', orgId)
        .where('createdAt', '>=', Timestamp.fromDate(cutoff))
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

    const alerts: Alert[] = snap.docs.map((doc) => {
        const d = doc.data();
        const ts = d.createdAt as Timestamp | null;
        return {
            id: doc.id,
            type: d.type as string ?? 'system_alert',
            title: d.title as string ?? 'Alert',
            body: d.body as string ?? '',
            severity: (d.severity as Alert['severity']) ?? 'info',
            read: d.read as boolean ?? false,
            actionUrl: d.actionUrl as string | undefined,
            actionLabel: d.actionLabel as string | undefined,
            createdAt: ts ? ts.toDate().toISOString() : new Date().toISOString(),
        };
    });

    const unreadCount = alerts.filter((a) => !a.read).length;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
                        <p className="text-sm text-muted-foreground">
                            Playbook failures, usage thresholds, compliance flags
                        </p>
                    </div>
                </div>
                {unreadCount > 0 && (
                    <Badge className="bg-primary text-primary-foreground">
                        {unreadCount} unread
                    </Badge>
                )}
            </div>

            {alerts.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-16 text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-60" />
                        <p className="text-lg font-medium text-muted-foreground">All clear</p>
                        <p className="text-sm text-muted-foreground mt-1">No alerts in the last 30 days</p>
                    </CardContent>
                </Card>
            ) : (
                <AlertsClient alerts={alerts} orgId={orgId} />
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t border-border/40">
                <div className="flex items-center gap-1.5">{severityIcon('critical')}<span>Critical — action required immediately</span></div>
                <div className="flex items-center gap-1.5">{severityIcon('warning')}<span>Warning — review soon</span></div>
                <div className="flex items-center gap-1.5">{severityIcon()}<span>Info — no action needed</span></div>
            </div>
        </div>
    );
}
