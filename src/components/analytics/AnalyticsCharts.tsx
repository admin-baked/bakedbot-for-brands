'use client';

import { useMemo } from 'react';

interface DailyViewsChartProps {
    dailyViews: Record<string, number>;
    days?: number;
}

/**
 * Simple bar chart for daily views
 * Uses pure CSS/SVG, no external chart library required
 */
export function DailyViewsChart({ dailyViews, days = 14 }: DailyViewsChartProps) {
    const chartData = useMemo(() => {
        const result: Array<{ date: string; views: number; label: string }> = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().slice(0, 10);
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            result.push({
                date: dateStr,
                views: dailyViews[dateStr] || 0,
                label
            });
        }

        return result;
    }, [dailyViews, days]);

    const maxViews = Math.max(...chartData.map(d => d.views), 1);

    if (chartData.every(d => d.views === 0)) {
        return (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                No data for the selected period
            </div>
        );
    }

    return (
        <div className="h-40">
            <div className="flex h-full items-end gap-1">
                {chartData.map((day, idx) => {
                    const height = (day.views / maxViews) * 100;
                    return (
                        <div
                            key={day.date}
                            className="flex-1 flex flex-col items-center gap-1"
                        >
                            <div className="relative w-full flex-1 flex items-end">
                                <div
                                    className="w-full bg-primary/80 rounded-t transition-all duration-300 hover:bg-primary group relative"
                                    style={{ height: `${Math.max(height, 2)}%` }}
                                >
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                        <div className="bg-popover text-popover-foreground text-xs rounded px-2 py-1 shadow-md whitespace-nowrap">
                                            <span className="font-medium">{day.views}</span> views
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Show label every few bars */}
                            {(idx % 3 === 0 || idx === chartData.length - 1) && (
                                <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                                    {day.label}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface TopItemsListProps {
    items: Record<string, number>;
    label: string;
    maxItems?: number;
}

/**
 * Simple list showing top items with counts
 */
export function TopItemsList({ items, label, maxItems = 5 }: TopItemsListProps) {
    const sortedItems = useMemo(() => {
        return Object.entries(items)
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxItems);
    }, [items, maxItems]);

    if (sortedItems.length === 0) {
        return (
            <div className="text-sm text-muted-foreground">
                No {label.toLowerCase()} data yet
            </div>
        );
    }

    const maxCount = sortedItems[0][1];

    return (
        <div className="space-y-3">
            {sortedItems.map(([name, count]) => {
                const percentage = (count / maxCount) * 100;
                return (
                    <div key={name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium truncate">{name}</span>
                            <span className="text-muted-foreground">{count.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary/60 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

interface MetricCardProps {
    title: string;
    value: string | number;
    change?: number;
    icon?: React.ReactNode;
}

/**
 * Simple metric display card
 */
export function MetricCard({ title, value, change, icon }: MetricCardProps) {
    return (
        <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{title}</span>
                {icon}
            </div>
            <div className="mt-2">
                <span className="text-2xl font-bold">{value}</span>
                {change !== undefined && (
                    <span className={`ml-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change >= 0 ? '+' : ''}{change}%
                    </span>
                )}
            </div>
        </div>
    );
}
