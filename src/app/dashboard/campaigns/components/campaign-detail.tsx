'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
    ArrowLeft, Shield, CheckCircle, Calendar, Send, Pause, X,
    Mail, MessageSquare, Users, Loader2, BarChart3, Clock,
    AlertTriangle, Bot,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    getCampaign, approveCampaign, scheduleCampaign,
    submitForComplianceReview, cancelCampaign, pauseCampaign,
} from '@/server/actions/campaigns';
import type { Campaign } from '@/types/campaign';
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

    useEffect(() => {
        loadCampaign();
    }, [campaignId]);

    async function loadCampaign() {
        setLoading(true);
        const data = await getCampaign(campaignId);
        setCampaign(data);
        setLoading(false);
    }

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
                case 'cancel':
                    await cancelCampaign(campaignId);
                    break;
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
                    </div>
                    {campaign.description && (
                        <p className="text-muted-foreground mt-1">{campaign.description}</p>
                    )}
                </div>

                {/* Actions based on status */}
                <div className="flex gap-2">
                    {campaign.status === 'draft' && (
                        <ActionButton
                            action="compliance"
                            label="Submit for Review"
                            icon={<Shield className="h-4 w-4" />}
                            loading={actionLoading}
                            onClick={handleAction}
                        />
                    )}
                    {campaign.status === 'pending_approval' && (
                        <ActionButton
                            action="approve"
                            label="Approve"
                            icon={<CheckCircle className="h-4 w-4" />}
                            loading={actionLoading}
                            onClick={handleAction}
                        />
                    )}
                    {campaign.status === 'approved' && (
                        <ActionButton
                            action="schedule_now"
                            label="Send Now"
                            icon={<Send className="h-4 w-4" />}
                            loading={actionLoading}
                            onClick={handleAction}
                        />
                    )}
                    {campaign.status === 'sending' && (
                        <ActionButton
                            action="pause"
                            label="Pause"
                            icon={<Pause className="h-4 w-4" />}
                            loading={actionLoading}
                            onClick={handleAction}
                            variant="outline"
                        />
                    )}
                    {!['sent', 'cancelled', 'failed'].includes(campaign.status) && (
                        <ActionButton
                            action="cancel"
                            label="Cancel"
                            icon={<X className="h-4 w-4" />}
                            loading={actionLoading}
                            onClick={handleAction}
                            variant="outline"
                        />
                    )}
                    {campaign.threadId && (
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/dashboard/inbox?thread=${campaign.threadId}`)}
                        >
                            <Bot className="h-4 w-4 mr-2" />
                            Chat Thread
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column: Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Overview */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Campaign Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <InfoRow label="Goal" value={goalInfo?.label || campaign.goal} />
                                <InfoRow
                                    label="Channels"
                                    value={
                                        <div className="flex gap-1">
                                            {campaign.channels.map(ch => (
                                                <Badge key={ch} variant="outline">
                                                    {ch === 'email' ? <Mail className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                                                    {ch.toUpperCase()}
                                                </Badge>
                                            ))}
                                        </div>
                                    }
                                />
                                <InfoRow
                                    label="Audience"
                                    value={
                                        campaign.audience.type === 'all'
                                            ? 'All customers'
                                            : campaign.audience.segments?.map(s => getSegmentInfo(s).label).join(', ') || 'Custom'
                                    }
                                />
                                <InfoRow
                                    label="Recipients"
                                    value={`${campaign.audience.resolvedCount || campaign.audience.estimatedCount}`}
                                />
                                <InfoRow
                                    label="Created"
                                    value={new Date(campaign.createdAt).toLocaleString()}
                                />
                                {campaign.scheduledAt && (
                                    <InfoRow
                                        label="Scheduled"
                                        value={new Date(campaign.scheduledAt).toLocaleString()}
                                    />
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Content Preview */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Content</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {campaign.channels.map(ch => {
                                const content = campaign.content[ch];
                                if (!content) return null;
                                return (
                                    <div key={ch} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            {ch === 'email' ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                                            <span className="font-medium">{ch.toUpperCase()}</span>
                                            {content.complianceStatus && (
                                                <ComplianceBadge status={content.complianceStatus} />
                                            )}
                                        </div>
                                        {content.subject && (
                                            <p className="text-sm"><strong>Subject:</strong> {content.subject}</p>
                                        )}
                                        <div className="bg-muted rounded-md p-3">
                                            <p className="text-sm whitespace-pre-line">{content.body}</p>
                                        </div>
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
                                        {content.complianceSuggestions && content.complianceSuggestions.length > 0 && (
                                            <div className="text-sm text-muted-foreground">
                                                <strong>Suggestions:</strong>
                                                <ul className="list-disc pl-4">
                                                    {content.complianceSuggestions.map((s, i) => (
                                                        <li key={i}>{s}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        <Separator />
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>

                {/* Right column: Performance */}
                <div className="space-y-6">
                    {campaign.performance && campaign.performance.sent > 0 ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Performance</CardTitle>
                                <CardDescription>
                                    Last updated {new Date(campaign.performance.lastUpdated).toLocaleString()}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <MetricRow label="Sent" value={campaign.performance.sent} />
                                <MetricRow label="Delivered" value={campaign.performance.delivered} />
                                <MetricRow
                                    label="Opens"
                                    value={campaign.performance.opened}
                                    rate={campaign.performance.openRate}
                                />
                                <MetricRow
                                    label="Clicks"
                                    value={campaign.performance.clicked}
                                    rate={campaign.performance.clickRate}
                                />
                                <MetricRow label="Bounced" value={campaign.performance.bounced} />
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Revenue</span>
                                    <span className="text-lg font-bold text-green-600">
                                        ${campaign.performance.revenue.toLocaleString()}
                                    </span>
                                </div>
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
                        <CardHeader>
                            <CardTitle>Timeline</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <TimelineItem
                                label="Created"
                                date={campaign.createdAt}
                                agent={campaign.createdByAgent}
                            />
                            {campaign.complianceReviewedAt && (
                                <TimelineItem label="Compliance Reviewed" date={campaign.complianceReviewedAt} />
                            )}
                            {campaign.approvedAt && (
                                <TimelineItem label="Approved" date={campaign.approvedAt} />
                            )}
                            {campaign.scheduledAt && (
                                <TimelineItem label="Scheduled" date={campaign.scheduledAt} />
                            )}
                            {campaign.sentAt && (
                                <TimelineItem label="Sent" date={campaign.sentAt} />
                            )}
                            {campaign.completedAt && (
                                <TimelineItem label="Completed" date={campaign.completedAt} />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
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
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{label}</span>
            <div className="flex items-center gap-2">
                <span className="font-medium">{value.toLocaleString()}</span>
                {rate !== undefined && (
                    <span className="text-xs text-muted-foreground">({rate.toFixed(1)}%)</span>
                )}
            </div>
        </div>
    );
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
