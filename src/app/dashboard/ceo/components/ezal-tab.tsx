'use client';

import { TabsContent } from "@/components/ui/tabs";
import { EzalCompetitorList } from "./ezal-competitor-list";
import { EzalInsightsFeed } from "./ezal-insights-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Database, Globe } from 'lucide-react';

import { useMockData } from '@/hooks/use-mock-data';
import { useState, useEffect } from 'react';

export default function EzalTab() {
    const defaultTenantId = 'admin-baked'; // Default for Super Admin view
    const { isMock, isLoading: isMockLoading } = useMockData();
    const [stats, setStats] = useState({
        scrapers: 12,
        scrapersTrend: 2,
        products: 1429,
        productsCompetitors: 5,
        insights: 24,
        insightsDrops: 8
    });

    useEffect(() => {
        const fetchStats = async () => {
            if (isMock) {
                setStats({
                    scrapers: 12,
                    scrapersTrend: 2,
                    products: 1429,
                    productsCompetitors: 5,
                    insights: 24,
                    insightsDrops: 8
                });
                return;
            }

            try {
                // Fetch competitors
                const compRes = await fetch(`/api/ezal/competitors?tenantId=${defaultTenantId}`);
                const compJson = await compRes.json();
                const competitors = compJson.success ? compJson.data : [];

                // Fetch insights summary
                const insRes = await fetch(`/api/ezal/insights?tenantId=${defaultTenantId}&limit=1`);
                const insJson = await insRes.json();
                const insightsSummary = insJson.summary || { total: 0 };

                setStats({
                    scrapers: competitors.filter((c: any) => c.active).length,
                    scrapersTrend: 0, // No historical data yet
                    products: 0, // Need product count from somewhere, defaulting 0 or fetching
                    productsCompetitors: competitors.length,
                    insights: insightsSummary.total,
                    insightsDrops: 0 // Need detailed breakdown
                });

            } catch (error) {
                console.error("Failed to fetch Ezal stats", error);
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
                        <CardTitle className="text-sm font-medium">Active Scrapers</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.scrapers}</div>
                        <p className="text-xs text-muted-foreground">
                            {isMock ? '+2 from last month' : `${stats.productsCompetitors} total competitors`}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Products Tracked</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.products.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Across {stats.productsCompetitors} competitors</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Insights (24h)</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.insights}</div>
                        <p className="text-xs text-muted-foreground">
                            {isMock ? '8 price drops detected' : 'Latest updates'}
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
