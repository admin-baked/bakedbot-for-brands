'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ArrowLeft, Shield, CheckCircle, Calendar, Send, Pause, X,
    Mail, MessageSquare, Users, Loader2, BarChart3, Clock,
    AlertTriangle, Bot, Play, RotateCcw, Copy, Eye, TrendingUp,
    CircleDot,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    getCampaign, approveCampaign, scheduleCampaign,
    submitForComplianceReview, cancelCampaign, pauseCampaign,
    resumeCampaign, duplicateCampaign, retryCampaign, getCampaignRecipients,
} from '@/server/actions/campaigns';
import type { Campaign, CampaignRecipient } from '@/types/campaign';
import { CAMPAIGN_STATUS_INFO, CAMPAIGN_GOALS } from '@/types/campaign';
import { getSegmentInfo } from '@/types/customers';

interface CampaignDetailProps {
    campaignId: string;
    userId: string;
}

export function CampaignDetail({ campaignId, userId }: CampaignDetailProps) {
    const router = useRouter();
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
    const [recipientTotal, setRecipientTotal] = useState(0);
    const [recipientsLoading, setRecipientsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const loadCampaign = useCallback(async () => {
        const data = await getCampaign(campaignId);
        setCampaign(data);
        setLoading(false);
    }, [campaignId]);

    useEffect(() => {
        setLoading(true);
        loadCampaign();
    }, [loadCampaign]);

    // Auto-refresh when sending
    useEffect(() => {
        if (!campaign || campaign.status !== 'sending') return;
        const interval = setInterval(loadCampaign, 15000);
        return () => clearInterval(interval);
    }, [campaign?.status, loadCampaign]);

    async function loadRecipients() {
        setRecipientsLoading(true);
        const result = await getCampaignRecipients(campaignId, { limit: 50 });
        if (result) {
            setRecipients(result.recipients);
            setRecipientTotal(result.total);
        }
        setRecipientsLoading(false);
    }

    useEffect(() => {
        if (activeTab === 'audience') loadRecipients();
    }, [activeTab]);

    async function handleAction(action: string) {
        setActionLoading(action);
        try {
            switch (action) {
                case 'compliance':
                    await submitForComplianceReview(campaignId);
                    break;
                case 'approve':
                    await approveCampaign(campaignId, userId);
                    break;
                case 'schedule_now': {
                    const now = new Date();
                    now.setMinutes(now.getMinutes() + 5);
                    await scheduleCampaign(campaignId, now);
                    break;
                }
                case 'pause':
                    await pauseCampaign(campaignId);
                    break;
                case 'resume':
                    await resumeCampaign(campaignId);
                    break;
                case 'cancel':
                    await cancelCampaign(campaignId);
                    break;
                case 'retry':
                    await retryCampaign(campaignId);
                    break;
                case 'duplicate': {
                    const clone = await duplicateCampaign(campaignId);
                    if (clone) router.push(`/dashboard/campaigns/${clone.id}`);
                    return;
                }
            }
            await loadCampaign();
        } finally {
            setActionLoading(null);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!campaign) {
        return (
            <Alert variant="destructive">
                <AlertDescription>Campaign not found.</AlertDescription>
            </Alert>
        );
    }

    const statusInfo = CAMPAIGN_STATUS_INFO[campaign.status];
    const goalInfo = CAMPAIGN_GOALS.find(g => g.id === campaign.goal);
    const perf = campaign.performance;
    const isSendingOrSent = ['sending', 'sent'].includes(campaign.status);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/campaigns')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold">{campaign.name}</h1>
                        <Badge className={statusInfo.color} variant="secondary">
                            {statusInfo.label}
                        </Badge>
                        {perf && isSendingOrSent && <HealthBadge perf={perf} />}
                    </div>
                    {campaign.description && (
                        <p className="text-muted-foreground mt-1">{campaign.description}</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap justify-end">
                    {campaign.status === 'draft' && (
                        <ActionButton action="compliance" label="Submit for Review" icon={<Shield className="h-4 w-4" />} loading={actionLoading} onClick={handleAction} />
                    )}
                    {campaign.status === 'pending_approval' && (
                        <ActionButton action="approve" label="Approve" icon={<CheckCircle className="h-4 w-4" />} loading={actionLoading} onClick={handleAction} />
                    )}
                    {campaign.status === 'approved' && (
                        <ActionButton action="schedule_now" label="Send Now" icon={<Send className="h-4 w-4" />} loading={actionLoading} onClick={handleAction} />
                    )}
                    {campaign.status === 'sending' && (
                        <ActionButton action="pause" label="Pause" icon={<Pause className="h-4 w-4" />} loading={actionLoading} onClick={handleAction} variant="outline" />
                    )}
                    {campaign.status === 'paused' && (
                        <ActionButton action="resume" label="Resume" icon={<Play className="h-4 w-4" />} loading={actionLoading} onClick={handleAction} />
                    )}
                    {campaign.status === 'failed' && (
                        <ActionButton action="retry" label="Retry" icon={<RotateCcw className="h-4 w-4" />} loading={actionLoading} onClick={handleAction} />
                    )}
                    <ActionButton action="duplicate" label="Duplicate" icon={<Copy className="h-4 w-4" />} loading={actionLoading} onClick={handleAction} variant="outline" />
                    {!['sent', 'cancelled', 'failed'].includes(campaign.status) && (
                        <ActionButton action="cancel" label="Cancel" icon={<X className="h-4 w-4" />} loading={actionLoading} onClick={handleAction} variant="outline" />
                    )}
                    {campaign.threadId && (
                        <Button variant="outline" onClick={() => router.push(`/dashboard/inbox?thread=${campaign.threadId}`)}>
                            <Bot className="h-4 w-4 mr-2" />
                            Chat Thread
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Tabbed content */}
                <div className="lg:col-span-2">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            {isSendingOrSent && <TabsTrigger value="performance">Performance</TabsTrigger>}
                            {isSendingOrSent && <TabsTrigger value="audience">Audience</TabsTrigger>}
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6 mt-4">
                            {/* Campaign Details */}
                            <Card>
                                <CardHeader><CardTitle>Campaign Details</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InfoRow label="Goal" value={goalInfo?.label || campaign.goal} />
                                        <InfoRow label="Channels" value={
                                            <div className="flex gap-1">
                                                {campaign.channels.map(ch => (
                                                    <Badge key={ch} variant="outline">
                                                        {ch === 'email' ? <Mail className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                                                        {ch.toUpperCase()}
                                                    </Badge>
                                                ))}
                                            </div>
                                        } />
                                        <InfoRow label="Audience" value={
                                            campaign.audience.type === 'all'
                                                ? 'All customers'
                                                : campaign.audience.segments?.map(s => getSegmentInfo(s).label).join(', ') || 'Custom'
                                        } />
                                        <InfoRow label="Recipients" value={`${campaign.audience.resolvedCount || campaign.audience.estimatedCount}`} />
                                        <InfoRow label="Created" value={new Date(campaign.createdAt).toLocaleString()} />
                                        {campaign.scheduledAt && (
                                            <InfoRow label="Scheduled" value={new Date(campaign.scheduledAt).toLocaleString()} />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Content Preview */}
                            <Card>
                                <CardHeader><CardTitle>Content</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    {campaign.channels.map(ch => {
                                        const content = campaign.content[ch];
                                        if (!content) return null;
                                        return (
                                            <div key={ch} className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    {ch === 'email' ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                                                    <span className="font-medium">{ch.toUpperCase()}</span>
                                                    {content.complianceStatus && <ComplianceBadge status={content.complianceStatus} />}
                                                </div>
                                                {content.subject && (
                                                    <p className="text-sm"><strong>Subject:</strong> {content.subject}</p>
                                                )}
                                                {content.htmlBody ? (
                                                    <div className="border rounded-md overflow-hidden">
                                                        <iframe
                                                            srcDoc={content.htmlBody}
                                                            className="w-full h-[300px] bg-white"
                                                            sandbox="allow-same-origin"
                                                            title={`${ch} preview`}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="bg-muted rounded-md p-3">
                                                        <p className="text-sm whitespace-pre-line">{content.body}</p>
                                                    </div>
                                                )}
                                                {content.complianceViolations && content.complianceViolations.length > 0 && (
                                                    <Alert variant="destructive">
                                                        <AlertTriangle className="h-4 w-4" />
                                                        <AlertDescription>
                                                            <ul className="list-disc pl-4 space-y-1">
                                                                {content.complianceViolations.map((v, i) => (
                                                                    <li key={i} className="text-sm">{v}</li>
                                                                ))}
                                                            </ul>
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                                <Separator />
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {isSendingOrSent && (
                            <TabsContent value="performance" className="space-y-6 mt-4">
                                <PerformanceSection campaign={campaign} />
                            </TabsContent>
                        )}

                        {isSendingOrSent && (
                            <TabsContent value="audience" className="mt-4">
                                <AudienceSection
                                    recipients={recipients}
                                    total={recipientTotal}
                                    loading={recipientsLoading}
                                    campaign={campaign}
                                />
                            </TabsContent>
                        )}
                    </Tabs>
                </div>

                {/* Right: Quick metrics + Timeline */}
                <div className="space-y-6">
                    {/* Quick Metrics */}
                    {perf && isSendingOrSent ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4" />
                                    Performance
                                </CardTitle>
                                {perf?.lastUpdated && (
                                    <CardDescription>
                                        Updated {new Date(perf.lastUpdated).toLocaleString()}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <MetricRow label="Sent" value={perf?.sent ?? 0} />
                                <MetricRow label="Delivered" value={perf?.delivered ?? perf?.sent ?? 0} />
                                <MetricRow label="Opens" value={perf?.opened ?? 0} rate={perf?.openRate} />
                                <MetricRow label="Clicks" value={perf?.clicked ?? 0} rate={perf?.clickRate} />
                                <MetricRow label="Bounced" value={perf?.bounced ?? 0} />
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Revenue</span>
                                    <span className="text-lg font-bold text-green-600">
                                        ${(perf?.revenue ?? 0).toLocaleString()}
                                    </span>
                                </div>
                                {campaign.status === 'sending' && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Auto-refreshing every 15s
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <BarChart3 className="h-8 w-8 text-muted-foreground/50 mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    Performance data will appear after the campaign is sent.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Timeline */}
                    <Card>
                        <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <TimelineItem label="Created" date={campaign.createdAt} agent={campaign.createdByAgent} />
                            {campaign.complianceReviewedAt && <TimelineItem label="Compliance Reviewed" date={campaign.complianceReviewedAt} />}
                            {campaign.approvedAt && <TimelineItem label="Approved" date={campaign.approvedAt} />}
                            {campaign.scheduledAt && <TimelineItem label="Scheduled" date={campaign.scheduledAt} />}
                            {campaign.sentAt && <TimelineItem label="Sent" date={campaign.sentAt} />}
                            {campaign.completedAt && <TimelineItem label="Completed" date={campaign.completedAt} />}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// PERFORMANCE SECTION (full tab view)
// =============================================================================

function PerformanceSection({ campaign }: { campaign: Campaign }) {
    const perf = campaign.performance;
    if (!perf) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Waiting for performance data...</p>
                </CardContent>
            </Card>
        );
    }

    const sent = perf?.sent ?? 0;
    const delivered = perf?.delivered ?? sent;
    const opened = perf?.opened ?? 0;
    const clicked = perf?.clicked ?? 0;
    const bounced = perf?.bounced ?? 0;

    const deliveredPct = sent > 0 ? (delivered / sent) * 100 : 0;
    const openedPct = sent > 0 ? (opened / sent) * 100 : 0;
    const clickedPct = sent > 0 ? (clicked / sent) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Health + Summary */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Campaign Health
                        </CardTitle>
                        <HealthBadge perf={perf} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                        <StatTile label="Sent" value={sent} />
                        <StatTile label="Delivered" value={delivered} rate={deliveredPct} />
                        <StatTile label="Opens" value={opened} rate={perf.openRate} color="text-blue-600" />
                        <StatTile label="Clicks" value={clicked} rate={perf.clickRate} color="text-emerald-600" />
                        <StatTile label="Bounced" value={bounced} rate={perf.bounceRate} color="text-red-500" />
                        <StatTile label="Revenue" value={`$${(perf.revenue ?? 0).toLocaleString()}`} color="text-green-600" />
                    </div>
                </CardContent>
            </Card>

            {/* Delivery Funnel */}
            <Card>
                <CardHeader><CardTitle>Delivery Funnel</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <FunnelBar label="Sent" value={sent} total={sent} color="bg-purple-500" />
                    <FunnelBar label="Delivered" value={delivered} total={sent} color="bg-blue-500" />
                    <FunnelBar label="Opened" value={opened} total={sent} color="bg-green-500" />
                    <FunnelBar label="Clicked" value={clicked} total={sent} color="bg-emerald-500" />
                </CardContent>
            </Card>
        </div>
    );
}

// =============================================================================
// AUDIENCE SECTION (tab view)
// =============================================================================

function AudienceSection({ recipients, total, loading, campaign }: {
    recipients: CampaignRecipient[];
    total: number;
    loading: boolean;
    campaign: Campaign;
}) {
    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    const statusCounts = recipients.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
    }, {});

    const segmentCounts = recipients.reduce<Record<string, number>>((acc, r) => {
        const seg = r.segment || 'unknown';
        acc[seg] = (acc[seg] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Recipients ({total})
                    </CardTitle>
                    <CardDescription>
                        {campaign.audience.type === 'all' ? 'All customers' :
                            campaign.audience.segments?.map(s => getSegmentInfo(s).label).join(', ') || 'Custom audience'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Segment breakdown */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {Object.entries(segmentCounts).map(([seg, count]) => (
                            <Badge key={seg} variant="outline">{seg}: {count}</Badge>
                        ))}
                    </div>

                    {/* Status breakdown */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {Object.entries(statusCounts).map(([status, count]) => (
                            <Badge key={status} className={recipientStatusColor(status)} variant="secondary">
                                {status}: {count}
                            </Badge>
                        ))}
                    </div>

                    {/* Recipient table */}
                    {recipients.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-2 font-medium">Name</th>
                                        <th className="pb-2 font-medium">Email</th>
                                        <th className="pb-2 font-medium">Segment</th>
                                        <th className="pb-2 font-medium">Status</th>
                                        <th className="pb-2 font-medium">Sent</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recipients.map(r => (
                                        <tr key={r.id} className="border-b last:border-0">
                                            <td className="py-2">{r.firstName || '—'}</td>
                                            <td className="py-2 text-muted-foreground">{r.email}</td>
                                            <td className="py-2">
                                                <Badge variant="outline" className="text-xs">{r.segment || '—'}</Badge>
                                            </td>
                                            <td className="py-2">
                                                <Badge className={recipientStatusColor(r.status)} variant="secondary">
                                                    {r.status}
                                                </Badge>
                                            </td>
                                            <td className="py-2 text-muted-foreground text-xs">
                                                {r.sentAt ? new Date(r.sentAt).toLocaleString() : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No recipient records yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function ActionButton({ action, label, icon, loading, onClick, variant = 'default' }: {
    action: string;
    label: string;
    icon: React.ReactNode;
    loading: string | null;
    onClick: (action: string) => void;
    variant?: 'default' | 'outline';
}) {
    return (
        <Button
            variant={variant}
            onClick={() => onClick(action)}
            disabled={loading !== null}
        >
            {loading === action ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <span className="mr-2">{icon}</span>}
            {label}
        </Button>
    );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="text-sm font-medium">{value}</div>
        </div>
    );
}

function MetricRow({ label, value, rate }: { label: string; value: number; rate?: number }) {
    const safeValue = value ?? 0;
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{label}</span>
            <div className="flex items-center gap-2">
                <span className="font-medium">{safeValue.toLocaleString()}</span>
                {rate != null && (
                    <span className="text-xs text-muted-foreground">({rate.toFixed(1)}%)</span>
                )}
            </div>
        </div>
    );
}

function StatTile({ label, value, rate, color }: {
    label: string;
    value: number | string;
    rate?: number;
    color?: string;
}) {
    return (
        <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-lg font-bold ${color || ''}`}>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {rate !== undefined && (
                <p className="text-xs text-muted-foreground">{rate.toFixed(1)}%</p>
            )}
        </div>
    );
}

function FunnelBar({ label, value, total, color }: {
    label: string;
    value: number;
    total: number;
    color: string;
}) {
    const safeValue = value ?? 0;
    const safeTotal = total ?? 0;
    const pct = safeTotal > 0 ? (safeValue / safeTotal) * 100 : 0;
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <span>{label}</span>
                <span className="font-medium">{safeValue.toLocaleString()} ({pct.toFixed(1)}%)</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function HealthBadge({ perf }: { perf: { bounceRate?: number; openRate?: number; sent?: number } }) {
    const bounceRate = perf.bounceRate ?? 0;
    const openRate = perf.openRate ?? 0;
    const sent = perf.sent ?? 0;

    if (sent === 0) return null;

    if (bounceRate > 10 || openRate < 10) {
        return <Badge className="bg-red-100 text-red-800" variant="secondary">At Risk</Badge>;
    }
    if (bounceRate > 5 || openRate < 15) {
        return <Badge className="bg-yellow-100 text-yellow-800" variant="secondary">Needs Attention</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800" variant="secondary">Healthy</Badge>;
}

function ComplianceBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        passed: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800',
        warning: 'bg-yellow-100 text-yellow-800',
        pending: 'bg-gray-100 text-gray-800',
    };
    return <Badge className={colors[status] || colors.pending} variant="secondary">{status}</Badge>;
}

function TimelineItem({ label, date, agent }: { label: string; date: Date; agent?: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
            <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">
                    {new Date(date).toLocaleString()}
                    {agent && ` by ${agent}`}
                </p>
            </div>
        </div>
    );
}

function recipientStatusColor(status: string): string {
    const colors: Record<string, string> = {
        sent: 'bg-blue-100 text-blue-800',
        delivered: 'bg-green-100 text-green-800',
        opened: 'bg-emerald-100 text-emerald-800',
        clicked: 'bg-purple-100 text-purple-800',
        bounced: 'bg-red-100 text-red-800',
        failed: 'bg-red-100 text-red-800',
        pending: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || colors.pending;
}
