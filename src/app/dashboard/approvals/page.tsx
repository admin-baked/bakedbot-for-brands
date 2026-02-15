'use client';



import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    CheckCircle, XCircle, Megaphone, FileText, Shield,
    Loader2, ExternalLink, Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    getCampaigns, approveCampaign, cancelCampaign,
    submitForComplianceReview,
} from '@/server/actions/campaigns';
import type { Campaign } from '@/types/campaign';
import { CAMPAIGN_STATUS_INFO, CAMPAIGN_GOALS } from '@/types/campaign';

export default function ApprovalsPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        loadPendingItems();
    }, []);

    async function loadPendingItems() {
        setLoading(true);
        try {
            const allCampaigns = await getCampaigns();
            setCampaigns(allCampaigns);
        } catch {
            // Handle error silently
        }
        setLoading(false);
    }

    const pendingApproval = campaigns.filter(c => c.status === 'pending_approval');
    const complianceReview = campaigns.filter(c => c.status === 'compliance_review');
    const pendingItems = [...pendingApproval, ...complianceReview];

    async function handleApprove(campaignId: string) {
        setActionLoading(campaignId);
        await approveCampaign(campaignId, 'manual');
        await loadPendingItems();
        setActionLoading(null);
    }

    async function handleReject(campaignId: string) {
        setActionLoading(campaignId);
        await cancelCampaign(campaignId);
        await loadPendingItems();
        setActionLoading(null);
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Approval Queue</h1>
                <p className="text-muted-foreground">
                    Review and approve pending campaigns and content
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Approval</p>
                                <p className="text-2xl font-bold">{pendingApproval.length}</p>
                            </div>
                            <Clock className="h-5 w-5 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Compliance Review</p>
                                <p className="text-2xl font-bold">{complianceReview.length}</p>
                            </div>
                            <Shield className="h-5 w-5 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Campaigns</p>
                                <p className="text-2xl font-bold">{campaigns.length}</p>
                            </div>
                            <Megaphone className="h-5 w-5 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="pending">
                <TabsList>
                    <TabsTrigger value="pending">
                        Pending Approval ({pendingApproval.length})
                    </TabsTrigger>
                    <TabsTrigger value="compliance">
                        Compliance Review ({complianceReview.length})
                    </TabsTrigger>
                    <TabsTrigger value="all">
                        All ({campaigns.length})
                    </TabsTrigger>
                </TabsList>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        <TabsContent value="pending">
                            {pendingApproval.length === 0 ? (
                                <EmptyQueue message="No campaigns pending approval" />
                            ) : (
                                <div className="space-y-3">
                                    {pendingApproval.map(campaign => (
                                        <ApprovalCard
                                            key={campaign.id}
                                            campaign={campaign}
                                            onApprove={() => handleApprove(campaign.id)}
                                            onReject={() => handleReject(campaign.id)}
                                            actionLoading={actionLoading}
                                            onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="compliance">
                            {complianceReview.length === 0 ? (
                                <EmptyQueue message="No campaigns in compliance review" />
                            ) : (
                                <div className="space-y-3">
                                    {complianceReview.map(campaign => (
                                        <ApprovalCard
                                            key={campaign.id}
                                            campaign={campaign}
                                            onReject={() => handleReject(campaign.id)}
                                            actionLoading={actionLoading}
                                            onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="all">
                            {campaigns.length === 0 ? (
                                <EmptyQueue message="No campaigns yet" />
                            ) : (
                                <div className="space-y-3">
                                    {campaigns.map(campaign => (
                                        <ApprovalCard
                                            key={campaign.id}
                                            campaign={campaign}
                                            onApprove={campaign.status === 'pending_approval' ? () => handleApprove(campaign.id) : undefined}
                                            onReject={!['sent', 'cancelled', 'failed'].includes(campaign.status) ? () => handleReject(campaign.id) : undefined}
                                            actionLoading={actionLoading}
                                            onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </div>
    );
}

// =============================================================================
// APPROVAL CARD
// =============================================================================

function ApprovalCard({ campaign, onApprove, onReject, actionLoading, onClick }: {
    campaign: Campaign;
    onApprove?: () => void;
    onReject?: () => void;
    actionLoading: string | null;
    onClick: () => void;
}) {
    const statusInfo = CAMPAIGN_STATUS_INFO[campaign.status];
    const goalInfo = CAMPAIGN_GOALS.find(g => g.id === campaign.goal);
    const isLoading = actionLoading === campaign.id;

    return (
        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={onClick}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Megaphone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{campaign.name}</span>
                            <Badge className={statusInfo.color} variant="secondary">
                                {statusInfo.label}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {goalInfo?.label || campaign.goal}
                            {campaign.description && ` — ${campaign.description}`}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>Channels: {campaign.channels.join(', ').toUpperCase()}</span>
                            <span>Recipients: {campaign.audience.estimatedCount}</span>
                            {campaign.createdByAgent && (
                                <span>Created by: {campaign.createdByAgent}</span>
                            )}
                            <span>
                                {new Date(campaign.createdAt).toLocaleDateString(undefined, {
                                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                                })}
                            </span>
                        </div>

                        {/* Compliance violations preview */}
                        {campaign.complianceStatus === 'failed' && (
                            <div className="mt-2 text-xs text-red-600">
                                Compliance failed — review content before approving.
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        {onApprove && (
                            <Button
                                size="sm"
                                onClick={onApprove}
                                disabled={isLoading}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                )}
                                Approve
                            </Button>
                        )}
                        {onReject && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onReject}
                                disabled={isLoading}
                            >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Reject
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => {}}>
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyQueue({ message }: { message: string }) {
    return (
        <Card className="border-dashed mt-4">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Clear</h3>
                <p className="text-sm text-muted-foreground">{message}</p>
            </CardContent>
        </Card>
    );
}
