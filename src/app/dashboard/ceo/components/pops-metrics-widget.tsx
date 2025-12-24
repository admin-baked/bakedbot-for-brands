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
        <Card className="h-full border-l-4 border-l-blue-500 shadow-lg shadow-blue-500/5 hover:shadow-blue-500/10 transition-all">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        Pops' Daily Pulse
                    </CardTitle>
                    <Badge variant={activeAnomalies > 0 ? "destructive" : "outline"} className="px-3 py-1">
                        {activeAnomalies > 0 ? `${activeAnomalies} Anomalies` : "All Clear"}
                    </Badge>
                </div>
                <CardDescription>Real-time business vitality metrics</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-6">
                    {/* Sales Metric */}
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                            <DollarSign className="h-4 w-4" /> Revenue
                        </p>
                        <div className="flex flex-col gap-1">
                            <h3 className="text-3xl font-black tracking-tight text-foreground">
                                ${totalSales.toLocaleString()}
                            </h3>
                            <span className={cn(
                                "text-sm font-bold flex items-center px-2 py-0.5 rounded-full w-fit",
                                salesChange >= 0
                                    ? "text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400"
                                    : "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                            )}>
                                {salesChange >= 0 ? <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> : <TrendingDown className="h-3.5 w-3.5 mr-1.5" />}
                                {Math.abs(salesChange)}%
                            </span>
                        </div>
                    </div>

                    {/* Customers Metric */}
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                            <Users className="h-4 w-4" /> New Customers
                        </p>
                        <div className="flex flex-col gap-1">
                            <h3 className="text-3xl font-black tracking-tight text-foreground">
                                +{newCustomers}
                            </h3>
                            <span className="text-sm font-medium text-muted-foreground">Today</span>
                        </div>
                    </div>
                </div>

                {/* Insight Stub */}
                {activeAnomalies > 0 && (
                    <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-red-100 dark:bg-red-900/50 rounded-full shrink-0 mt-0.5">
                                <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-red-800 dark:text-red-300">Sales Spike Detected</p>
                                <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">
                                    Revenue is 50% above 7-day average. Pops recommends capitalizing on this traffic.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
