'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, DollarSign, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types (Stubbed for UI until we fetch real data or pass props)
interface PopsMetricProps {
    totalSales: number;
    salesChange: number; // percentage
    newCustomers: number;
    activeAnomalies: number;
}

export function PopsMetricsWidget({
    totalSales = 4250.00,
    salesChange = 12.5,
    newCustomers = 12,
    activeAnomalies = 1
}: Partial<PopsMetricProps>) {

    return (
        <Card className="h-full border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-500" />
                        Pops' Daily Pulse
                    </CardTitle>
                    <Badge variant={activeAnomalies > 0 ? "destructive" : "outline"}>
                        {activeAnomalies > 0 ? `${activeAnomalies} Anomalies` : "Healthy"}
                    </Badge>
                </div>
                <CardDescription>Real-time business vitality metrics</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    {/* Sales Metric */}
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> Revenue
                        </p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold">${totalSales.toLocaleString()}</h3>
                            <span className={cn(
                                "text-xs font-medium flex items-center",
                                salesChange >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                                {salesChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                {Math.abs(salesChange)}%
                            </span>
                        </div>
                    </div>

                    {/* Customers Metric */}
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> New Customers
                        </p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold">+{newCustomers}</h3>
                            <span className="text-xs text-muted-foreground">Today</span>
                        </div>
                    </div>
                </div>

                {/* Insight Stub */}
                {activeAnomalies > 0 && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-100 dark:border-red-900/30">
                        <div className="flex items-start gap-2">
                            <TrendingUp className="h-4 w-4 text-red-600 mt-1" />
                            <div>
                                <p className="text-sm font-medium text-red-800 dark:text-red-300">Sales Spike Detected</p>
                                <p className="text-xs text-red-600 dark:text-red-400">Revenue is 50% above 7-day average.</p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
