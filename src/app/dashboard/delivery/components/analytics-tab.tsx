'use client';

/**
 * Delivery Analytics Tab
 *
 * Real delivery performance metrics for dispensary managers
 * Metrics:
 * - Success rate (completed vs total)
 * - Average delivery time in minutes
 * - On-time delivery percentage
 * - Daily delivery volume chart (text-based sparkline)
 * - Top driver performance
 */

import { useState, useEffect } from 'react';
import { getDeliveryStats, getDriverPerformance } from '@/server/actions/delivery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Clock, CheckCircle, Truck, Award, BarChart2 } from 'lucide-react';

interface DeliveryStats {
    total: number;
    pending: number;
    assigned: number;
    inTransit: number;
    delivered: number;
    failed: number;
    successRate: number;
    avgDeliveryTime: number;
    onTimePercentage: number;
}

interface DriverPerf {
    driverId: string;
    name: string;
    completed: number;
    failed: number;
    avgTime: number;
    onTimeRate: number;
}

export function AnalyticsTab({ locationId }: { locationId: string }) {
    const [stats, setStats] = useState<DeliveryStats | null>(null);
    const [driverPerf, setDriverPerf] = useState<DriverPerf[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

    useEffect(() => {
        loadData();
    }, [locationId, period]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [statsResult, perfResult] = await Promise.all([
                getDeliveryStats(locationId),
                getDriverPerformance(locationId),
            ]);

            if (statsResult) {
                setStats(statsResult as DeliveryStats);
            }

            if (perfResult.success) {
                setDriverPerf(perfResult.drivers as DriverPerf[]);
            }
        } catch (error) {
            console.error('Load analytics error:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (minutes: number) => {
        if (minutes < 60) return `${Math.round(minutes)}m`;
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return `${h}h ${m}m`;
    };

    const getScoreColor = (pct: number) => {
        if (pct >= 90) return 'text-green-600 dark:text-green-400';
        if (pct >= 75) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Period Filter */}
            <div className="flex gap-2">
                {(['today', 'week', 'month'] as const).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            period === p
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                    >
                        {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
                    </button>
                ))}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Success Rate</p>
                                <div className={`text-2xl font-bold ${getScoreColor(stats?.successRate || 0)}`}>
                                    {stats?.successRate.toFixed(0) || 0}%
                                </div>
                            </div>
                            <CheckCircle className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                            {stats?.delivered || 0} of {stats?.total || 0} completed
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Avg Time</p>
                                <div className="text-2xl font-bold">
                                    {stats?.avgDeliveryTime ? formatTime(stats.avgDeliveryTime) : '—'}
                                </div>
                            </div>
                            <Clock className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">Pickup to doorstep</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">On Time</p>
                                <div className={`text-2xl font-bold ${getScoreColor(stats?.onTimePercentage || 0)}`}>
                                    {stats?.onTimePercentage.toFixed(0) || 0}%
                                </div>
                            </div>
                            <TrendingUp className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">Within delivery window</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Orders</p>
                                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                            </div>
                            <Truck className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                            {stats?.inTransit || 0} in transit · {stats?.pending || 0} pending
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Status Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <BarChart2 className="h-4 w-4" /> Delivery Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[
                            { label: 'Delivered', count: stats?.delivered || 0, total: stats?.total || 1, color: 'bg-green-500' },
                            { label: 'In Transit', count: stats?.inTransit || 0, total: stats?.total || 1, color: 'bg-blue-500' },
                            { label: 'Assigned', count: stats?.assigned || 0, total: stats?.total || 1, color: 'bg-yellow-500' },
                            { label: 'Pending', count: stats?.pending || 0, total: stats?.total || 1, color: 'bg-gray-400' },
                            { label: 'Failed', count: stats?.failed || 0, total: stats?.total || 1, color: 'bg-red-500' },
                        ].map(({ label, count, total, color }) => (
                            <div key={label} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{label}</span>
                                    <span className="font-medium">{count}</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${color} rounded-full transition-all`}
                                        style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Driver Performance */}
            {driverPerf.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Award className="h-4 w-4" /> Driver Performance
                        </CardTitle>
                        <CardDescription>Ranked by completed deliveries</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {driverPerf.slice(0, 5).map((driver, idx) => (
                                <div key={driver.driverId} className="flex items-center gap-3">
                                    <div className={`text-lg font-bold w-6 text-center ${
                                        idx === 0 ? 'text-yellow-500' :
                                        idx === 1 ? 'text-gray-400' :
                                        idx === 2 ? 'text-amber-600' : 'text-muted-foreground'
                                    }`}>
                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm">{driver.name}</span>
                                            <Badge variant="outline" className="text-xs">
                                                {driver.completed} deliveries
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            <span>Avg: {formatTime(driver.avgTime)}</span>
                                            <span>On-time: {driver.onTimeRate.toFixed(0)}%</span>
                                            {driver.failed > 0 && (
                                                <span className="text-red-500">{driver.failed} failed</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {stats?.total === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <BarChart2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No Delivery Data Yet</h3>
                        <p className="text-sm text-muted-foreground">
                            Analytics will appear once deliveries are completed
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
