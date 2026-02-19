'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Mail, MessageSquare, LayoutDashboard, CheckCircle2, Loader2 } from 'lucide-react';

interface NotificationChannel {
    email: boolean;
    dashboard: boolean;
    sms: boolean;
}

interface NotificationPrefs {
    playbook_failure: NotificationChannel;
    usage_alert: NotificationChannel;
    competitor_alert: NotificationChannel;
    compliance_flag: NotificationChannel;
    billing_alert: NotificationChannel;
    weekly_report: NotificationChannel;
}

const DEFAULT_PREFS: NotificationPrefs = {
    playbook_failure: { email: true, dashboard: true, sms: false },
    usage_alert: { email: true, dashboard: true, sms: false },
    competitor_alert: { email: false, dashboard: true, sms: false },
    compliance_flag: { email: true, dashboard: true, sms: true },
    billing_alert: { email: true, dashboard: true, sms: false },
    weekly_report: { email: true, dashboard: false, sms: false },
};

type NotificationType = keyof NotificationPrefs;

const NOTIFICATION_TYPES: { key: NotificationType; label: string; desc: string; smsAvailable: boolean }[] = [
    {
        key: 'playbook_failure',
        label: 'Playbook failures',
        desc: 'When an automated playbook fails after 3 attempts',
        smsAvailable: false,
    },
    {
        key: 'usage_alert',
        label: 'Usage alerts (80%+)',
        desc: 'When you approach your monthly plan limits',
        smsAvailable: true,
    },
    {
        key: 'competitor_alert',
        label: 'Competitor intel',
        desc: 'Price drops and new products from tracked competitors',
        smsAvailable: true,
    },
    {
        key: 'compliance_flag',
        label: 'Compliance flags',
        desc: 'Content blocked by Deebo before sending',
        smsAvailable: true,
    },
    {
        key: 'billing_alert',
        label: 'Billing & overages',
        desc: 'Invoices, payment failures, overage charges',
        smsAvailable: false,
    },
    {
        key: 'weekly_report',
        label: 'Weekly summary',
        desc: 'Your weekly competitive intel and performance digest',
        smsAvailable: false,
    },
];

export default function NotificationsPage() {
    const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    function toggle(type: NotificationType, channel: keyof NotificationChannel) {
        setPrefs((prev) => ({
            ...prev,
            [type]: {
                ...prev[type],
                [channel]: !prev[type][channel],
            },
        }));
        setSaved(false);
    }

    async function save() {
        setSaving(true);
        try {
            await fetch('/api/settings/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prefs }),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                    <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
                    <p className="text-sm text-muted-foreground">
                        Choose how and when BakedBot alerts you
                    </p>
                </div>
            </div>

            {/* Channel legend */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /><span>Email</span></div>
                <div className="flex items-center gap-1.5"><LayoutDashboard className="w-3.5 h-3.5" /><span>Dashboard inbox</span></div>
                <div className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /><span>SMS (requires staff phone in settings)</span></div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Alert Preferences</CardTitle>
                    <CardDescription>
                        Toggle which channels receive each type of alert.
                    </CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border/50">
                    {NOTIFICATION_TYPES.map(({ key, label, desc, smsAvailable }) => {
                        const pref = prefs[key];
                        return (
                            <div key={key} className="py-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm">{label}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 mt-3">
                                    {/* Email */}
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <Switch
                                            checked={pref.email}
                                            onCheckedChange={() => toggle(key, 'email')}
                                            className="scale-90"
                                        />
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Mail className="w-3.5 h-3.5" /> Email
                                        </span>
                                    </label>

                                    {/* Dashboard */}
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <Switch
                                            checked={pref.dashboard}
                                            onCheckedChange={() => toggle(key, 'dashboard')}
                                            className="scale-90"
                                        />
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                                        </span>
                                    </label>

                                    {/* SMS */}
                                    <label className={`flex items-center gap-2 cursor-pointer select-none ${!smsAvailable ? 'opacity-40 pointer-events-none' : ''}`}>
                                        <Switch
                                            checked={smsAvailable && pref.sms}
                                            onCheckedChange={() => smsAvailable && toggle(key, 'sms')}
                                            className="scale-90"
                                            disabled={!smsAvailable}
                                        />
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <MessageSquare className="w-3.5 h-3.5" /> SMS
                                            {!smsAvailable && <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">N/A</Badge>}
                                        </span>
                                    </label>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Save button */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Changes apply to future alerts only.</p>
                <Button onClick={save} disabled={saving} className="rounded-xl min-w-[100px]">
                    {saving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving</>
                    ) : saved ? (
                        <><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" />Saved</>
                    ) : (
                        'Save preferences'
                    )}
                </Button>
            </div>
        </div>
    );
}
