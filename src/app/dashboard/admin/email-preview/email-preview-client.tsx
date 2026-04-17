'use client';

import { useState } from 'react';
import { Mail, Eye, Send, TrendingUp, MousePointerClick, Clock, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { EmailInsights } from '@/server/actions/email-insights';

interface Props {
    insights: EmailInsights[];
}

const TEMPLATES = [
    { type: 'welcome',   label: 'Welcome',        desc: 'Post-checkin, first-time customers' },
    { type: 'returning', label: 'Welcome Back',    desc: 'Post-checkin, returning customers'  },
    { type: 'nudge',     label: 'We Miss You',     desc: '7-day retention nudge'              },
];

const ORGS = [
    { id: 'org_thrive_syracuse',    label: 'Thrive Syracuse',  color: '#27c0dd' },
    { id: 'brand_ecstatic_edibles', label: 'Ecstatic Edibles', color: '#e11d48' },
];

function StatCard({ label, value, sub, icon: Icon, color }: {
    label: string; value: string; sub?: string;
    icon: React.ElementType; color: string;
}) {
    return (
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-card">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold leading-tight">{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

function rateColor(rate: number) {
    if (rate >= 30) return 'text-emerald-500';
    if (rate >= 15) return 'text-amber-500';
    return 'text-red-400';
}

function rateLabel(rate: number, type: 'open' | 'click') {
    if (type === 'open')  return rate >= 30 ? 'Great' : rate >= 15 ? 'Average' : 'Low';
    return rate >= 5 ? 'Great' : rate >= 2 ? 'Average' : 'Low';
}

export function EmailPreviewClient({ insights }: Props) {
    const { toast } = useToast();
    const [activePreview, setActivePreview] = useState<{ orgId: string; type: string } | null>(null);
    const [sending, setSending] = useState(false);

    const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET ?? '';

    function previewUrl(orgId: string, type: string) {
        return `/api/admin/preview-email?type=${type}&orgId=${orgId}`;
    }

    function openPreview(orgId: string, type: string) {
        setActivePreview({ orgId, type });
    }

    async function sendDemo() {
        setSending(true);
        try {
            const res = await fetch('/api/admin/send-demo-emails', {
                headers: { 'x-cron-secret': cronSecret },
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: 'Demo emails sent', description: 'Check martez@bakedbot.ai' });
            } else {
                toast({ title: 'Partial send', description: JSON.stringify(data), variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Send failed', variant: 'destructive' });
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Mail className="h-6 w-6 text-primary" />
                        Email Preview
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Preview transactional templates and review performance — nothing is sent when previewing.
                    </p>
                </div>
                <Button onClick={sendDemo} disabled={sending} size="sm" className="gap-2 shrink-0">
                    <Send className="h-4 w-4" />
                    {sending ? 'Sending…' : 'Send Demo to Inbox'}
                </Button>
            </div>

            {/* Per-org stat cards */}
            {insights.length > 0 && (
                <div className="space-y-6">
                    {insights.map(org => (
                        <div key={org.orgId} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: ORGS.find(o => o.id === org.orgId)?.color ?? '#888' }}
                                />
                                <h2 className="text-sm font-semibold">{org.orgName}</h2>
                                {org.lastSentAt && (
                                    <span className="text-xs text-muted-foreground">
                                        Last sent {new Date(org.lastSentAt).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <StatCard
                                    label="Emails sent (7d)"
                                    value={org.sent7d.toString()}
                                    icon={Mail}
                                    color="#6366f1"
                                />
                                <StatCard
                                    label="Open rate"
                                    value={org.openRate > 0 ? `${org.openRate}%` : '—'}
                                    sub={org.openRate > 0 ? rateLabel(org.openRate, 'open') : 'No data yet'}
                                    icon={TrendingUp}
                                    color={org.openRate >= 30 ? '#10b981' : org.openRate >= 15 ? '#f59e0b' : '#ef4444'}
                                />
                                <StatCard
                                    label="Click rate"
                                    value={org.clickRate > 0 ? `${org.clickRate}%` : '—'}
                                    sub={org.clickRate > 0 ? rateLabel(org.clickRate, 'click') : 'No data yet'}
                                    icon={MousePointerClick}
                                    color="#27c0dd"
                                />
                                <StatCard
                                    label="Top campaign"
                                    value={org.topCampaignSubject ? '✓ Active' : 'None'}
                                    sub={org.topCampaignSubject ?? 'No campaigns yet'}
                                    icon={Clock}
                                    color="#f1b200"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Template grid */}
            <div className="space-y-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Templates</h2>
                <div className="grid gap-4">
                    {ORGS.map(org => (
                        <div key={org.id} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: org.color }} />
                                <span className="text-sm font-medium">{org.label}</span>
                            </div>
                            <div className="grid sm:grid-cols-3 gap-3">
                                {(org.id === 'brand_ecstatic_edibles'
                                    ? [{ type: 'welcome', label: 'Welcome', desc: 'New customer welcome' }]
                                    : TEMPLATES
                                ).map(tpl => {
                                    const isActive = activePreview?.orgId === org.id && activePreview?.type === tpl.type;
                                    return (
                                        <Card
                                            key={tpl.type}
                                            className={`cursor-pointer transition-all hover:ring-2 ${isActive ? 'ring-2' : ''}`}
                                            style={{ '--tw-ring-color': org.color } as React.CSSProperties}
                                            onClick={() => openPreview(org.id, tpl.type)}
                                        >
                                            <CardHeader className="pb-2 pt-4 px-4">
                                                <CardTitle className="text-sm flex items-center justify-between">
                                                    <span>{tpl.label}</span>
                                                    {isActive && (
                                                        <Badge variant="outline" className="text-xs" style={{ borderColor: org.color, color: org.color }}>
                                                            Active
                                                        </Badge>
                                                    )}
                                                </CardTitle>
                                                <p className="text-xs text-muted-foreground">{tpl.desc}</p>
                                            </CardHeader>
                                            <CardContent className="px-4 pb-4">
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-1.5 text-xs flex-1"
                                                        onClick={e => { e.stopPropagation(); openPreview(org.id, tpl.type); }}
                                                    >
                                                        <Eye className="h-3 w-3" />
                                                        Preview
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="gap-1.5 text-xs px-2"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            window.open(previewUrl(org.id, tpl.type), '_blank');
                                                        }}
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Inline iframe preview */}
            {activePreview && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Inline Preview
                        </h2>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs gap-1.5"
                            onClick={() => window.open(previewUrl(activePreview.orgId, activePreview.type), '_blank')}
                        >
                            <ExternalLink className="h-3 w-3" />
                            Open full page
                        </Button>
                    </div>
                    <div className="rounded-xl border overflow-hidden bg-muted/20">
                        <iframe
                            key={`${activePreview.orgId}-${activePreview.type}`}
                            src={previewUrl(activePreview.orgId, activePreview.type)}
                            title="Email Preview"
                            className="w-full"
                            style={{ height: '640px', border: 'none' }}
                            sandbox="allow-same-origin"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
