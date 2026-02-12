'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare, ExternalLink, Shield, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CAMPAIGN_GOALS, CAMPAIGN_STATUS_INFO, type CampaignStatus, type CampaignGoal } from '@/types/campaign';

// =============================================================================
// MARKER PARSING
// =============================================================================

const CAMPAIGN_DRAFT_PATTERN = /:::campaign:draft:([^\n]+)\n([\s\S]*?):::/g;
const CAMPAIGN_PERFORMANCE_PATTERN = /:::campaign:performance:([^\n]+)\n([\s\S]*?):::/g;

export interface CampaignDraftData {
    id: string;
    name: string;
    goal: string;
    channels: string[];
    segments?: string[];
    status: string;
}

export interface CampaignPerformanceData {
    id: string;
    name: string;
    sent?: number;
    opened?: number;
    clicked?: number;
    openRate?: number;
    clickRate?: number;
    revenue?: number;
}

export function parseCampaignDrafts(content: string): {
    drafts: CampaignDraftData[];
    cleanedContent: string;
} {
    const drafts: CampaignDraftData[] = [];
    const cleanedContent = content.replace(CAMPAIGN_DRAFT_PATTERN, (_, _name, json) => {
        try {
            const data = JSON.parse(json.trim());
            drafts.push(data);
        } catch {
            // Skip invalid JSON
        }
        return '';
    });
    return { drafts, cleanedContent: cleanedContent.trim() };
}

export function parseCampaignPerformance(content: string): {
    performances: CampaignPerformanceData[];
    cleanedContent: string;
} {
    const performances: CampaignPerformanceData[] = [];
    const cleanedContent = content.replace(CAMPAIGN_PERFORMANCE_PATTERN, (_, _name, json) => {
        try {
            const data = JSON.parse(json.trim());
            performances.push(data);
        } catch {
            // Skip invalid JSON
        }
        return '';
    });
    return { performances, cleanedContent: cleanedContent.trim() };
}

// =============================================================================
// DRAFT CARD
// =============================================================================

export function CampaignDraftCard({ data }: { data: CampaignDraftData }) {
    const router = useRouter();
    const goalInfo = CAMPAIGN_GOALS.find(g => g.id === data.goal);
    const statusInfo = CAMPAIGN_STATUS_INFO[data.status as CampaignStatus];

    return (
        <Card className="my-2 border-l-4 border-l-blue-500">
            <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{data.name}</span>
                            {statusInfo && (
                                <Badge className={statusInfo.color} variant="secondary">
                                    {statusInfo.label}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                            {goalInfo?.label || data.goal}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                {data.channels?.includes('email') && <Mail className="h-3 w-3" />}
                                {data.channels?.includes('sms') && <MessageSquare className="h-3 w-3" />}
                                {data.channels?.join(' + ').toUpperCase()}
                            </span>
                            {data.segments && data.segments.length > 0 && (
                                <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {data.segments.join(', ')}
                                </span>
                            )}
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/campaigns/${data.id}`);
                        }}
                    >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// =============================================================================
// PERFORMANCE CARD
// =============================================================================

export function CampaignPerformanceCard({ data }: { data: CampaignPerformanceData }) {
    const router = useRouter();

    return (
        <Card className="my-2 border-l-4 border-l-green-500">
            <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <span className="font-semibold text-sm">{data.name}</span>
                        <div className="grid grid-cols-4 gap-3 mt-2">
                            <Metric label="Sent" value={data.sent || 0} />
                            <Metric label="Opens" value={`${data.openRate?.toFixed(1) || 0}%`} />
                            <Metric label="Clicks" value={`${data.clickRate?.toFixed(1) || 0}%`} />
                            <Metric label="Revenue" value={`$${(data.revenue || 0).toLocaleString()}`} />
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/campaigns/${data.id}`);
                        }}
                    >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Details
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function Metric({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="text-center">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold">{value}</p>
        </div>
    );
}
