'use client';

/**
 * Smart Upsells Dashboard
 *
 * Analytics and configuration for AI-powered product pairing recommendations.
 * Shows performance metrics, top pairings, and allows configuration of pairing strategies.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserRole } from '@/hooks/use-user-role';
import { TrendingUp, Zap, Package, Settings, BarChart3, Target } from 'lucide-react';
import { UpsellAnalytics } from './components/upsell-analytics';
import { TopPairings } from './components/top-pairings';
import { UpsellConfiguration } from './components/upsell-configuration';
import { BundleBuilder } from './components/bundle-builder';

export function UpsellsPageClient() {
    const { orgId, isLoading: authLoading } = useUserRole();
    const [activeTab, setActiveTab] = useState('analytics');

    if (authLoading || !orgId) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Zap className="h-8 w-8 text-primary" />
                    Smart Upsells
                </h1>
                <p className="text-muted-foreground mt-1">
                    AI-powered product pairing recommendations using cannabis science and business intelligence
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Upsell Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">18.3%</div>
                        <p className="text-xs text-muted-foreground">
                            +2.4% from last week
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Upsell Value</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">$24.50</div>
                        <p className="text-xs text-muted-foreground">
                            +$3.20 from last week
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Margin Boost</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+12.7%</div>
                        <p className="text-xs text-muted-foreground">
                            280E-optimized suggestions
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Pairings</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">142</div>
                        <p className="text-xs text-muted-foreground">
                            Across all strategies
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="pairings">Top Pairings</TabsTrigger>
                    <TabsTrigger value="bundles">Bundle Builder</TabsTrigger>
                    <TabsTrigger value="settings">Configuration</TabsTrigger>
                </TabsList>

                <TabsContent value="analytics" className="space-y-4">
                    <UpsellAnalytics orgId={orgId} />
                </TabsContent>

                <TabsContent value="pairings" className="space-y-4">
                    <TopPairings orgId={orgId} />
                </TabsContent>

                <TabsContent value="bundles" className="space-y-4">
                    <BundleBuilder orgId={orgId} />
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    <UpsellConfiguration orgId={orgId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
