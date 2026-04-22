'use client';

/**
 * Check-In Management Page
 *
 * /dashboard/dispensary/checkin (dispensary_admin / super_user)
 *
 * Three panels:
 *  1. Live stats — today/week/month counts, consent rates, mood heatmap
 *  2. Recent visits feed — last 25 check-ins with name, source, review status
 *  3. Settings — gmapsPlaceId, offer copy, headline, kill switches, idle timeout
 */

import { useEffect, useState, useCallback } from 'react';
import { ClipboardCheck, ExternalLink, Loader2, QrCode, Send, Tablet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { CheckInStatsPanel } from '@/components/dashboard/checkin/checkin-stats-panel';
import { CheckInVisitFeed } from '@/components/dashboard/checkin/checkin-visit-feed';
import { CheckInSettingsPanel } from '@/components/dashboard/checkin/checkin-settings-panel';
import { BudtenderClockInCard } from '@/components/checkin/budtender-clock-in';
import { KioskOrderNotifications } from '@/components/dashboard/checkin/kiosk-order-notifications';
import {
    DEFAULT_CHECKIN_CONFIG,
    type CheckinConfig,
    type CheckinStats,
    type CheckinVisitRow,
} from '@/lib/checkin/checkin-management-shared';
import {
    getCheckinConfig,
    getCheckinStats,
    getRecentCheckinVisits,
    postCheckinBriefingToInbox,
} from '@/server/actions/checkin-management';

export default function CheckInManagementPage() {
    const { dispensaryId, loading: idLoading } = useDispensaryId();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [postingBriefing, setPostingBriefing] = useState(false);

    const [config, setConfig] = useState<CheckinConfig>(DEFAULT_CHECKIN_CONFIG);
    const [stats, setStats] = useState<CheckinStats | null>(null);
    const [visits, setVisits] = useState<CheckinVisitRow[]>([]);

    const load = useCallback(async (orgId: string, isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [configResult, statsResult, visitsResult] = await Promise.all([
                getCheckinConfig(orgId),
                getCheckinStats(orgId),
                getRecentCheckinVisits(orgId),
            ]);

            if (configResult.success) setConfig(configResult.config);
            if (statsResult.success && statsResult.stats) setStats(statsResult.stats);
            if (visitsResult.success && visitsResult.visits) setVisits(visitsResult.visits);
        } finally {
            if (isRefresh) setRefreshing(false);
            else setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (dispensaryId) load(dispensaryId);
        else if (!idLoading) setLoading(false);
    }, [dispensaryId, idLoading, load]);

    const handleRefresh = () => {
        if (dispensaryId) load(dispensaryId, true);
    };

    const handlePostBriefing = async () => {
        if (!dispensaryId) return;
        setPostingBriefing(true);
        const result = await postCheckinBriefingToInbox(dispensaryId);
        setPostingBriefing(false);
        if (result.success) {
            toast({
                title: 'Briefing posted',
                description: 'Check-in briefing card added to your Daily Briefing inbox thread.',
            });
        } else {
            toast({ title: 'Failed', description: result.error, variant: 'destructive' });
        }
    };

    if (idLoading || (loading && dispensaryId)) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const orgDisplayName = dispensaryId
        ? dispensaryId.replace(/^org_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : '';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-emerald-600" />
                        <h2 className="text-xl font-semibold">Check-In Manager</h2>
                        <Badge variant="outline" className="text-xs">{orgDisplayName}</Badge>
                        {config.publicFlowEnabled ? (
                            <Badge className="text-xs bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Live</Badge>
                        ) : (
                            <Badge className="text-xs bg-red-500/15 text-red-700 border-red-500/30">Paused</Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Two check-in modes: self-service tablet for customers, or staff quick check-in at the register.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {dispensaryId && <KioskOrderNotifications orgId={dispensaryId} />}
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={handlePostBriefing}
                        disabled={postingBriefing}
                    >
                        {postingBriefing
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Send className="h-3.5 w-3.5" />}
                        Post to Inbox
                    </Button>
                </div>
            </div>

            {/* Launch Modes */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="relative rounded-xl border bg-card p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                            <Tablet className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold">Self-Service Tablet</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Customer checks in on the iPad. Name, phone, mood picks, and Smokey AI recommendations.
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">Best for: browsing customers, normal pace</p>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => window.open(`/loyalty-tablet?orgId=${dispensaryId}`, '_blank', 'noopener')}
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Launch Tablet
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open('/dashboard/loyalty-tablet-qr', '_blank', 'noopener')}
                        >
                            <QrCode className="h-3.5 w-3.5 mr-1" />
                            QR Code
                        </Button>
                    </div>
                </div>

                <div className="relative rounded-xl border bg-card p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                            <ClipboardCheck className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold">Staff Quick Check-In</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Staff checks customer in at the register. Name + phone lookup only &mdash; 30 seconds.
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">Best for: busy periods, rush hour</p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => {
                                const slug = dispensaryId?.replace(/^org_/, '').replace(/_/g, '-') || '';
                                window.open(`/${slug}/rewards`, '_blank', 'noopener');
                            }}
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Launch Staff Check-In
                        </Button>
                    </div>
                </div>
            </div>

            {/* Two-column layout on large screens */}
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                {/* Left: budtender card + stats + feed */}
                <div className="space-y-6">
                    {dispensaryId && (
                        <BudtenderClockInCard orgId={dispensaryId} />
                    )}

                    {stats ? (
                        <CheckInStatsPanel
                            stats={stats}
                            orgId={dispensaryId!}
                            onRefresh={handleRefresh}
                            refreshing={refreshing}
                        />
                    ) : (
                        <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground text-sm">
                            No check-in stats available yet.
                        </div>
                    )}

                    <CheckInVisitFeed
                        orgId={dispensaryId!}
                        visits={visits}
                        onRefresh={handleRefresh}
                        refreshing={refreshing}
                    />
                </div>

                {/* Right: settings */}
                {dispensaryId && (
                    <CheckInSettingsPanel
                        orgId={dispensaryId}
                        orgName={orgDisplayName}
                        initial={config}
                    />
                )}
            </div>
        </div>
    );
}
