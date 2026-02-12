'use client';

/**
 * SegmentSummaryCard
 *
 * Compact segment distribution card for inline chat rendering.
 * Parses segment summary markers from agent responses.
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SegmentData {
    segment: string;
    count: number;
    avgSpend: number;
    avgLTV: number;
}

interface SegmentSummary {
    totalCustomers: number;
    segments: SegmentData[];
}

const SEGMENT_COLORS: Record<string, string> = {
    vip: 'bg-purple-500',
    loyal: 'bg-green-500',
    new: 'bg-blue-500',
    at_risk: 'bg-red-500',
    slipping: 'bg-orange-500',
    churned: 'bg-gray-400',
    high_value: 'bg-yellow-500',
    frequent: 'bg-teal-500',
};

const SEGMENT_LABELS: Record<string, string> = {
    vip: 'VIP',
    loyal: 'Loyal',
    new: 'New',
    at_risk: 'At Risk',
    slipping: 'Slipping',
    churned: 'Churned',
    high_value: 'High Value',
    frequent: 'Frequent',
};

export function SegmentSummaryCard({ data }: { data: SegmentSummary }) {
    const maxCount = Math.max(...data.segments.map(s => s.count), 1);

    return (
        <div className="rounded-lg border bg-card p-3 my-2 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Customer Segments</p>
                <Badge variant="secondary" className="text-xs">
                    {data.totalCustomers.toLocaleString()} total
                </Badge>
            </div>

            <div className="space-y-1.5">
                {data.segments.map((seg) => {
                    const pct = data.totalCustomers > 0
                        ? ((seg.count / data.totalCustomers) * 100).toFixed(0)
                        : '0';
                    const barWidth = maxCount > 0 ? (seg.count / maxCount) * 100 : 0;

                    return (
                        <div key={seg.segment} className="flex items-center gap-2 text-xs">
                            <span className="w-16 truncate text-muted-foreground">
                                {SEGMENT_LABELS[seg.segment] || seg.segment}
                            </span>
                            <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden relative">
                                <div
                                    className={cn(
                                        'h-full rounded-sm transition-all',
                                        SEGMENT_COLORS[seg.segment] || 'bg-gray-400'
                                    )}
                                    style={{ width: `${barWidth}%` }}
                                />
                                <span className="absolute right-1 top-0 h-full flex items-center text-[10px] text-muted-foreground">
                                    {seg.count} ({pct}%)
                                </span>
                            </div>
                            <span className="w-16 text-right text-muted-foreground">
                                ${seg.avgSpend.toFixed(0)} avg
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Parse CRM segment markers from message content.
 * Pattern: :::crm:segments:Title\n{json}\n:::
 */
export const CRM_SEGMENT_PATTERN = /:::crm:segments:([^\n]+)\n([\s\S]*?):::/g;

export function parseCrmSegments(content: string): { segments: SegmentSummary[]; cleanedContent: string } {
    const segments: SegmentSummary[] = [];
    const cleanedContent = content.replace(CRM_SEGMENT_PATTERN, (_match, _title, jsonStr) => {
        try {
            const data = JSON.parse(jsonStr.trim());
            segments.push(data);
        } catch {
            // Invalid JSON, skip
        }
        return '';
    });

    return { segments, cleanedContent: cleanedContent.trim() };
}
