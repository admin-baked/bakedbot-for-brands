'use client';

/**
 * CheckInVisitFeed
 *
 * Recent check-in visit table — shows up to 25 visits, paginated.
 * Columns: name, phone (last 4), time, source, mood, consent flags, review status.
 * Clicking a row opens CheckinCounterPanel — budtender + Smokey voice collaboration.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Clock, List, Mic, RefreshCw, Smartphone, Globe } from 'lucide-react';
import type { CheckinVisitRow } from '@/lib/checkin/checkin-management-shared';
import { MOOD_EMOJI } from '@/lib/checkin/loyalty-tablet-shared';
import { CheckinCounterPanel } from './checkin-counter-panel';

interface Props {
    orgId: string;
    visits: CheckinVisitRow[];
    onRefresh?: () => void;
    refreshing?: boolean;
}

const REVIEW_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending nudge', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
    sent: { label: 'Review sent', className: 'bg-green-500/15 text-green-600 border-green-500/30' },
    skipped_no_email: { label: 'No email', className: 'bg-muted text-muted-foreground' },
    blocked: { label: 'Blocked', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
    failed: { label: 'Failed', className: 'bg-red-500/15 text-red-600 border-red-500/30' },
    complete: { label: 'Complete', className: 'bg-green-500/15 text-green-600 border-green-500/30' },
    unknown: { label: '—', className: 'bg-muted text-muted-foreground' },
};

export function timeAgo(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ConsentIcon({ enabled, label }: { enabled: boolean; label: string }) {
    return (
        <span title={`${label}: ${enabled ? 'opted in' : 'opted out'}`}>
            {enabled
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 inline" />
                : <Circle className="h-3.5 w-3.5 text-muted-foreground/40 inline" />}
        </span>
    );
}

export function CheckInVisitFeed({ orgId, visits, onRefresh, refreshing }: Props) {
    const [selectedVisit, setSelectedVisit] = useState<CheckinVisitRow | null>(null);

    if (visits.length === 0) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                    No check-ins yet. Visits will appear here as customers check in.
                </CardContent>
            </Card>
        );
    }

    return (
        <>
        <CheckinCounterPanel
            orgId={orgId}
            visit={selectedVisit}
            onClose={() => setSelectedVisit(null)}
        />
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <List className="h-5 w-5 text-emerald-600" />
                        <CardTitle className="text-base">Recent Visits</CardTitle>
                        <Badge variant="outline" className="text-xs">{visits.length}</Badge>
                    </div>
                    {onRefresh && (
                        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={refreshing} className="h-7 gap-1.5">
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-xs text-muted-foreground">
                                <th className="px-4 py-2 text-left font-medium">Customer</th>
                                <th className="px-4 py-2 text-left font-medium">Time</th>
                                <th className="px-4 py-2 text-left font-medium">Source</th>
                                <th className="px-4 py-2 text-left font-medium">Mood</th>
                                <th className="px-4 py-2 text-center font-medium" title="SMS / Email consent">SMS / Email</th>
                                <th className="px-4 py-2 text-left font-medium">Review</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {visits.map(v => {
                                const reviewCfg = REVIEW_STATUS_CONFIG[v.reviewStatus] ?? REVIEW_STATUS_CONFIG.unknown;
                                return (
                                    <tr
                                        key={v.visitId}
                                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedVisit(v)}
                                    >
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium">{v.firstName}</span>
                                                <span className="text-muted-foreground text-xs">···{v.phoneLast4}</span>
                                                <Mic className="h-3 w-3 text-muted-foreground/40 group-hover:text-emerald-500 transition-colors ml-0.5" />
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-muted-foreground text-xs">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {timeAgo(v.visitedAt)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {v.source === 'loyalty_tablet_checkin' ? (
                                                <Badge variant="outline" className="text-xs gap-1 py-0">
                                                    <Smartphone className="h-2.5 w-2.5" /> Tablet
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs gap-1 py-0">
                                                    <Globe className="h-2.5 w-2.5" /> Web
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-sm">
                                            {v.mood ? (
                                                <span className="capitalize flex items-center gap-1">
                                                    {MOOD_EMOJI[v.mood] ?? '🌿'} {v.mood}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <ConsentIcon enabled={v.smsConsent} label="SMS" />
                                                <ConsentIcon enabled={v.emailConsent} label="Email" />
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <Badge
                                                variant="outline"
                                                className={`text-xs py-0 ${reviewCfg.className}`}
                                            >
                                                {reviewCfg.label}
                                            </Badge>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile card list */}
                <div className="md:hidden divide-y">
                    {visits.map(v => {
                        const reviewCfg = REVIEW_STATUS_CONFIG[v.reviewStatus] ?? REVIEW_STATUS_CONFIG.unknown;
                        return (
                            <div
                                key={v.visitId}
                                className="px-4 py-3 space-y-1.5 cursor-pointer hover:bg-muted/30 transition-colors active:bg-muted/50"
                                onClick={() => setSelectedVisit(v)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium text-sm">{v.firstName}</span>
                                        <span className="text-xs text-muted-foreground">···{v.phoneLast4}</span>
                                        <Mic className="h-3 w-3 text-emerald-500/60" />
                                    </div>
                                    <span className="text-xs text-muted-foreground">{timeAgo(v.visitedAt)}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {v.source === 'loyalty_tablet_checkin' ? (
                                        <Badge variant="outline" className="text-xs gap-1 py-0">
                                            <Smartphone className="h-2.5 w-2.5" /> Tablet
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs gap-1 py-0">
                                            <Globe className="h-2.5 w-2.5" /> Web
                                        </Badge>
                                    )}
                                    {v.mood && (
                                        <span className="text-xs capitalize">{MOOD_EMOJI[v.mood] ?? '🌿'} {v.mood}</span>
                                    )}
                                    <Badge variant="outline" className={`text-xs py-0 ${reviewCfg.className}`}>
                                        {reviewCfg.label}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <ConsentIcon enabled={v.smsConsent} label="SMS" />
                                    <span>SMS</span>
                                    <ConsentIcon enabled={v.emailConsent} label="Email" />
                                    <span>Email</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
        </>
    );
}
