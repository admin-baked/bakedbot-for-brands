'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Mail, MessageSquare, Users, MoreHorizontal, Play, Pause,
    Trash2, Eye, Clock, CheckCircle, Shield, Send, Sparkles, Copy, RotateCcw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Campaign } from '@/types/campaign';
import { CAMPAIGN_STATUS_INFO, CAMPAIGN_GOALS } from '@/types/campaign';
import {
    cancelCampaign, pauseCampaign, approveCampaign,
    submitForComplianceReview, resumeCampaign, duplicateCampaign,
} from '@/server/actions/campaigns';

interface CampaignCardProps {
    campaign: Campaign;
    onRefresh: () => void;
}

export function CampaignCard({ campaign, onRefresh }: CampaignCardProps) {
    const router = useRouter();
    const [showPreview, setShowPreview] = useState(false);
    const statusInfo = CAMPAIGN_STATUS_INFO[campaign.status] ?? { label: campaign.status, color: 'bg-gray-100 text-gray-800', description: '' };
    const goalInfo = CAMPAIGN_GOALS.find(g => g.id === campaign.goal);
    const emailContent = campaign.content?.email;

    const handleAction = async (action: string) => {
        switch (action) {
            case 'approve':
                await approveCampaign(campaign.id, 'manual');
                break;
            case 'compliance':
                await submitForComplianceReview(campaign.id);
                break;
            case 'pause':
                await pauseCampaign(campaign.id);
                break;
            case 'resume':
                await resumeCampaign(campaign.id);
                break;
            case 'cancel':
                await cancelCampaign(campaign.id);
                break;
            case 'duplicate': {
                const clone = await duplicateCampaign(campaign.id);
                if (clone) router.push(`/dashboard/campaigns/${clone.id}`);
                return;
            }
        }
        onRefresh();
    };

    return (
        <Card
            className="cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    {/* Left: Name, goal, channels */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{campaign.name}</h3>
                            <Badge className={statusInfo.color} variant="secondary">
                                {statusInfo.label}
                            </Badge>
                            {campaign.performance && campaign.performance.sent > 0 && (
                                <HealthDot perf={campaign.performance} />
                            )}
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                            {goalInfo?.label || campaign.goal}
                            {campaign.description && ` — ${campaign.description}`}
                        </p>

                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {/* Channels */}
                            <div className="flex items-center gap-1">
                                {campaign.channels?.includes('email') && (
                                    <Mail className="h-3.5 w-3.5" />
                                )}
                                {campaign.channels?.includes('sms') && (
                                    <MessageSquare className="h-3.5 w-3.5" />
                                )}
                            </div>

                            {/* Audience */}
                            <div className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                <span>
                                    {campaign.audience?.resolvedCount || campaign.audience?.estimatedCount} recipients
                                </span>
                            </div>

                            {/* Scheduled time */}
                            {campaign.scheduledAt && (
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>
                                        {new Date(campaign.scheduledAt).toLocaleDateString(undefined, {
                                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            )}

                            {/* Date */}
                            <span>
                                {new Date(campaign.createdAt).toLocaleDateString(undefined, {
                                    month: 'short', day: 'numeric',
                                })}
                            </span>
                        </div>
                    </div>

                    {/* Right: Performance mini-metrics (if sent) */}
                    {campaign.performance && campaign.performance.sent > 0 && (
                        <div className="hidden md:flex items-center gap-4 text-sm">
                            <div className="text-center">
                                <p className="text-muted-foreground">Sent</p>
                                <p className="font-semibold">{campaign.performance.sent}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-muted-foreground">Opens</p>
                                <p className="font-semibold">{campaign.performance.openRate.toFixed(1)}%</p>
                            </div>
                            <div className="text-center">
                                <p className="text-muted-foreground">Clicks</p>
                                <p className="font-semibold">{campaign.performance.clickRate.toFixed(1)}%</p>
                            </div>
                        </div>
                    )}

                    {/* Actions dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                            </DropdownMenuItem>

                            {campaign.status === 'draft' && (
                                <DropdownMenuItem onClick={() => handleAction('compliance')}>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Submit for Review
                                </DropdownMenuItem>
                            )}

                            {campaign.status === 'pending_approval' && (
                                <DropdownMenuItem onClick={() => handleAction('approve')}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                </DropdownMenuItem>
                            )}

                            {campaign.status === 'sending' && (
                                <DropdownMenuItem onClick={() => handleAction('pause')}>
                                    <Pause className="h-4 w-4 mr-2" />
                                    Pause
                                </DropdownMenuItem>
                            )}

                            {campaign.status === 'paused' && (
                                <DropdownMenuItem onClick={() => handleAction('resume')}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Resume Sending
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuItem onClick={() => handleAction('duplicate')}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                            </DropdownMenuItem>

                            {emailContent?.htmlBody && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setShowPreview(true)}>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Preview Email
                                    </DropdownMenuItem>
                                </>
                            )}

                            {!['sent', 'cancelled', 'failed', 'sending'].includes(campaign.status) && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => handleAction('cancel')}
                                        className="text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Cancel Campaign
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>

            {/* Email Preview Modal */}
            {showPreview && emailContent && (
                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Email Preview — {campaign.name}
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                <strong>Subject:</strong> {emailContent.subject}
                            </p>
                            {campaign.proofRecipients?.length && (
                                <p className="text-xs text-muted-foreground">
                                    Proof recipients: {campaign.proofRecipients.map(p => p.name || p.email).join(', ')}
                                </p>
                            )}
                        </DialogHeader>
                        <div className="flex-1 overflow-auto rounded border bg-white">
                            {emailContent.htmlBody ? (
                                <iframe
                                    srcDoc={emailContent.htmlBody}
                                    title="Email preview"
                                    className="w-full min-h-[500px] border-0"
                                    sandbox="allow-same-origin"
                                />
                            ) : (
                                <pre className="p-4 text-sm whitespace-pre-wrap font-sans">
                                    {emailContent.body}
                                </pre>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </Card>
    );
}

function HealthDot({ perf }: { perf: { bounceRate?: number; openRate?: number } }) {
    const bounceRate = perf.bounceRate ?? 0;
    const openRate = perf.openRate ?? 0;

    if (bounceRate > 10 || openRate < 10) {
        return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="At risk" />;
    }
    if (bounceRate > 5 || openRate < 20) {
        return <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" title="Needs attention" />;
    }
    return <span className="w-2 h-2 rounded-full bg-green-500 inline-block" title="Healthy" />;
}
