'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Clock, Mail, MessageSquare, LayoutDashboard, CheckCircle2, Loader2 } from 'lucide-react';

interface NotificationChannel {
    email: boolean;
    dashboard: boolean;
    sms: boolean;
}

interface BriefingDeliveryPrefs {
    morningBriefingTime: string; // "08:30" format
    middayPulseTime: string;
    eveningPulseTime: string;
    deliveryChannels: {
        slack: boolean;
        email: boolean;
        dashboard: boolean;
    };
    quietHoursStart: string; // "21:00" format
    quietHoursEnd: string; // "07:00" format
    briefingCards: {
        slow_movers: boolean;
        customer_mix: boolean;
        churn_risk: boolean;
        pending_orders: boolean;
        competitor_intel: boolean;
        margin_drain: boolean;
    };
}

interface NotificationPrefs {
    playbook_failure: NotificationChannel;
    usage_alert: NotificationChannel;
    competitor_alert: NotificationChannel;
    compliance_flag: NotificationChannel;
    billing_alert: NotificationChannel;
    weekly_report: NotificationChannel;
}

const DEFAULT_BRIEFING_PREFS: BriefingDeliveryPrefs = {
    morningBriefingTime: '08:30',
    middayPulseTime: '12:00',
    eveningPulseTime: '18:00',
    deliveryChannels: { slack: true, email: true, dashboard: true },
    quietHoursStart: '21:00',
    quietHoursEnd: '07:00',
    briefingCards: {
        slow_movers: true,
        customer_mix: true,
        churn_risk: true,
        pending_orders: true,
        competitor_intel: true,
        margin_drain: true,
    },
};

const BRIEFING_CARD_LABELS: { key: keyof BriefingDeliveryPrefs['briefingCards']; label: string }[] = [
    { key: 'slow_movers', label: 'Slow Movers' },
    { key: 'customer_mix', label: 'Customer Mix' },
    { key: 'churn_risk', label: 'Churn Risk Alert' },
    { key: 'pending_orders', label: 'Orders Needing Attention' },
    { key: 'competitor_intel', label: 'Competitor Intel' },
    { key: 'margin_drain', label: 'Margin Drain Alert' },
];

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
    const [briefingPrefs, setBriefingPrefs] = useState<BriefingDeliveryPrefs>(DEFAULT_BRIEFING_PREFS);
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
                body: JSON.stringify({ prefs, briefingPrefs }),
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

            {/* Briefing Delivery Preferences */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Briefing Delivery
                    </CardTitle>
                    <CardDescription>
                        When and how your daily briefing cards arrive. Midday and evening pulses update the same cards with fresh data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Delivery Times */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium">Delivery Schedule</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Morning Briefing</label>
                                <Select
                                    value={briefingPrefs.morningBriefingTime}
                                    onValueChange={(v) => { setBriefingPrefs((p) => ({ ...p, morningBriefingTime: v })); setSaved(false); }}
                                >
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00'].map((t) => (
                                            <SelectItem key={t} value={t}>{t} ET</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Midday Pulse</label>
                                <Select
                                    value={briefingPrefs.middayPulseTime}
                                    onValueChange={(v) => { setBriefingPrefs((p) => ({ ...p, middayPulseTime: v })); setSaved(false); }}
                                >
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['11:00', '11:30', '12:00', '12:30', '13:00'].map((t) => (
                                            <SelectItem key={t} value={t}>{t} ET</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Evening Pulse</label>
                                <Select
                                    value={briefingPrefs.eveningPulseTime}
                                    onValueChange={(v) => { setBriefingPrefs((p) => ({ ...p, eveningPulseTime: v })); setSaved(false); }}
                                >
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'].map((t) => (
                                            <SelectItem key={t} value={t}>{t} ET</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Delivery Channels */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium">Delivery Channels</h4>
                        <div className="flex flex-wrap gap-6">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <Switch
                                    checked={briefingPrefs.deliveryChannels.slack}
                                    onCheckedChange={(v) => { setBriefingPrefs((p) => ({ ...p, deliveryChannels: { ...p.deliveryChannels, slack: v } })); setSaved(false); }}
                                    className="scale-90"
                                />
                                <span className="text-xs text-muted-foreground">Slack (Uncle Elroy)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <Switch
                                    checked={briefingPrefs.deliveryChannels.email}
                                    onCheckedChange={(v) => { setBriefingPrefs((p) => ({ ...p, deliveryChannels: { ...p.deliveryChannels, email: v } })); setSaved(false); }}
                                    className="scale-90"
                                />
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email (with action links)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <Switch
                                    checked={briefingPrefs.deliveryChannels.dashboard}
                                    onCheckedChange={(v) => { setBriefingPrefs((p) => ({ ...p, deliveryChannels: { ...p.deliveryChannels, dashboard: v } })); setSaved(false); }}
                                    className="scale-90"
                                />
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><LayoutDashboard className="w-3.5 h-3.5" /> Dashboard</span>
                            </label>
                        </div>
                    </div>

                    {/* Quiet Hours */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium">Quiet Hours</h4>
                        <p className="text-xs text-muted-foreground">No notifications between these times</p>
                        <div className="flex items-center gap-3">
                            <Select
                                value={briefingPrefs.quietHoursStart}
                                onValueChange={(v) => { setBriefingPrefs((p) => ({ ...p, quietHoursStart: v })); setSaved(false); }}
                            >
                                <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {['19:00', '20:00', '21:00', '22:00', '23:00'].map((t) => (
                                        <SelectItem key={t} value={t}>{t} ET</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-xs text-muted-foreground">to</span>
                            <Select
                                value={briefingPrefs.quietHoursEnd}
                                onValueChange={(v) => { setBriefingPrefs((p) => ({ ...p, quietHoursEnd: v })); setSaved(false); }}
                            >
                                <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {['05:00', '06:00', '07:00', '08:00', '09:00'].map((t) => (
                                        <SelectItem key={t} value={t}>{t} ET</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Briefing Card Toggles */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium">Briefing Cards</h4>
                        <p className="text-xs text-muted-foreground">Choose which insight cards appear in your briefings</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {BRIEFING_CARD_LABELS.map(({ key, label }) => (
                                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                                    <Switch
                                        checked={briefingPrefs.briefingCards[key]}
                                        onCheckedChange={(v) => {
                                            setBriefingPrefs((p) => ({
                                                ...p,
                                                briefingCards: { ...p.briefingCards, [key]: v },
                                            }));
                                            setSaved(false);
                                        }}
                                        className="scale-90"
                                    />
                                    <span className="text-sm">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
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
