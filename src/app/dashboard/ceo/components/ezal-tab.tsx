'use client';

import { EzalCompetitorList } from "./ezal-competitor-list";
import { EzalInsightsFeed } from "./ezal-insights-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Database, Globe } from 'lucide-react';
import { useMockData } from '@/hooks/use-mock-data';
import { useState, useEffect } from 'react';
import { getEzalCompetitors, getEzalInsights } from '../actions/intuition-actions';

export default function EzalTab() {
    const defaultTenantId = 'system'; // Platform-wide tenant scope for Super Users
    const { isMock, isLoading: isMockLoading } = useMockData();

    const [stats, setStats] = useState<{
        activeSources: number | null;
        competitorsTotal: number | null;
        productsTracked: number | null;
        insights: number | null;
        insightsDrops: number | null;
    }>({
        activeSources: null,
        competitorsTotal: null,
        productsTracked: null,
        insights: null,
        insightsDrops: null,
    });

    useEffect(() => {
        const fetchStats = async () => {
            if (isMock) {
                setStats({
                    activeSources: 12,
                    competitorsTotal: 5,
                    productsTracked: 1429,
                    insights: 24,
                    insightsDrops: 8
                });
                return;
            }

            try {
                // Fetch competitors via Server Action
                const competitors = await getEzalCompetitors(defaultTenantId);

                // Fetch insights via Server Action
                const insights = await getEzalInsights(defaultTenantId, 50);

                // Calculate simple stats
                const totalInsights = insights.length;
                const activeSources = competitors.filter((c: any) => c.active).length;

                setStats({
                    activeSources: activeSources,
                    competitorsTotal: competitors.length,
                    productsTracked: null, // Not yet instrumented in the platform data model
                    insights: totalInsights,
                    insightsDrops: insights.filter((i: any) => i.type === 'price_drop').length
                });

            } catch (error) {
                console.error("Failed to fetch Ezal stats", error);
                setStats({
                    activeSources: null,
                    competitorsTotal: null,
                    productsTracked: null,
                    insights: null,
                    insightsDrops: null,
                });
            }
        };

        if (!isMockLoading) {
            fetchStats();
        }
    }, [isMock, isMockLoading]);

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeSources ?? '—'}</div>
                        <p className="text-xs text-muted-foreground">
                            {isMock ? '+2 from last month' : `${stats.competitorsTotal ?? '—'} total competitors`}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Products Tracked</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{typeof stats.productsTracked === 'number' ? stats.productsTracked.toLocaleString() : '—'}</div>
                        <p className="text-xs text-muted-foreground">
                            {typeof stats.productsTracked === 'number' ? `Across ${stats.competitorsTotal ?? 0} competitors` : 'Not instrumented'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recent Insights</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.insights ?? '—'}</div>
                        <p className="text-xs text-muted-foreground">
                            {isMock ? '8 price drops detected' : 'Latest updates (not time-windowed yet)'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-7">
                <div className="col-span-4">
                    <EzalCompetitorList tenantId={defaultTenantId} />
                </div>
                <div className="col-span-3">
                    <EzalInsightsFeed tenantId={defaultTenantId} />
                </div>
            </div>
        </div>
    );
}
