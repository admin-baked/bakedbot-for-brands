'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Users,
    ArrowUpRight,
    ArrowDownRight,
    Target,
    Tag,
    LayoutGrid,
    ExternalLink,
    Plus
} from 'lucide-react';
import Link from 'next/link';

export function CompetitiveIntelSnapshot({ intel: data }: { intel?: any }) {
    // Real data passed from server action
    const intel = {
        competitorsTracked: data?.competitorsTracked ?? 0,
        pricePosition: {
            delta: data?.pricePosition?.delta || '-',
            status: data?.pricePosition?.status || 'above',
            label: 'vs Market Avg'
        },
        undercutters: data?.undercutters ?? 0,
        promoActivity: {
            competitorCount: data?.promoActivity?.competitorCount ?? 0,
            ownCount: data?.promoActivity?.ownCount ?? 0,
            gap: (data?.promoActivity?.competitorCount ?? 0) - (data?.promoActivity?.ownCount ?? 0)
        },
        shelfShareTrend: {
            added: data?.shelfShareTrend?.added ?? 0,
            dropped: data?.shelfShareTrend?.dropped ?? 0,
            delta: data?.shelfShareTrend?.delta || '-'
        }
    };

    return (
        <Card className="flex flex-col h-full border-blue-100 bg-blue-50/10">
            <CardHeader className="pb-2 border-b border-blue-50 bg-blue-50/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-600" />
                        <CardTitle className="text-sm font-bold text-blue-900 tracking-tight uppercase">
                            Competitive Intel (Ezal)
                        </CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
                        Live Feed
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-4 flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {/* Competitors Tracked */}
                    <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            Competitors
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">{intel.competitorsTracked}</span>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full" asChild>
                                <Link href="/dashboard/settings?tab=brand">
                                    <Plus className="h-3 w-3" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Price Position */}
                    <div className="space-y-1 text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            Price Index
                        </p>
                        <div className="flex items-center justify-end gap-1">
                            <span className="text-xl font-bold text-amber-600">{intel.pricePosition.delta}</span>
                            <ArrowUpRight className="h-4 w-4 text-amber-600" />
                        </div>
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    {/* Undercutters */}
                    <div className="flex items-center justify-between p-2 rounded-md bg-white border border-blue-50 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="bg-amber-100 p-1.5 rounded text-amber-700">
                                <Tag className="h-3 w-3" />
                            </div>
                            <span className="text-xs font-medium">Undercutters this week</span>
                        </div>
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200" variant="outline">
                            {intel.undercutters} Retailers
                        </Badge>
                    </div>

                    {/* Promo Gap */}
                    <div className="flex items-center justify-between p-2 rounded-md bg-white border border-blue-50 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="bg-purple-100 p-1.5 rounded text-purple-700">
                                <Users className="h-3 w-3" />
                            </div>
                            <span className="text-xs font-medium">Promo Gap detected</span>
                        </div>
                        <div className="text-xs font-bold text-purple-700">
                            {intel.promoActivity.competitorCount} vs {intel.promoActivity.ownCount}
                        </div>
                    </div>

                    {/* Shelf Share */}
                    <div className="flex items-center justify-between p-2 rounded-md bg-white border border-blue-50 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="bg-emerald-100 p-1.5 rounded text-emerald-700">
                                <LayoutGrid className="h-3 w-3" />
                            </div>
                            <span className="text-xs font-medium">Shelf Share Trend</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-emerald-700">{intel.shelfShareTrend.delta}</span>
                            <span className="text-[10px] text-muted-foreground">stores</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1 border-blue-200 hover:bg-blue-50" asChild>
                        <Link href="/dashboard/intelligence">
                            View Intel <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                    </Button>
                    <Button size="sm" className="w-full text-xs bg-blue-600 hover:bg-blue-700">
                        Reports
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
