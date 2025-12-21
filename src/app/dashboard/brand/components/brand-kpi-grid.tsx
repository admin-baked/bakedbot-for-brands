'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Store,
    TrendingUp,
    DollarSign,
    ShieldCheck,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    Info,
    Clock,
    Target
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function BrandKPIs({ data }: { data?: any }) {
    // STUB: Real data would come from context or query
    const stats = {
        coverage: {
            value: data?.coverage?.value ?? 0,
            trend: data?.coverage?.trend || '-',
            label: data?.coverage?.label || 'Stores Carrying',
            lastUpdated: data?.coverage?.lastUpdated || 'Live',
            definition: 'Total unique dispensaries with at least one active SKU in stock.'
        },
        velocity: {
            value: data?.velocity?.value ?? 0,
            unit: data?.velocity?.unit || 'units/wk',
            trend: data?.velocity?.trend || '-',
            label: data?.velocity?.label || 'Avg per Store',
            lastUpdated: data?.velocity?.lastUpdated || 'Live',
            definition: 'Average weekly units sold per store across all active accounts.'
        },
        priceIndex: {
            value: data?.priceIndex?.value || '-',
            status: data?.priceIndex?.status || 'good',
            label: data?.priceIndex?.label || 'vs. Market Avg',
            lastUpdated: data?.priceIndex?.lastUpdated || 'Live',
            definition: 'Your average price compared to direct competitors in the same market.'
        },
        shelfShare: {
            value: data?.competitiveIntel?.shelfShareTrend?.delta ? `${data.competitiveIntel.shelfShareTrend.delta}%` : '-',
            gap: '0',
            label: 'vs Top Competitor',
            lastUpdated: 'Live',
            definition: 'The percentage of target retail doors where your brand is present versus your top competitor.'
        },
        compliance: {
            approved: data?.compliance?.approved ?? 0,
            blocked: data?.compliance?.blocked ?? 0,
            label: data?.compliance?.label || 'Active Campaigns',
            lastUpdated: data?.compliance?.lastUpdated || 'Real-time',
            definition: 'Number of creative assets approved vs blocked by state compliance filters.'
        }
    };

    return (
        <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Retail Coverage */}
                <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">Retail Coverage</CardTitle>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="w-48 text-xs">{stats.coverage.definition}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <Store className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold">{stats.coverage.value}</div>
                            <div className="flex flex-col items-end">
                                <span className="text-green-500 text-xs font-medium flex items-center">
                                    <ArrowUpRight className="h-3 w-3" /> {stats.coverage.trend}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                {stats.coverage.label}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-2 w-2" />
                                {stats.coverage.lastUpdated}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Velocity (Sell-Through) */}
                <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">Velocity</CardTitle>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="w-48 text-xs">{stats.velocity.definition}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold">{stats.velocity.value}</span>
                                <span className="text-sm text-muted-foreground">{stats.velocity.unit}</span>
                            </div>
                            <span className="text-green-500 text-xs font-medium flex items-center">
                                <ArrowUpRight className="h-3 w-3" /> {stats.velocity.trend}
                            </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                {stats.velocity.label}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-2 w-2" />
                                {stats.velocity.lastUpdated}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Price Index */}
                <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">Price Index</CardTitle>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="w-48 text-xs">{stats.priceIndex.definition}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold">{stats.priceIndex.value}</div>
                            <Badge
                                variant="outline"
                                className={`text-[10px] ${stats.priceIndex.status === 'good'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-amber-200 bg-amber-50 text-amber-700'
                                    }`}
                            >
                                {stats.priceIndex.status === 'good' ? 'Healthy' : 'Price Gap'}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                {stats.priceIndex.label}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-2 w-2" />
                                {stats.priceIndex.lastUpdated}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Share of Shelf */}
                <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">Share of Shelf</CardTitle>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="w-48 text-xs">{stats.shelfShare.definition}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold">{stats.shelfShare.value}</div>
                            <span className="text-red-500 text-xs font-medium flex items-center">
                                <ArrowDownRight className="h-3 w-3" /> {stats.shelfShare.gap}
                            </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                {stats.shelfShare.label}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-2 w-2" />
                                {stats.shelfShare.lastUpdated}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 5. Compliance Status */}
                <Card className={`group hover:border-primary/50 transition-colors cursor-pointer ${stats.compliance.blocked > 0 ? "border-l-4 border-l-amber-500" : ""}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="w-48 text-xs">{stats.compliance.definition}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold">{stats.compliance.approved}</span>
                                {stats.compliance.blocked > 0 && (
                                    <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700 flex items-center gap-1">
                                        <AlertTriangle className="h-2 w-2" />
                                        {stats.compliance.blocked} Blocked
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-2 w-2" />
                                {stats.compliance.lastUpdated}
                            </div>
                        </div>
                        <div className="mt-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                {stats.compliance.label}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}
