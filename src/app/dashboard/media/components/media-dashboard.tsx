'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    getMediaBudgetStatus,
    getMediaBudget,
    getMediaCostAlerts,
} from '@/server/actions/media-budget';
import { getMediaCostsDashboard } from '@/server/actions/media-costs';
import {
    DollarSign,
    Image as ImageIcon,
    Video,
    TrendingUp,
    AlertCircle,
    Settings,
    Bell,
} from 'lucide-react';

// Inline currency formatter to avoid import issues
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value);
};

interface MediaDashboardProps {
    tenantId: string;
}

export function MediaDashboard({ tenantId }: MediaDashboardProps) {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
    const [data, setData] = useState<any>(null);
    const [budgetStatus, setBudgetStatus] = useState<any>(null);
    const [budget, setBudget] = useState<any>(null);
    const [alerts, setAlerts] = useState<any[]>([]);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [dashboardData, budgetData, budgetConfig, alertsList] = await Promise.all([
                    getMediaCostsDashboard(period),
                    getMediaBudgetStatus(tenantId),
                    getMediaBudget(tenantId),
                    getMediaCostAlerts(tenantId),
                ]);

                setData(dashboardData);
                setBudgetStatus(budgetData);
                setBudget(budgetConfig);
                setAlerts(alertsList);
            } catch (error) {
                console.error('Failed to load media dashboard:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [period, tenantId]);

    if (loading) {
        return <div>Loading...</div>;
    }

    const stats = [
        {
            title: 'Total Spend',
            value: formatCurrency(data?.totalCostUsd || 0),
            description: `Last ${period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}`,
            icon: DollarSign,
            trend: data?.trend || 0,
        },
        {
            title: 'Images Generated',
            value: data?.imageCount || 0,
            description: formatCurrency(data?.imageCostUsd || 0),
            icon: ImageIcon,
        },
        {
            title: 'Videos Generated',
            value: data?.videoCount || 0,
            description: formatCurrency(data?.videoCostUsd || 0),
            icon: Video,
        },
        {
            title: 'Success Rate',
            value: `${data?.successRate || 0}%`,
            description: `${data?.successfulGenerations || 0} / ${data?.totalGenerations || 0}`,
            icon: TrendingUp,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Period Selector */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <Button
                        variant={period === '7d' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPeriod('7d')}
                    >
                        7 Days
                    </Button>
                    <Button
                        variant={period === '30d' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPeriod('30d')}
                    >
                        30 Days
                    </Button>
                    <Button
                        variant={period === '90d' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPeriod('90d')}
                    >
                        90 Days
                    </Button>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Budget
                    </Button>
                    <Button variant="outline" size="sm">
                        <Bell className="h-4 w-4 mr-2" />
                        Alerts ({alerts.filter(a => a.enabled).length})
                    </Button>
                </div>
            </div>

            {/* Budget Status Alert */}
            {budget && budget.enabled && (
                <BudgetAlert budgetStatus={budgetStatus} budget={budget} />
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                            {stat.trend !== undefined && stat.trend !== 0 && (
                                <Badge variant={stat.trend > 0 ? 'destructive' : 'default'} className="mt-2">
                                    {stat.trend > 0 ? '+' : ''}{stat.trend}% vs last period
                                </Badge>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Provider Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Usage by Provider</CardTitle>
                    <CardDescription>
                        Cost breakdown across image and video generation providers
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data?.byProvider && Object.entries(data.byProvider).map(([provider, stats]: [string, any]) => (
                            stats.count > 0 && (
                                <div key={provider} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium capitalize">
                                            {provider.replace('-', ' ')}
                                        </span>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="text-muted-foreground">{stats.count} generations</span>
                                            <span className="font-medium">{formatCurrency(stats.costUsd)}</span>
                                        </div>
                                    </div>
                                    <Progress
                                        value={(stats.costUsd / data.totalCostUsd) * 100}
                                        className="h-2"
                                    />
                                </div>
                            )
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Daily Trend Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Daily Spending Trend</CardTitle>
                    <CardDescription>
                        Track your media generation costs over time
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Simple bar chart - could be replaced with a proper chart library */}
                    <div className="space-y-2">
                        {data?.dailyTrend && data.dailyTrend.slice(-14).map((day: any) => (
                            <div key={day.date} className="flex items-center gap-4">
                                <span className="text-xs text-muted-foreground w-20">
                                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <div className="flex-1">
                                    <Progress
                                        value={Math.min((day.costUsd / Math.max(...data.dailyTrend.map((d: any) => d.costUsd))) * 100, 100)}
                                        className="h-6"
                                    />
                                </div>
                                <span className="text-sm font-medium w-20 text-right">
                                    {formatCurrency(day.costUsd)}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Generations</CardTitle>
                    <CardDescription>
                        Your latest AI-generated media
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data?.recentEvents && data.recentEvents.slice(0, 10).map((event: any) => (
                            <div key={event.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                <div className="flex items-center gap-3">
                                    {event.type === 'image' ? (
                                        <ImageIcon className="h-4 w-4 text-blue-500" />
                                    ) : (
                                        <Video className="h-4 w-4 text-purple-500" />
                                    )}
                                    <div>
                                        <p className="text-sm font-medium capitalize">{event.type} · {event.provider}</p>
                                        <p className="text-xs text-muted-foreground line-clamp-1">{event.prompt}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">{formatCurrency(event.costUsd)}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(event.createdAt).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function BudgetAlert({ budgetStatus, budget }: any) {
    const dailyPercent = budgetStatus.daily.limit
        ? (budgetStatus.daily.spent / budgetStatus.daily.limit) * 100
        : 0;
    const weeklyPercent = budgetStatus.weekly.limit
        ? (budgetStatus.weekly.spent / budgetStatus.weekly.limit) * 100
        : 0;
    const monthlyPercent = budgetStatus.monthly.limit
        ? (budgetStatus.monthly.spent / budgetStatus.monthly.limit) * 100
        : 0;

    const maxPercent = Math.max(dailyPercent, weeklyPercent, monthlyPercent);
    const isWarning = maxPercent >= budget.softLimitPercentage;
    const isExceeded = maxPercent >= 100;

    if (!isWarning) return null;

    return (
        <Card className={isExceeded ? 'border-destructive bg-destructive/10' : 'border-yellow-500 bg-yellow-50'}>
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className={`h-5 w-5 mt-0.5 ${isExceeded ? 'text-destructive' : 'text-yellow-600'}`} />
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold mb-1">
                            {isExceeded ? 'Budget Limit Exceeded' : 'Approaching Budget Limit'}
                        </h4>
                        <div className="space-y-2">
                            {budgetStatus.daily.limit && dailyPercent >= budget.softLimitPercentage && (
                                <p className="text-sm">
                                    Daily: {formatCurrency(budgetStatus.daily.spent)} / {formatCurrency(budgetStatus.daily.limit)}
                                    {' '}({dailyPercent.toFixed(0)}%)
                                </p>
                            )}
                            {budgetStatus.weekly.limit && weeklyPercent >= budget.softLimitPercentage && (
                                <p className="text-sm">
                                    Weekly: {formatCurrency(budgetStatus.weekly.spent)} / {formatCurrency(budgetStatus.weekly.limit)}
                                    {' '}({weeklyPercent.toFixed(0)}%)
                                </p>
                            )}
                            {budgetStatus.monthly.limit && monthlyPercent >= budget.softLimitPercentage && (
                                <p className="text-sm">
                                    Monthly: {formatCurrency(budgetStatus.monthly.spent)} / {formatCurrency(budgetStatus.monthly.limit)}
                                    {' '}({monthlyPercent.toFixed(0)}%)
                                </p>
                            )}
                        </div>
                        {budget.hardLimit && isExceeded && (
                            <p className="text-sm font-medium mt-2">
                                Media generation is currently disabled due to budget limit.
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
