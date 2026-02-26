'use client';

/**
 * AnalyticsChartArtifact
 *
 * Renders an analytics chart artifact using Recharts.
 * Supports: bar, horizontal_bar, line, donut, stacked_bar, composed.
 * Benchmark reference line, insight text, and optional §280E disclaimer.
 */

import React from 'react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    ComposedChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine,
    ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { InboxArtifact, AnalyticsChart } from '@/types/inbox';

interface Props {
    artifact: InboxArtifact;
    className?: string;
}

const CHART_HEIGHT = 240;

export function AnalyticsChartArtifact({ artifact, className }: Props) {
    const data = artifact.data as AnalyticsChart;

    const sharedProps = {
        data: data.chartData as Record<string, unknown>[],
        margin: { top: 8, right: 16, left: 0, bottom: 8 },
    };

    const gridAndAxes = (
        <>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            {data.xAxisKey && (
                <XAxis
                    dataKey={data.xAxisKey}
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                    axisLine={false}
                    tickLine={false}
                />
            )}
            <YAxis
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                axisLine={false}
                tickLine={false}
                width={40}
            />
            <Tooltip
                contentStyle={{
                    background: '#1a1a2e',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    fontSize: 12,
                }}
            />
            <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
            {data.benchmark && (
                <ReferenceLine
                    y={data.benchmark.value}
                    stroke={data.benchmark.color}
                    strokeDasharray="4 4"
                    label={{
                        value: data.benchmark.label,
                        fill: data.benchmark.color,
                        fontSize: 10,
                        position: 'insideTopRight',
                    }}
                />
            )}
        </>
    );

    function renderChart() {
        switch (data.chartType) {
            case 'bar':
                return (
                    <BarChart {...sharedProps}>
                        {gridAndAxes}
                        {data.dataKeys.map((dk) => (
                            <Bar key={dk.key} dataKey={dk.key} name={dk.label} fill={dk.color} radius={[3, 3, 0, 0]} maxBarSize={48} />
                        ))}
                    </BarChart>
                );

            case 'horizontal_bar':
                return (
                    <BarChart layout="vertical" {...sharedProps} margin={{ ...sharedProps.margin, left: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey={data.xAxisKey ?? 'name'} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} axisLine={false} tickLine={false} width={80} />
                        <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        {data.benchmark && (
                            <ReferenceLine x={data.benchmark.value} stroke={data.benchmark.color} strokeDasharray="4 4" label={{ value: data.benchmark.label, fill: data.benchmark.color, fontSize: 10 }} />
                        )}
                        {data.dataKeys.map((dk) => (
                            <Bar key={dk.key} dataKey={dk.key} name={dk.label} fill={dk.color} radius={[0, 3, 3, 0]} maxBarSize={32} />
                        ))}
                    </BarChart>
                );

            case 'line':
                return (
                    <LineChart {...sharedProps}>
                        {gridAndAxes}
                        {data.dataKeys.map((dk) => (
                            <Line
                                key={dk.key}
                                type="monotone"
                                dataKey={dk.key}
                                name={dk.label}
                                stroke={dk.color}
                                strokeWidth={2}
                                dot={{ r: 3, fill: dk.color }}
                                activeDot={{ r: 5 }}
                            />
                        ))}
                    </LineChart>
                );

            case 'stacked_bar':
                return (
                    <BarChart {...sharedProps}>
                        {gridAndAxes}
                        {data.dataKeys.map((dk) => (
                            <Bar key={dk.key} dataKey={dk.key} name={dk.label} fill={dk.color} stackId="stack" maxBarSize={48} />
                        ))}
                    </BarChart>
                );

            case 'composed':
                return (
                    <ComposedChart {...sharedProps}>
                        {gridAndAxes}
                        {data.dataKeys.map((dk) =>
                            dk.type === 'line' ? (
                                <Line key={dk.key} type="monotone" dataKey={dk.key} name={dk.label} stroke={dk.color} strokeWidth={2} dot={false} />
                            ) : (
                                <Bar key={dk.key} dataKey={dk.key} name={dk.label} fill={dk.color} radius={[3, 3, 0, 0]} maxBarSize={48} />
                            )
                        )}
                    </ComposedChart>
                );

            case 'donut': {
                const allColors = data.dataKeys.map((dk) => dk.color);
                const donutKey = data.dataKeys[0]?.key ?? 'value';
                return (
                    <PieChart>
                        <Pie
                            data={data.chartData as { name: string; value: number }[]}
                            dataKey={donutKey}
                            nameKey="name"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                        >
                            {(data.chartData as { name: string; value: number }[]).map((entry, i) => (
                                <Cell key={`cell-${i}`} fill={allColors[i % allColors.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                );
            }

            default:
                return null;
        }
    }

    return (
        <div className={cn('space-y-3', className)}>
            {/* Title */}
            <div>
                <h3 className="font-semibold text-sm">{data.title}</h3>
                {data.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{data.description}</p>
                )}
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                {renderChart() ?? <div />}
            </ResponsiveContainer>

            {/* Insight */}
            <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3">
                {data.insight}
            </p>

            {/* Disclaimer */}
            {data.disclaimer && (
                <p className="text-xs text-muted-foreground italic opacity-70">{data.disclaimer}</p>
            )}
        </div>
    );
}
