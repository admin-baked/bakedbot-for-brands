'use client';

import { TabsContent } from "@/components/ui/tabs";
import { EzalCompetitorList } from "./ezal-competitor-list";
import { EzalInsightsFeed } from "./ezal-insights-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Database, Globe } from 'lucide-react';

export default function EzalTab() {
    const defaultTenantId = 'admin-baked'; // Default for Super Admin view

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Scrapers</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12</div>
                        <p className="text-xs text-muted-foreground">+2 from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Products Tracked</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,429</div>
                        <p className="text-xs text-muted-foreground">Across 5 competitors</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Insights (24h)</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">24</div>
                        <p className="text-xs text-muted-foreground">8 price drops detected</p>
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
