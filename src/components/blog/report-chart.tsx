'use client';

/**
 * Report Chart Component
 *
 * Renders data visualizations for blog posts with contentType === 'report'.
 * Uses Recharts (already installed in the project).
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReportData, ReportMetric, ReportChartData } from '@/server/services/content-engine/report-generator';

const CHART_COLORS = ['#16a34a', '#2563eb', '#dc2626', '#ca8a04', '#9333ea', '#0891b2', '#ea580c', '#4f46e5'];

interface ReportChartProps {
    reportData: ReportData;
}

function MetricCard({ metric }: { metric: ReportMetric }) {
    const DeltaIcon = metric.deltaDirection === 'up' ? TrendingUp
        : metric.deltaDirection === 'down' ? TrendingDown
        : Minus;

    const deltaColor = metric.deltaDirection === 'up' ? 'text-green-600'
        : metric.deltaDirection === 'down' ? 'text-red-600'
        : 'text-muted-foreground';

    const formatValue = (val: number, unit: string) => {
        if (unit === '$') return `$${val.toLocaleString()}`;
        if (unit === '%') return `${val}%`;
        return val.toLocaleString();
    };

    return (
        <Card>
            <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                <p className="text-2xl font-bold">{formatValue(metric.value, metric.unit)}</p>
                {metric.delta !== undefined && (
                    <div className={`flex items-center gap-1 text-sm mt-1 ${deltaColor}`}>
                        <DeltaIcon className="w-3.5 h-3.5" />
                        <span>{metric.delta > 0 ? '+' : ''}{metric.delta}{metric.unit === '%' ? 'pp' : '%'}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ChartRenderer({ chart }: { chart: ReportChartData }) {
    // Transform data into Recharts format
    const data = chart.labels.map((label, i) => {
        const point: Record<string, string | number> = { name: label };
        for (const dataset of chart.datasets) {
            point[dataset.label] = dataset.data[i] || 0;
        }
        return point;
    });

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">{chart.title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        {chart.type === 'bar' ? (
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                {chart.datasets.map((dataset, i) => (
                                    <Bar
                                        key={dataset.label}
                                        dataKey={dataset.label}
                                        fill={dataset.color || CHART_COLORS[i % CHART_COLORS.length]}
                                        radius={[4, 4, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        ) : chart.type === 'line' ? (
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                {chart.datasets.map((dataset, i) => (
                                    <Line
                                        key={dataset.label}
                                        type="monotone"
                                        dataKey={dataset.label}
                                        stroke={dataset.color || CHART_COLORS[i % CHART_COLORS.length]}
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                    />
                                ))}
                            </LineChart>
                        ) : (
                            <PieChart>
                                <Pie
                                    data={data}
                                    dataKey={chart.datasets[0]?.label || 'value'}
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ name, value }) => `${name}: ${value}`}
                                >
                                    {data.map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export function ReportCharts({ reportData }: ReportChartProps) {
    return (
        <div className="space-y-8 my-8 not-prose">
            {/* Key Metrics */}
            {reportData.keyMetrics.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {reportData.keyMetrics.map((metric, i) => (
                            <MetricCard key={i} metric={metric} />
                        ))}
                    </div>
                </div>
            )}

            {/* Charts */}
            {reportData.charts.length > 0 && (
                <div className="grid md:grid-cols-2 gap-6">
                    {reportData.charts.map((chart, i) => (
                        <ChartRenderer key={i} chart={chart} />
                    ))}
                </div>
            )}

            {/* Data point count */}
            <p className="text-xs text-muted-foreground text-right">
                Based on {reportData.dataPoints} data points | Generated {new Date(reportData.generatedAt).toLocaleDateString()}
            </p>
        </div>
    );
}
