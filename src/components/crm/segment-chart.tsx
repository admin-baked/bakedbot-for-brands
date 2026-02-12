'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CustomerSegment, CRMStats } from '@/types/customers';
import { getSegmentInfo } from '@/types/customers';

interface SegmentChartProps {
    stats: CRMStats;
}

const SEGMENT_ORDER: CustomerSegment[] = [
    'vip', 'loyal', 'frequent', 'high_value', 'new', 'slipping', 'at_risk', 'churned',
];

export function SegmentChart({ stats }: SegmentChartProps) {
    const total = stats.totalCustomers || 1; // Avoid division by zero
    const breakdown = stats.segmentBreakdown;

    // Filter segments that have customers
    const activeSegments = SEGMENT_ORDER.filter(seg => breakdown[seg] > 0);

    if (activeSegments.length === 0) return null;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Segment Distribution</CardTitle>
                <CardDescription>{stats.totalCustomers} total customers</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Stacked bar */}
                <div className="flex h-6 w-full rounded-full overflow-hidden mb-4">
                    {activeSegments.map(seg => {
                        const count = breakdown[seg];
                        const pct = (count / total) * 100;
                        if (pct < 0.5) return null;
                        const info = getSegmentInfo(seg);
                        return (
                            <div
                                key={seg}
                                className={`${info.color} transition-all`}
                                style={{ width: `${pct}%` }}
                                title={`${info.label}: ${count} (${pct.toFixed(1)}%)`}
                            />
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {activeSegments.map(seg => {
                        const count = breakdown[seg];
                        const pct = ((count / total) * 100).toFixed(1);
                        const info = getSegmentInfo(seg);
                        return (
                            <div key={seg} className="flex items-center gap-2">
                                <Badge className={`${info.color} text-xs`}>{info.label}</Badge>
                                <span className="text-sm text-muted-foreground">
                                    {count} ({pct}%)
                                </span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
