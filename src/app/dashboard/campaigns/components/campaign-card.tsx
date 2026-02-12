'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Mail, MessageSquare, Users, MoreHorizontal, Play, Pause,
    Trash2, Eye, Clock, CheckCircle, Shield, Send,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Campaign } from '@/types/campaign';
import { CAMPAIGN_STATUS_INFO, CAMPAIGN_GOALS } from '@/types/campaign';
import {
    cancelCampaign, pauseCampaign, approveCampaign,
    submitForComplianceReview,
} from '@/server/actions/campaigns';

interface CampaignCardProps {
    campaign: Campaign;
    onRefresh: () => void;
}

export function CampaignCard({ campaign, onRefresh }: CampaignCardProps) {
    const router = useRouter();
    const statusInfo = CAMPAIGN_STATUS_INFO[campaign.status];
    const goalInfo = CAMPAIGN_GOALS.find(g => g.id === campaign.goal);

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
            case 'cancel':
                await cancelCampaign(campaign.id);
                break;
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
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                            {goalInfo?.label || campaign.goal}
                            {campaign.description && ` — ${campaign.description}`}
                        </p>

                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {/* Channels */}
                            <div className="flex items-center gap-1">
                                {campaign.channels.includes('email') && (
                                    <Mail className="h-3.5 w-3.5" />
                                )}
                                {campaign.channels.includes('sms') && (
                                    <MessageSquare className="h-3.5 w-3.5" />
                                )}
                            </div>

                            {/* Audience */}
                            <div className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                <span>
                                    {campaign.audience.resolvedCount || campaign.audience.estimatedCount} recipients
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
        </Card>
    );
}
