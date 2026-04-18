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
import { Loader2, QrCode, Send } from 'lucide-react';
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-emerald-600" />
                        <h2 className="text-xl font-semibold">Check-In Manager</h2>
                        <Badge variant="outline" className="text-xs">Thrive Syracuse</Badge>
                        {config.publicFlowEnabled ? (
                            <Badge className="text-xs bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Live</Badge>
                        ) : (
                            <Badge className="text-xs bg-red-500/15 text-red-700 border-red-500/30">Paused</Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Manage the rewards page check-in flow, view visits, and configure settings.
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
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('/dashboard/loyalty-tablet-qr', '_blank', 'noopener')}
                    >
                        QR &amp; Training
                    </Button>
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
                        initial={config}
                    />
                )}
            </div>
        </div>
    );
}
